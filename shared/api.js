// shared/api.js - API communication functions used by both widget and form
// This file should be located at: /shared/api.js

// Helper function to convert data URI to Blob
function dataURItoBlob(dataURI) {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
}

// API Base URL
const API_BASE_URL = 'https://ashy-forest-06915f903.2.azurestaticapps.net/api';

/**
 * Call the validation API to analyze images
 * @param {Object} formData - Object containing description and images array
 * @returns {Promise<Object>} - Validation response
 */
export async function callValidateAPI(formData) {
    const data = new FormData();
    data.append('description', formData.description || '');
    
    if (formData.images && formData.images.length > 0) {
        formData.images.forEach((img) => {
            const blob = dataURItoBlob(img.data);
            data.append('images', blob, img.name);
        });
    }

    const response = await fetch(`${API_BASE_URL}/validate`, {
        method: 'POST',
        body: data
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Validation failed: ${response.statusText} - ${errorText}`);
    }

    return await response.json();
}

/**
 * Call the triage API for full repair analysis
 * @param {Object} combinedData - Object containing all form data
 * @returns {Promise<Object>} - Triage response
 */
export async function callTriageAPI(combinedData) {
    const data = new FormData();
    
    // Basic user info
    data.append('name', combinedData.name || '');
    data.append('email', combinedData.email || '');
    data.append('postcode', combinedData.postcode || '');
    data.append('description', combinedData.description || '');
    
    // Validated metadata
    data.append('material', combinedData.surfaceMaterial || '');
    data.append('damageType', combinedData.damageType || '');
    data.append('notes', combinedData.additionalNotes || '');
    
    // Images
    if (combinedData.images && combinedData.images.length > 0) {
        combinedData.images.forEach((img) => {
            const blob = dataURItoBlob(img.data);
            data.append('images', blob, img.name);
        });
    }

    const response = await fetch(`${API_BASE_URL}/triage`, {
        method: 'POST',
        body: data
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Triage failed: ${response.statusText} - ${errorText}`);
    }

    return await response.json();
}

/**
 * AI response parsing - HANDLES BOTH TEXT AND JSON FORMATS
 * @param {string} rawResponse - The raw AI response text
 * @returns {Object} - Parsed response with decision, confidence, and reasons
 */
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
