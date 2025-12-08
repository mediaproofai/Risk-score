// ... inside the main function ...
    
    // 1. FORENSIC EVIDENCE (The New Logic)
    if (forensic?.details?.aiArtifacts) {
        const ai = forensic.details.aiArtifacts;
        
        // Did the Neural Net catch it?
        if (ai.model_flagged !== "None" && ai.confidence > 0.5) {
            let impact = ai.confidence * 100;
            riskScore = Math.max(riskScore, impact);
            evidence.push(`CRITICAL: AI detected by ${ai.model_flagged} (${Math.round(impact)}%).`);
        }
        
        // Did the Physics Engine catch it?
        if (ai.physics_score > 0.5) {
            // Physics is strong evidence of unnatural generation
            riskScore = Math.max(riskScore, 75);
            evidence.push(`High-Probability Synthetic Physics (Entropy/Variance mismatch).`);
        }
    }
    
    // ... rest of the code ...
