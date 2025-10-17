// AI response parsing
export function parseAIResponse(rawResponse) {
    const result = {
        decision: 'UNKNOWN',
        confidence: 0,
        reasons: [],
        rawText: rawResponse
    };

    // Extract DECISION
    const decisionMatch = rawResponse.match(/DECISION:\s*([A-Z_]+)/i);
    if (decisionMatch) {
        result.decision = decisionMatch[1].toUpperCase();
    }

    // Extract CONFIDENCE
    const confidenceMatch = rawResponse.match(/CONFIDENCE:\s*([\d.]+)/i);
    if (confidenceMatch) {
        result.confidence = parseFloat(confidenceMatch[1]);
    }

    // Extract REASONS (everything after "REASONS:")
    const reasonsMatch = rawResponse.match(/REASONS:\s*(.+)/is);
    if (reasonsMatch) {
        let reasonsText = reasonsMatch[1].trim();
        
        // Remove trailing JSON characters if present
        reasonsText = reasonsText.replace(/["}]+$/, '').trim();
        
        // Replace \n with actual newlines
        reasonsText = reasonsText.replace(/\\n/g, '\n');
        
        // Split by bullet points, dashes, or newlines
        result.reasons = reasonsText
            .split(/[-•*]\s*|\n/)
            .map(r => r.trim())
            .filter(r => r.length > 10); // Filter out very short items
    }

    return result;
}
