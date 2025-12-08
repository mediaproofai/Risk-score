export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { forensic, audio, video, internet, metadata } = req.body;

    let riskScore = 0;
    let evidence = [];
    let positiveFactors = 0;

    // --- 1. FORENSIC ANALYSIS (Visual) ---
    if (forensic?.details) {
        const ai = forensic.details.aiArtifacts || {};
        
        // A. Direct AI Detection
        if (ai.confidence > 0.1) {
            // Scale confidence: 50% confidence = 80% Risk
            let severity = ai.confidence * 100;
            if (ai.confidence > 0.5) severity += 30; 
            riskScore = Math.max(riskScore, severity);
            
            if (ai.confidence > 0.5) evidence.push(`CRITICAL: Visual AI artifacts detected (${(ai.confidence*100).toFixed(0)}% match).`);
            else evidence.push(`WARNING: Subtle synthetic textures found.`);
        }

        // B. Noise Entropy (The "Smoothness" Check)
        // AI images are often "too smooth". If entropy is low and no camera data exists -> FAKE.
        if (forensic.details.noiseAnalysis?.inconsistent) {
            riskScore += 30;
            evidence.push("Unnatural pixel noise entropy (Surface is mathematically too smooth).");
        }
    }

    // --- 2. METADATA "NEGATIVE PROOF" ---
    // If a file has NO camera data and NO software signature, it is highly suspicious.
    if (metadata) {
        const hasCamera = metadata.deviceFingerprint?.make !== "Unknown";
        const hasSoftware = metadata.deviceFingerprint?.software !== "Unknown";
        
        if (hasCamera) {
            positiveFactors += 1; // Trust factor
        } else if (riskScore === 0) {
            // No camera data found? Suspicious.
            riskScore += 35;
            evidence.push("Missing origin data (No Camera/Device Metadata found).");
        }

        if (hasSoftware) {
            riskScore += 10;
            evidence.push(`Modified by software: ${metadata.deviceFingerprint.software}`);
        }
    }

    // --- 3. VIDEO & AUDIO ---
    if (video?.verdict?.is_deepfake) {
        riskScore = Math.max(riskScore, 95);
        evidence.push("CRITICAL: Deepfake face swap detected in video frames.");
    }

    if (audio?.voice_integrity?.cloning_probability > 0.5) {
        riskScore = Math.max(riskScore, 90);
        evidence.push("CRITICAL: AI Voice Cloning signature detected.");
    }

    // --- 4. THE PARANOID FALLBACK ---
    // If we found NOTHING (Score 0) but also have NO positive proof (No Camera Data, No History)
    // We default to "Unverified/Risky" instead of "Safe".
    if (riskScore === 0 && positiveFactors === 0 && internet?.footprintAnalysis?.totalMatches === 0) {
        riskScore = 45;
        evidence.push("Unverified Source: No digital footprint or camera metadata found.");
    }

    // Cap Score
    riskScore = Math.min(Math.round(riskScore), 100);

    // Summary Generation
    let riskLevel = "VERIFIED";
    if (riskScore > 80) riskLevel = "CRITICAL";
    else if (riskScore > 40) riskLevel = "SUSPICIOUS";
    else if (riskScore > 20) riskLevel = "UNCERTAIN";

    return res.status(200).json({
        service: "risk-engine-v7-paranoid",
        riskScore: riskScore,
        riskLevel: riskLevel,
        executiveSummary: evidence.length > 0 ? evidence[0] : "Media appears consistent with organic capture.",
        breakdown: evidence,
        timestamp: new Date().toISOString()
    });
}
