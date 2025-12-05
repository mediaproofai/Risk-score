export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');

    const { forensic, audio, internet } = req.body;
    let probability = 0;
    let evidence = [];

    // 1. VISUAL EVIDENCE
    if (forensic?.verdict?.aiProbability > 0.5) {
        const score = forensic.verdict.aiProbability;
        probability = Math.max(probability, score); // Take the highest confidence
        evidence.push(`Visual AI Artifacts detected (${(score*100).toFixed(0)}% confidence)`);
    }
    
    if (forensic?.technical_analysis?.noise_verdict === "SUSPICIOUSLY_SMOOTH") {
        probability += 0.1; // Add weight
        evidence.push("Unnatural noise entropy detected");
    }

    // 2. AUDIO EVIDENCE
    if (audio?.voice_integrity?.cloning_probability > 0.8) {
        probability = Math.max(probability, 0.95); // Almost certainly fake
        evidence.push("Synthetic Voice Signature (High Frequency Cutoff)");
    }

    // 3. CONTEXTUAL EVIDENCE (OSINT)
    if (internet?.footprintAnalysis?.sources?.stockParams) {
        probability = Math.max(probability, 0.9); // It's a stock photo, misleading context
        evidence.push("Identical match found in Stock Database");
    } else if (internet?.footprintAnalysis?.totalMatches === 0 && probability > 0.4) {
        probability += 0.1; // Suspiciously unique for a "news" photo
        evidence.push("Zero Internet Footprint (Fresh Generation)");
    }

    // Cap at 1.0 (100%)
    probability = Math.min(probability, 1.0);
    const score = Math.round(probability * 100);

    return res.status(200).json({
        service: "risk-engine-v4",
        riskScore: score,
        riskLevel: score > 80 ? "CRITICAL" : score > 50 ? "SUSPICIOUS" : "VERIFIED",
        executiveSummary: evidence.length > 0 ? evidence.join(". ") : "No anomalies detected. Media appears authentic.",
        breakdown: evidence
    });
}
