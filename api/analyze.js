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
        
        // The PNG Trap Catch
        if (ai.format_risk > 0.8) {
            riskScore = Math.max(riskScore, 95);
            evidence.push("CRITICAL: Image format (PNG) lacks mandatory camera signature.");
        }

        // Neural Net Catch (Lower threshold 15%)
        if (ai.confidence > 0.15) {
            let impact = ai.confidence * 100;
            riskScore = Math.max(riskScore, impact);
            
            if (ai.model_flagged !== "None") {
                evidence.push(`AI detected by ${ai.model_flagged} (${Math.round(impact)}%).`);
            } else if (ai.physics_score > 0.4) {
                evidence.push("Synthetic pixel distribution detected (Hyper-Entropy).");
            }
        }
    } else {
        riskScore = 50;
        evidence.push("Forensic data unavailable.");
    }

    // 2. INTERNET EVIDENCE
    if (internet?.footprintAnalysis?.sources?.stockParams) {
        riskScore = 95;
        evidence.push("CRITICAL: Stock Database Match.");
    }

    // 3. FINAL VERDICT
    riskScore = Math.min(Math.round(riskScore), 100);
    let riskLevel = riskScore > 80 ? "CRITICAL" : riskScore > 40 ? "HIGH" : "VERIFIED";

    return res.status(200).json({
        service: "risk-engine-titanium",
        riskScore,
        riskLevel,
        executiveSummary: evidence.length > 0 ? evidence[0] : "Media appears consistent.",
        breakdown: evidence,
        timestamp: new Date().toISOString()
    });
}
