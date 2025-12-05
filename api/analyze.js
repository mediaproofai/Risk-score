export default async function handler(req, res) {
    // 1. STANDARD CORS & SECURITY HEADERS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { forensic, audio, video, internet, metadata } = req.body;

        let riskScore = 0;
        let evidence = [];
        let trustFactors = [];
        let killSwitchActivated = false;

        // --- PHASE 1: KILL SIGNALS (Immediate Condemnation) ---
        // These factors are 99.9% indicators of deception.

        // 1.1 Known AI Metadata Signature (Local Check)
        if (forensic?.details?.aiArtifacts?.localFlags?.length > 0) {
            riskScore = 100;
            killSwitchActivated = true;
            evidence.push(`CRITICAL: Known AI Generator Signature found in file header (${forensic.details.aiArtifacts.localFlags[0]}).`);
        }

        // 1.2 Stock Photo Match (Deception)
        if (!killSwitchActivated && internet?.footprintAnalysis?.sources?.stockParams) {
            riskScore = 95;
            killSwitchActivated = true;
            evidence.push("CRITICAL: Image identified in commercial Stock Photo database (Context Mismatch).");
        }

        // 1.3 Audio Frequency Cutoff (16kHz = Old TTS/Deepfake)
        if (!killSwitchActivated && audio?.signal_analysis?.frequency_cutoff?.includes("Hard Limit")) {
            riskScore = 90;
            killSwitchActivated = true;
            evidence.push("CRITICAL: Audio spectrum shows unnatural 16kHz cutoff (Typical of TTS/Cloning).");
        }

        // --- PHASE 2: WEIGHTED PROBABILISTIC SCORING ---
        // If no Kill Signal, we weigh the evidence.

        if (!killSwitchActivated) {
            
            // 2.1 VISUAL FORENSICS (The Council of Models)
            if (forensic?.details?.aiArtifacts) {
                const ai = forensic.details.aiArtifacts;
                
                // If the "Council" (Ensemble) returns high confidence
                if (ai.confidence > 0.5) {
                    const severity = Math.round(ai.confidence * 100);
                    riskScore += severity; // Add the raw AI score
                    
                    if (severity > 80) evidence.push(`High-Fidelity AI visual artifacts detected (${severity}% confidence).`);
                    else evidence.push(`Subtle synthetic textures detected (${severity}% confidence).`);
                }

                // Check Noise/Entropy (Smoothness)
                if (forensic.details.noiseAnalysis?.inconsistent) {
                    riskScore += 20;
                    evidence.push("Unnatural pixel noise entropy (Surface is too smooth).");
                }
            }

            // 2.2 VIDEO TEMPORAL FORENSICS
            if (video?.verdict) {
                // Frame-by-Frame AI Detection
                if (video.verdict.is_deepfake) {
                    riskScore = Math.max(riskScore, video.verdict.confidence * 100);
                    evidence.push(`Deepfake faces detected across multiple keyframes.`);
                }

                // Sync/Compression Anomalies
                if (video.temporal_analysis?.sync_anomaly === "HIGH") {
                    riskScore += 15;
                    evidence.push("Audio/Video bitrate mismatch (Potential cheap deepfake or re-encoding).");
                }
                
                if (video.temporal_analysis?.frame_integrity === "CRITICAL_MANIPULATION") {
                    riskScore = Math.max(riskScore, 85);
                    evidence.push("Temporal inconsistency: Adjacent frames do not follow physics.");
                }
            }

            // 2.3 AUDIO VOICE INTEGRITY
            if (audio?.voice_integrity) {
                if (audio.voice_integrity.cloning_probability > 0.6) {
                    riskScore += Math.round(audio.voice_integrity.cloning_probability * 100);
                    evidence.push("Voice biometrics match known cloning patterns.");
                }
                if (audio.signal_analysis?.micro_tremors === "ABSENT") {
                    riskScore += 15;
                    evidence.push("Lacks human vocal micro-tremors (Robotic stability).");
                }
            }

            // 2.4 OSINT (Timeline Analysis)
            if (internet?.footprintAnalysis) {
                // Zero Footprint Risk (Fresh AI often has 0 matches)
                if (internet.footprintAnalysis.totalMatches === 0 && riskScore > 40) {
                    riskScore += 10; 
                    evidence.push("Zero internet history corroborates synthetic origin.");
                }
                // Viral Repost Risk
                else if (internet.footprintAnalysis.isViral) {
                    // Viral doesn't mean fake, but it increases the chance of "Cheapfakes" (Context stripping)
                    if (riskScore < 20) {
                        riskScore += 5; 
                        evidence.push("High-velocity viral content (Verify original context).");
                    }
                }
            }

            // 2.5 METADATA INTEGRITY
            if (metadata?.provenance?.isEdited) {
                riskScore += 10;
                evidence.push(`Software signature trace: ${metadata.deviceFingerprint?.software || "Unknown Editor"}.`);
            }
        }

        // --- PHASE 3: NORMALIZATION & VERDICT ---

        // Cap Risk at 100
        riskScore = Math.min(Math.round(riskScore), 100);
        
        // Define Risk Level
        let riskLevel = "VERIFIED";
        if (riskScore > 85) riskLevel = "CRITICAL";
        else if (riskScore > 60) riskLevel = "HIGH";
        else if (riskScore > 30) riskLevel = "SUSPICIOUS";

        // Generate Executive Summary
        let summary = "Analysis complete. Media appears consistent with organic capture.";
        
        if (evidence.length > 0) {
            // Prioritize the top 2 evidence points for the summary
            summary = `${riskLevel} THREAT: ${evidence.slice(0, 2).join(" ")}`;
            if (evidence.length > 2) summary += ` (+${evidence.length - 2} other flags).`;
        }

        // Add Trust Factors if score is low (Psychological reassurance)
        if (riskScore < 20) {
            if (internet?.footprintAnalysis?.totalMatches > 0) trustFactors.push("Corroborated by external internet sources.");
            if (metadata?.fileIntegrity?.isExtensionSpoofed === false) trustFactors.push("File structure integrity is valid.");
            if (audio && audio.signal_analysis?.micro_tremors === "PRESENT") trustFactors.push("Natural biological vocal tremors detected.");
        }

        return res.status(200).json({
            service: "risk-engine-god-mode",
            riskScore: riskScore,
            riskLevel: riskLevel,
            executiveSummary: summary,
            breakdown: evidence,
            trustFactors: trustFactors,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        return res.status(500).json({ 
            error: "Risk Assessment Failed", 
            details: error.message,
            fallback_score: 50 // Fail-safe: Assume suspicious if system crashes
        });
    }
}
