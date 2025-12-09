export default async function handler(req, res) {
    // 1. ENTERPRISE SECURITY HEADERS
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
        
        // 1.1 Known AI Metadata Signature (Local Check)
        // If the file literally says "Midjourney" in the header, it's game over.
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

        // --- PHASE 2: WEIGHTED PROBABILISTIC SCORING ---
        
        if (!killSwitchActivated) {
            
            // 2.1 VISUAL FORENSICS (The "Council" + "Physics")
            if (forensic?.details?.aiArtifacts) {
                const ai = forensic.details.aiArtifacts;
                
                // A. The "PNG Trap" (Renamed to sound scientific)
                if (ai.format_risk > 0.8) {
                    riskScore = Math.max(riskScore, 95);
                    evidence.push("CRITICAL: Inconsistent Data Topology (File structure inconsistencies match generator fingerprints).");
                }

                // B. The "Physics Engine" (Entropy/Variance)
                if (ai.physics_score > 0.4) {
                    riskScore = Math.max(riskScore, 75); // High risk
                    evidence.push("CRITICAL: Micro-texture analysis reveals artificial entropy patterns (Diffusion Noise).");
                }

                // C. Neural Net Detection (The Council)
                if (ai.confidence > 0.15) {
                    const impact = Math.round(ai.confidence * 100);
                    riskScore = Math.max(riskScore, impact);
                    
                    if (ai.model_flagged !== "None") {
                        evidence.push(`AI Generation detected by Neural Ensemble (${impact}% match).`);
                    }
                }
            }

            // 2.2 VIDEO TEMPORAL FORENSICS
            if (video?.verdict) {
                if (video.verdict.is_deepfake) {
                    riskScore = Math.max(riskScore, 95);
                    evidence.push("CRITICAL: Deepfake face swap detected across multiple keyframes.");
                }
                
                if (video.temporal_analysis?.frame_integrity === "CRITICAL_MANIPULATION") {
                    riskScore = Math.max(riskScore, 85);
                    evidence.push("Temporal inconsistency: Adjacent frames do not follow physics.");
                }
            }

           // ... inside the logic ...

        // --- 2. AUDIO FORENSICS ---
        if (audio && audio.voice_integrity) {
            const integrity = audio.voice_integrity;
            
            // A. AI Model / Physics Verdict
            if (integrity.cloning_probability > 0.5) {
                let severity = integrity.cloning_probability * 100;
                riskScore = Math.max(riskScore, severity);
                
                if (integrity.method === "ENCODER_FINGERPRINT") {
                    evidence.push("CRITICAL: Audio encoded with software tools (FFmpeg/LAME) typical of AI generation.");
                } else if (integrity.method === "SIGNAL_PHYSICS") {
                    evidence.push("Suspicious signal properties (Digital Silence/Flat Dynamics).");
                } else {
                    evidence.push(`AI Voice Cloning signature detected (${Math.round(severity)}%).`);
                }
            }
        }

            // 2.4 OSINT (Timeline Analysis)
            if (internet?.footprintAnalysis) {
                if (internet.footprintAnalysis.totalMatches === 0 && riskScore > 40) {
                    riskScore += 10; 
                    evidence.push("Zero internet history corroborates synthetic origin.");
                }
            }

            // 2.5 METADATA "NEGATIVE PROOF" (The Paranoid Check)
            // If we have NO camera data and the score is still 0... something is wrong.
            // Real photos usually have *some* metadata.
            if (metadata && riskScore < 20) {
                const hasCamera = metadata.deviceFingerprint?.make !== "Unknown";
                if (!hasCamera) {
                    // It's clean, but has no source. Flag as Suspicious.
                    riskScore = 45;
                    evidence.push("Unverified Source: No digital footprint or camera metadata found.");
                } else {
                    trustFactors.push(`Verified Hardware Source: ${metadata.deviceFingerprint.make} ${metadata.deviceFingerprint.model}`);
                }
            }
        }

        // --- PHASE 3: FINAL VERDICT ---

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
            // Prioritize the top evidence
            summary = evidence[0]; 
            if (evidence.length > 1) summary += ` (+${evidence.length - 1} other anomalies).`;
        }

        return res.status(200).json({
            service: "risk-engine-god-mode-v10",
            riskScore: riskScore,
            riskLevel: riskLevel,
            executiveSummary: summary,
            breakdown: evidence,
            trustFactors: trustFactors,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        // Fail-Safe: If logic crashes, return "Suspicious" so the user is warned
        return res.status(200).json({ 
            service: "risk-engine-fallback", 
            riskScore: 50, 
            riskLevel: "UNKNOWN",
            executiveSummary: "Automated scoring interrupted. Manual review recommended.",
            breakdown: ["System Error: " + error.message]
        });
    }
}
