// AI response parsing - HANDLES BOTH TEXT AND JSON FORMATS
export function parseAIResponse(rawResponse) {
    const result = {
        decision: 'UNKNOWN',
        confidence: 0,
        reasons: [],
        rawText: rawResponse
    };

    console.log('Parsing AI response (first 300 chars):', rawResponse.substring(0, 300) + '...');

    // First, try to parse as JSON (for legacy Assistant responses)
    try {
        const jsonResponse = JSON.parse(rawResponse);
        console.log('Response is JSON format');
        
        // Map JSON decision to our format
        if (jsonResponse.decision) {
            const decision = jsonResponse.decision.toUpperCase();
            // Map old NCD to NOT_REPAIRABLE
            if (decision === 'NCD') {
                result.decision = 'NOT_REPAIRABLE';
            } else if (decision === 'NEEDS_MORE_INFO') {
                result.decision = 'NEEDS_ASSESSMENT';
            } else {
                result.decision = decision;
            }
            console.log('Found JSON decision:', result.decision);
        }
        
        // Extract confidence
        if (jsonResponse.confidence_0to1 !== undefined) {
            result.confidence = parseFloat(jsonResponse.confidence_0to1);
        } else if (jsonResponse.confidence !== undefined) {
            result.confidence = parseFloat(jsonResponse.confidence);
        }
        console.log('Found JSON confidence:', result.confidence);
        
        // Extract reasons
        if (jsonResponse.reasons && Array.isArray(jsonResponse.reasons)) {
            result.reasons = jsonResponse.reasons.filter(r => r && r.length > 5);
            console.log('Found JSON reasons:', result.reasons.length);
        }
        
        // If no reasons in JSON, try to extract from other fields
        if (result.reasons.length === 0 && jsonResponse.detected_damage) {
            const damageNotes = jsonResponse.detected_damage
                .map(d => d.notes)
                .filter(n => n && n.length > 10);
            if (damageNotes.length > 0) {
                result.reasons = damageNotes;
            }
        }
        
        console.log('Final JSON parse result:', {
            decision: result.decision,
            confidence: result.confidence,
            reasonsCount: result.reasons.length
        });
        
        return result;
    } catch (e) {
        // Not JSON, continue with text parsing
        console.log('Response is text format, parsing as structured text...');
    }

    // TEXT FORMAT PARSING
    
    // Extract DECISION
    const decisionMatch = rawResponse.match(/DECISION:\s*([A-Z_]+)/i);
    if (decisionMatch) {
        result.decision = decisionMatch[1].toUpperCase();
        console.log('Found text decision:', result.decision);
    } else {
        console.warn('No explicit decision found, attempting inference...');
        const lower = rawResponse.toLowerCase();
        if (lower.includes('repairable') && lower.includes('spot')) {
            result.decision = 'REPAIRABLE_SPOT';
        } else if (lower.includes('repairable') && (lower.includes('resurface') || lower.includes('full'))) {
            result.decision = 'REPAIRABLE_FULL_RESURFACE';
        } else if (lower.includes('not repairable') || lower.includes('ncd')) {
            result.decision = 'NOT_REPAIRABLE';
        } else if (lower.includes('needs') && (lower.includes('assessment') || lower.includes('more info'))) {
            result.decision = 'NEEDS_ASSESSMENT';
        } else if (lower.includes('repairable') || lower.includes('feasible')) {
            result.decision = 'REPAIRABLE_SPOT';
        }
        console.log('Inferred decision:', result.decision);
    }

    // Extract CONFIDENCE
    const confidenceMatch = rawResponse.match(/CONFIDENCE:\s*([\d.]+)/i);
    if (confidenceMatch) {
        result.confidence = parseFloat(confidenceMatch[1]);
        console.log('Found text confidence:', result.confidence);
    } else {
        console.warn('No confidence found, using default');
        result.confidence = result.decision !== 'UNKNOWN' ? 0.7 : 0.0;
    }

    // Extract REASONS
    const reasonsMatch = rawResponse.match(/REASONS?:\s*(.+?)(?=\n\n|\n[A-Z]+:|$)/is);
    if (reasonsMatch) {
        let reasonsText = reasonsMatch[1].trim();
        
        // Clean up
        reasonsText = reasonsText.replace(/["}]+$/, '').trim();
        reasonsText = reasonsText.replace(/\\n/g, '\n');
        
        // Split by bullet points, dashes, numbers, or newlines
        result.reasons = reasonsText
            .split(/(?:^|\n)\s*[-•*\d.]+\s+/)
            .map(r => r.trim())
            .filter(r => r.length > 10 && !r.toLowerCase().includes('example'));
        
        console.log('Found', result.reasons.length, 'text reasons');
    } else {
        console.warn('No REASONS section found, extracting sentences...');
        // Extract meaningful sentences
        const sentences = rawResponse
            .split(/[.!?]+/)
            .map(s => s.trim())
            .filter(s => s.length > 30 && s.length < 250)
            .filter(s => !s.toLowerCase().includes('decision:') && !s.toLowerCase().includes('confidence:'));
        
        result.reasons = sentences.slice(0, 5);
        console.log('Extracted', result.reasons.length, 'sentences as reasons');
    }

    console.log('Final text parse result:', {
        decision: result.decision,
        confidence: result.confidence,
        reasonsCount: result.reasons.length
    });

    return result;
}
