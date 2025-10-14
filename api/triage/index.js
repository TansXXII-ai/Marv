module.exports = async function (context, req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
    return;
  }

  try {
    // Get the form data from the request
    const { text, images, name, email, postcode } = req.body;

    // Log received data (for debugging)
    context.log('Triage request received:', {
      name,
      email,
      postcode,
      descriptionLength: text?.length,
      imageCount: images?.length
    });

    // TODO: Replace this with your actual AI analysis
    // For now, return a mock response based on keywords
    const decision = analyzeDescription(text, images);

    const response = {
      decision: decision.type,
      confidence_0to1: decision.confidence,
      reasons: decision.reasons
    };

    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: response
    };

  } catch (error) {
    context.log.error('Error processing triage:', error);
    
    context.res = {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: {
        error: 'Failed to analyse damage',
        message: error.message
      }
    };
  }
};

// Mock AI analysis function - REPLACE THIS with your actual AI
function analyzeDescription(text, images) {
  const lowerText = text.toLowerCase();
  
  // Simple keyword-based mock analysis
  if (lowerText.includes('small') || lowerText.includes('chip') || lowerText.includes('scratch')) {
    return {
      type: 'REPAIRABLE_SPOT',
      confidence: 0.85,
      reasons: [
        'Small surface damage detected',
        'Suitable for spot repair technique',
        'Cost-effective repair option available'
      ]
    };
  }
  
  if (lowerText.includes('large') || lowerText.includes('cracked') || lowerText.includes('broken')) {
    return {
      type: 'REPAIRABLE_FULL_RESURFACE',
      confidence: 0.78,
      reasons: [
        'Extensive damage requiring full resurface',
        'Multiple affected areas detected',
        'Full restoration recommended for best results'
      ]
    };
  }
  
  if (lowerText.includes('severe') || lowerText.includes('destroyed') || lowerText.includes('shattered')) {
    return {
      type: 'NCD',
      confidence: 0.92,
      reasons: [
        'Severe structural damage identified',
        'Repair costs would exceed replacement value',
        'Replacement recommended'
      ]
    };
  }
  
  if (images && images.length === 0) {
    return {
      type: 'NEEDS_MORE_INFO',
      confidence: 0.65,
      reasons: [
        'Additional photos would help assessment',
        'Unable to determine extent without visual evidence',
        'Please provide clear images of the damage'
      ]
    };
  }
  
  // Default response
  return {
    type: 'REPAIRABLE_SPOT',
    confidence: 0.72,
    reasons: [
      'Standard damage pattern identified',
      'Repair appears feasible',
      'Technician review recommended for accurate estimate'
    ]
  };
}
