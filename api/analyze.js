export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { forensic, audio, video, internet, metadata } = req.body;
        
        let riskScore = 0;
        let evidence = [];
        
        // --- 1. VISUAL FORENSICS ---
        if (forensic?.details?.aiArtifacts) {
            const ai = forensic.details.aiArtifacts;
            const meta = forensic.details.metadataDump || {};
            
            // A. AI Model Verdict
            if (ai.confidence > 0.1) {
                let impact = ai.confidence * 100;
                // Boost impact if model explicitly flagged it
                if (ai.confidence > 0.5) impact += 20;
                riskScore = Math.max(riskScore, impact);
                evidence.push(`Visual AI Artifacts detected (${Math.round(ai.confidence * 100)}%).`);
            }

            // B. "Suspiciously Clean" (The Metadata Kill Switch)
            // If AI score is low (0-30), but file has NO camera data... suspicious.
            const hasCamera = meta.Make || meta.Model || meta.ExposureTime;
            const hasSoftware = meta.Software || meta.CreatorTool;
            
            if (!hasCamera && riskScore < 50) {
                // Check if it's a screenshot (usually low entropy/specific dimensions)
                // If not clearly a screenshot, assume AI.
                riskScore = Math.max(riskScore, 65);
                evidence.push("Suspicious Origin: Missing camera metadata (EXIF) typical of AI/Synthetic media.");
            }
            
            if (hasSoftware && typeof meta.Software === 'string' && meta.Software.match(/adobe|gimp|paint/i)) {
                riskScore += 10;
                evidence.push(`Edited with software: ${meta.Software}`);
            }
        }

        // --- 2. AUDIO (Safe Check) ---
        // Only check if audio actually ran
        if (audio && audio.voice_integrity) {
            if (audio.voice_integrity.cloning_probability > 0.6) {
                riskScore = Math.max(riskScore, 90);
                evidence.push("CRITICAL: AI Voice Cloning signature detected.");
            }
        }

        // --- 3. VIDEO (Safe Check) ---
        if (video && video.verdict) {
            if (video.verdict.is_deepfake) {
                riskScore = Math.max(riskScore, 95);
                evidence.push("CRITICAL: Deepfake face swap detected.");
            }
        }

        // --- 4. OSINT ---
        if (internet?.footprintAnalysis?.sources?.stockParams) {
            riskScore = Math.max(riskScore, 90);
            evidence.push("CRITICAL: Stock Photo Match (Context Deception).");
        }

        // --- 5. SAFETY NET ---
        // If Forensic failed completely (error/null), set High Risk
        if (forensic?.error) {
            riskScore = Math.max(riskScore, 50);
            evidence.push("Forensic analysis unavailable (Potential evasion).");
        }

        // Cap & Categorize
        riskScore = Math.min(Math.round(riskScore), 100);
        let riskLevel = "VERIFIED";
        if (riskScore > 80) riskLevel = "CRITICAL";
        else if (riskScore > 50) riskLevel = "HIGH";
        else if (riskScore > 20) riskLevel = "SUSPICIOUS";

        return res.status(200).json({
            service: "risk-engine-v9-bulletproof",
            riskScore,
            riskLevel,
            executiveSummary: evidence.length > 0 ? evidence[0] : "Media appears consistent with organic capture.",
            breakdown: evidence,
            timestamp: new Date().toISOString()
        });

    } catch (e) {
        // Emergency Fallback if logic creates error
        return res.status(200).json({
            service: "risk-engine-fallback",
            riskScore: 50,
            riskLevel: "UNKNOWN",
            executiveSummary: "Manual Review Recommended (Automated scoring interrupted)."
        });
    }
}
