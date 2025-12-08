export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { forensic, internet } = req.body;
    let riskScore = 0;
    let evidence = [];

    if (forensic?.details) {
        const ai = forensic.details.aiArtifacts;
        const noise = forensic.details.noiseAnalysis;

        // 1. PRIMARY: AI Probability (Combined)
        if (ai.confidence > 0.1) {
            let impact = ai.confidence * 100;
            riskScore = Math.max(riskScore, impact);

            if (ai.method === "PIXEL_ENTROPY_MATH") {
                evidence.push(`CRITICAL: Pixel variance (${noise.pixel_variance.toFixed(1)}) matches Diffusion Model signatures.`);
            } else if (ai.method === "MISSING_ORIGIN_DATA") {
                evidence.push("Suspicious: Image lacks camera data and contains no organic sensor noise.");
            } else {
                evidence.push(`AI Generation detected by Neural Ensemble (${Math.round(impact)}% match).`);
            }
        }

        // 2. SECONDARY: Mathematical Confirmation
        if (noise?.verdict === "ARTIFICIAL_SMOOTHNESS" && riskScore < 80) {
            riskScore = Math.max(riskScore, 85);
            evidence.push("Abnormal surface smoothness detected (Lacks camera sensor grain).");
        }
    }

    // 3. OSINT Check
    if (internet?.footprintAnalysis?.sources?.stockParams) {
        riskScore = 95;
        evidence.push("CRITICAL: Image found in Stock Photo Database.");
    }

    riskScore = Math.min(Math.round(riskScore), 100);
    
    let riskLevel = "VERIFIED";
    if (riskScore > 80) riskLevel = "CRITICAL";
    else if (riskScore > 50) riskLevel = "HIGH";
    else if (riskScore > 20) riskLevel = "SUSPICIOUS";

    return res.status(200).json({
        service: "risk-engine-v8-math",
        riskScore: riskScore,
        riskLevel: riskLevel,
        executiveSummary: evidence.length > 0 ? evidence[0] : "Media appears consistent with organic capture.",
        breakdown: evidence,
        timestamp: new Date().toISOString()
    });
}
