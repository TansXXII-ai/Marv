// AI response parsing - IMPROVED VERSION
export function parseAIResponse(rawResponse) {
    const result = {
        decision: 'UNKNOWN',
        confidence: 0,
        reasons: [],
        rawText: rawResponse
    };

    console.log('Parsing AI response:', rawResponse.substring(0, 200) + '...');

    // Extract DECISION - more flexible matching
    const decisionMatch = rawResponse.match(/DECISION:\s*([A-Z_]+)/i);
    if (decisionMatch) {
        result.decision = decisionMatch[1].toUpperCase();
        console.log('Found decision:', result.decision);
    } else {
        console.warn('No decision found in response');
        // Try to infer from content
        if (rawResponse.toLowerCase().includes('repairable') && rawResponse.toLowerCase().includes('spot')) {
            result.decision = 'REPAIRABLE_SPOT';
        } else if (rawResponse.toLowerCase().includes('repairable') && rawResponse.toLowerCase().includes('resurface')) {
            result.decision = 'REPAIRABLE_FULL_RESURFACE';
        } else if (rawResponse.toLowerCase().includes('not repairable') || rawResponse.toLowerCase().includes('not feasible')) {
            result.decision = 'NOT_REPAIRABLE';
        } else if (rawResponse.toLowerCase().includes('repairable') || rawResponse.toLowerCase().includes('feasible')) {
            result.decision = 'REPAIRABLE_SPOT';
        }
    }

    // Extract CONFIDENCE - more flexible matching
    const confidenceMatch = rawResponse.match(/CONFIDENCE:\s*([\d.]+)/i);
    if (confidenceMatch) {
        result.confidence = parseFloat(confidenceMatch[1]);
        console.log('Found confidence:', result.confidence);
    } else {
        console.warn('No confidence found in response');
        // If we found a decision but no confidence, assign a default
        if (result.decision !== 'UNKNOWN') {
            result.confidence = 0.7; // Default moderate confidence
        }
    }

    // Extract REASONS (everything after "REASONS:")
    const reasonsMatch = rawResponse.match(/REASONS?:\s*(.+)/is);
    if (reasonsMatch) {
        let reasonsText = reasonsMatch[1].trim();
        
        // Remove trailing JSON characters if present
        reasonsText = reasonsText.replace(/["}]+$/, '').trim();
        
        // Replace \n with actual newlines
        reasonsText = reasonsText.replace(/\\n/g, '\n');
        
        // Split by bullet points, dashes, numbers, or newlines
        result.reasons = reasonsText
            .split(/(?:^|\n)\s*[-•*\d.]+\s+/)
            .map(r => r.trim())
            .filter(r => r.length > 10 && !r.toLowerCase().includes('example format')); // Filter out short items and examples
        
        console.log('Found reasons:', result.reasons.length);
    } else {
        console.warn('No reasons section found, extracting from full text');
        // Try to extract key points from the response
        const sentences = rawResponse
            .split(/[.!?]+/)
            .map(s => s.trim())
            .filter(s => s.length > 30 && s.length < 200); // Reasonable sentence length
        
        result.reasons = sentences.slice(0, 5); // Take first 5 sentences as reasons
    }

    console.log('Parsed result:', {
        decision: result.decision,
        confidence: result.confidence,
        reasonsCount: result.reasons.length
    });

    return result;
}
