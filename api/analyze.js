import fetch from 'node-fetch';

// --- ENTERPRISE SCORING CONFIGURATION ---
const WEIGHTS = {
  METADATA_TAMPERING: 0.15,
  AI_GENERATION_SIGNS: 0.35, // High weight for Deepfakes
  OSINT_DECEPTION: 0.30,     // High weight for stolen/stock photos
  TECHNICAL_ANOMALY: 0.20    // Glitches, splicing, etc.
};

const THRESHOLDS = {
  CRITICAL: 85,
  HIGH: 65,
  MODERATE: 40,
  LOW: 15
};

export default async function handler(req, res) {
  try {
    // 1. Validation
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    // Inputs from other microservices
    const { forensic, audio, video, internet, metadata } = req.body;

    console.log("[RiskEngine] Computing Global Trust Score...");

    // 2. Normalize Inputs (Standardize distinct service outputs into 0-1 floats)
    const inputs = normalizeInputs(forensic, audio, video, internet, metadata);

    // 3. Compute Threat Vectors
    const integrityRisk = calculateIntegrityRisk(inputs);
    const aiRisk = calculateAiRisk(inputs);
    const osintRisk = calculateOsintRisk(inputs);

    // 4. Bayesian Aggregation (The "Google-Level" Math)
    // We don't just add them up. If ONE critical indicator (like Stock Photo) is 100%, 
    // the whole file is fake, regardless of how "clean" the audio is.
    
    let finalScore = 0;
    const criticalFlags = [];

    // Rule 1: The "Kill Switch" (If known stock photo or known deepfake signature)
    if (inputs.isStockPhoto) {
      finalScore = 95;
      criticalFlags.push("CONFIRMED_STOCK_PHOTO");
    } else if (inputs.deepfakeConfidence > 0.9) {
      finalScore = 90;
      criticalFlags.push("CONFIRMED_AI_GENERATION");
    } else {
      // Rule 2: Weighted Average for ambiguous cases
      finalScore = (
        (integrityRisk * WEIGHTS.METADATA_TAMPERING) +
        (aiRisk * WEIGHTS.AI_GENERATION_SIGNS) +
        (osintRisk * WEIGHTS.OSINT_DECEPTION) +
        ((inputs.techAnomalies / 100) * WEIGHTS.TECHNICAL_ANOMALY)
      ) * 100;
    }

    // Cap Score
    finalScore = Math.min(Math.round(finalScore), 100);

    // 5. Generate Explanation (XAI - Explainable AI)
    const explanation = generateExplanation(finalScore, integrityRisk, aiRisk, osintRisk, criticalFlags);

    // 6. Build Final Report
    const report = {
      service: "risk-engine-core",
      timestamp: new Date().toISOString(),
      
      globalScore: finalScore,
      trustLevel: getTrustLevel(finalScore),
      
      confidenceInterval: calculateConfidence(inputs), // How sure are we?

      // The "Why" - Crucial for FBI/Enterprise users
      executiveSummary: explanation,
      
      breakdown: {
        integrityRisk: Math.round(integrityRisk * 100),
        aiProbability: Math.round(aiRisk * 100),
        deceptionRisk: Math.round(osintRisk * 100),
      },

      vectors: {
        technical: inputs.techAnomalies > 0 ? "Anomalies Detected" : "Clean",
        provenance: inputs.hasHistory ? "Established" : "Unknown (Zero Footprint)"
      }
    };

    return res.status(200).json(report);

  } catch (error) {
    console.error('[RiskEngine Failure]', error);
    return res.status(500).json({ error: 'Scoring Failed', details: error.message });
  }
}

// --- LOGIC HELPERS ---

function normalizeInputs(forensic, audio, video, internet, metadata) {
  return {
    // Metadata / Forensic
    metadataEdited: metadata?.provenance?.isEdited || false,
    softwareTraces: metadata?.deviceFingerprint?.software !== "Unknown",
    
    // AI / Deepfake
    deepfakeConfidence: Math.max(
      audio?.riskAssessment?.score / 100 || 0, 
      video?.riskAssessment?.score / 100 || 0,
      forensic?.tamperAnalysis?.confidence || 0
    ),
    
    // OSINT
    isStockPhoto: internet?.riskAssessment?.flags?.some(f => f.includes("STOCK")) || false,
    hasHistory: internet?.timelineIntel?.firstSeen !== "Never seen before",
    
    // Technical
    techAnomalies: (video?.riskAssessment?.score || 0) // Reuse video structural risk
  };
}

function calculateIntegrityRisk(inputs) {
  let risk = 0;
  if (inputs.metadataEdited) risk += 0.6;
  if (inputs.softwareTraces) risk += 0.3;
  return Math.min(risk, 1.0);
}

function calculateAiRisk(inputs) {
  return inputs.deepfakeConfidence; // Direct mapping
}

function calculateOsintRisk(inputs) {
  if (inputs.isStockPhoto) return 1.0;
  // If it has NO history, it's slightly suspicious (0.2), but not criminal.
  // If it has history but context mismatches (handled in OSINT service), risk is higher.
  return inputs.hasHistory ? 0.0 : 0.2; 
}

function calculateConfidence(inputs) {
  // If we have strong signals (like a definite stock photo match), confidence is High.
  if (inputs.isStockPhoto || inputs.deepfakeConfidence > 0.9) return "HIGH";
  // If signals are weak/mixed
  if (inputs.deepfakeConfidence > 0.4 && inputs.deepfakeConfidence < 0.6) return "LOW";
  return "MEDIUM";
}

function getTrustLevel(score) {
  if (score >= THRESHOLDS.CRITICAL) return "CRITICAL_THREAT";
  if (score >= THRESHOLDS.HIGH) return "HIGH_RISK";
  if (score >= THRESHOLDS.MODERATE) return "CAUTION";
  return "VERIFIED_SAFE";
}

function generateExplanation(score, integrity, ai, osint, flags) {
  if (flags.length > 0) return `Content flagged immediately: ${flags.join(", ")}`;
  
  const reasons = [];
  if (ai > 0.7) reasons.push("Strong indicators of AI generation");
  if (integrity > 0.5) reasons.push("Metadata suggests significant editing/tampering");
  if (osint > 0.8) reasons.push("External scans indicate deception or persona mismatch");
  
  if (reasons.length === 0) return "Media appears authentic with no significant anomalies detected.";
  
  return `Risk calculated based on: ${reasons.join("; ")}.`;
}
