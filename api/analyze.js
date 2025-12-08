export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { forensic, internet } = req.body;
    let riskScore = 0;
    let evidence = [];

    // 1. FORENSIC EVIDENCE
    if (forensic?.details?.aiArtifacts) {
        const ai = forensic.details.aiArtifacts;
        
        // If AI Probability is high
        if (ai.confidence > 0.1) {
            let impact = ai.confidence * 100;
            
            // Boost the score if it's the Heuristic Fallback
            if (ai.modelUsed.includes("Heuristic")) {
                impact = Math.max(impact, 65); 
                evidence.push("Suspicious Origin: Image lacks camera metadata common in real photos.");
            } else {
                evidence.push(`Visual AI Artifacts detected (${Math.round(impact)}% confidence).`);
            }
            
            riskScore = Math.max(riskScore, impact);
        }
    } else {
        // If forensic failed completely
        riskScore = 50;
        evidence.push("Forensic Analysis unavailable (Potential obfuscation).");
    }

    // 2. INTERNET EVIDENCE
    if (internet?.footprintAnalysis?.sources?.stockParams) {
        riskScore = 95;
        evidence.push("CRITICAL: Image found in Stock Photo Database.");
    }

    // 3. FINAL VERDICT
    riskScore = Math.min(Math.round(riskScore), 100);
    
    let riskLevel = "VERIFIED";
    if (riskScore > 80) riskLevel = "CRITICAL";
    else if (riskScore > 50) riskLevel = "HIGH";
    else if (riskScore > 30) riskLevel = "SUSPICIOUS";

    return res.status(200).json({
        service: "risk-engine-zero-tolerance",
        riskScore: riskScore,
        riskLevel: riskLevel,
        executiveSummary: evidence.length > 0 ? evidence[0] : "Media appears consistent with organic capture.",
        breakdown: evidence,
        timestamp: new Date().toISOString()
    });
}
