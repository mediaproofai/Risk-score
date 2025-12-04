// api/analyze.js for risk-score-service

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // 1. Get the Intelligence from all services
  const { forensic, audio, video, internet, metadata } = req.body;

  let riskScore = 0; // 0 = Safe, 100 = Dangerous
  let flags = [];
  let trustFactors = [];

  // --- 2. FORENSIC EVALUATION (The "Detective" Review) ---
  if (forensic && forensic.details) {
    const f = forensic.details;

    // A. AI Generation Detection
    if (f.aiArtifacts?.confidence > 0.5) {
      // If AI confidence is high, Risk skyrockets
      const severity = f.aiArtifacts.confidence * 100;
      riskScore += severity; 
      flags.push(`CRITICAL: AI generation markers detected (${Math.round(severity)}% match).`);
    } else {
      trustFactors.push("No obvious AI generation artifacts.");
    }

    // B. Noise Pattern Analysis (PRNU)
    if (f.noiseAnalysis?.inconsistent) {
      riskScore += 30;
      flags.push("Suspicious noise patterns (indicates editing or synthesis).");
    }

    // C. Steganography / Hidden Data
    if (f.steganography?.detected) {
      riskScore += 20;
      flags.push("Hidden data payload found in file structure.");
    }

    // D. Compression Ghosts
    if (f.quantization?.resaved) {
      riskScore += 10;
      flags.push("File has been resaved/compressed multiple times.");
    }
  }

  // --- 3. METADATA EVALUATION ---
  if (metadata) {
    if (metadata.provenance?.isEdited) {
      riskScore += 15;
      flags.push(`Software signature detected: ${metadata.deviceFingerprint?.software || "Unknown Editor"}`);
    } else {
      trustFactors.push("Original camera metadata appears intact.");
    }
  }

  // --- 4. OSINT EVALUATION ---
  if (internet) {
    // If it's a Stock Photo, instant high risk (Deception)
    if (internet.footprintAnalysis?.sources?.stockParams) {
      riskScore = Math.max(riskScore, 85); // Override to at least 85
      flags.push("MATCH: Image found in Stock Photo database.");
    }
    // If it's totally unique (0 matches), it *might* be AI (Zero Footprint)
    else if (internet.footprintAnalysis?.totalMatches === 0 && riskScore > 30) {
      riskScore += 10; // Add suspicion if it's already risky AND unique
      flags.push("Zero internet footprint (common for fresh AI generations).");
    }
  }

  // --- 5. FINALIZE VERDICT ---
  
  // Cap score at 100
  riskScore = Math.min(Math.round(riskScore), 100);

  // Determine Executive Summary
  let summary = "Media appears authentic. No forensic anomalies detected.";
  if (riskScore > 80) summary = "CRITICAL THREAT: High-confidence manipulation or synthetic generation detected.";
  else if (riskScore > 50) summary = "SUSPICIOUS: Multiple forensic anomalies indicating potential editing.";
  else if (riskScore > 20) summary = "CAUTION: Minor inconsistencies found in file structure.";

  // Return the Judge's Ruling
  return res.status(200).json({
    service: 'risk-score-service',
    riskScore: riskScore, // High Score = High Risk (Bad)
    riskLevel: riskScore > 75 ? 'CRITICAL' : riskScore > 40 ? 'HIGH' : 'LOW',
    executiveSummary: summary,
    breakdown: {
      flags: flags,
      trustFactors: trustFactors
    },
    timestamp: new Date().toISOString()
  });
}
