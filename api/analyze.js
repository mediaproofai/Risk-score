export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { forensic, internet, metadata } = req.body;

  let riskScore = 0;
  let summaryParts = [];

  // --- 1. REAL AI DETECTION LOGIC ---
  if (forensic && forensic.details && forensic.details.aiArtifacts) {
    const aiData = forensic.details.aiArtifacts;
    
    // If AI confidence is high (e.g. 0.9), we add 90 points to risk.
    if (aiData.confidence > 0.1) {
        const impact = Math.round(aiData.confidence * 100);
        riskScore += impact;
        
        if (aiData.confidence > 0.5) {
            summaryParts.push(`CRITICAL: AI Generation signatures detected (${impact}% match).`);
        } else {
            summaryParts.push(`WARNING: Minor synthetic artifacts detected (${impact}%).`);
        }
    }
  }

  // --- 2. OSINT / INTERNET LOGIC ---
  if (internet && internet.footprintAnalysis) {
      if (internet.footprintAnalysis.sources?.stockParams) {
          riskScore += 50;
          summaryParts.push("Image matched in known Stock Photo databases.");
      }
  }

  // --- 3. FINALIZE SCORE ---
  // Cap at 100
  riskScore = Math.min(riskScore, 100);

  // If Score is High (Bad), text should be scary.
  // If Score is Low (Good), text should be calm.
  let executiveSummary = "Media appears authentic.";
  if (riskScore > 80) executiveSummary = "CRITICAL THREAT: High probability of AI generation.";
  else if (riskScore > 40) executiveSummary = "SUSPICIOUS: Verification recommended.";
  
  if (summaryParts.length > 0) {
      executiveSummary += " " + summaryParts.join(" ");
  }

  return res.status(200).json({
    service: 'risk-score-service',
    riskScore: riskScore, 
    riskLevel: riskScore > 70 ? 'CRITICAL' : 'SAFE',
    executiveSummary: executiveSummary,
    timestamp: new Date().toISOString()
  });
}
