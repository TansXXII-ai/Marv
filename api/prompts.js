// api/prompts.js
// Centralized AI prompts for easy maintenance and editing
// Using CommonJS exports for Azure Functions compatibility

/**
 * Validation prompt - Quick initial image analysis
 * Used by: /api/validate (uses Chat Completions API for speed)
 * 
 * Variables available:
 * - {description}: User's damage description
 */
const VALIDATION_PROMPT = `You are a surface repair expert for Magicman. Analyze these images in detail to provide:

1. ITEM DESCRIPTION: A detailed description of the main item visible in the images (e.g., "White ceramic bathtub", "Oak wood kitchen worktop", "Laminate bathroom vanity unit")

2. DAMAGE DESCRIPTION: A comprehensive description of all visible damage to this item, including location, size, and severity

3. MATERIAL: The surface material type (e.g., wood, laminate, granite, marble, ceramic, acrylic, fiberglass, enamel)

4. DAMAGE TYPE: The primary type of damage (e.g., scratch, dent, crack, chip, burn, stain, wear)

User's description: "{description}"

Respond ONLY in this exact JSON format:
{
  "itemDescription": "detailed description of the main item in the images",
  "damageDescription": "detailed description of the damage visible on the item, including location and severity",
  "material": "detected material type",
  "damageType": "detected damage type",
  "summary": "brief one-sentence overview combining item and damage"
}

Be specific and detailed in your descriptions to help the customer understand what you're analyzing.`;

/**
 * Triage message - Context for the Assistant
 * Used by: /api/triage (uses Assistants API with your trained assistant)
 * 
 * NOTE: This is NOT a full prompt - your Assistant already has the training.
 * This is just the user message to provide context about this specific case.
 */
const TRIAGE_MESSAGE = `Please analyze the following damage case:

Customer Information:
- Name: {name}
- Email: {email}
- Postcode: {postcode}

Damage Information:
- Description: {description}
- Validated Material: {material}
- Validated Damage Type: {damageType}
- Additional Notes: {notes}

Please review the attached images and provide your repair feasibility assessment.`;

/**
 * Helper function to build validation prompt with user data
 */
function buildValidationPrompt(description) {
  return VALIDATION_PROMPT.replace('{description}', description || 'No description provided');
}

/**
 * Helper function to build triage message for Assistant
 */
function buildTriageMessage(data) {
  const {
    name = 'Unknown',
    email = 'Unknown',
    postcode = 'Unknown',
    description = 'No description provided',
    material = 'Unknown',
    damageType = 'Unknown',
    notes = 'None'
  } = data;

  return TRIAGE_MESSAGE
    .replace('{name}', name)
    .replace('{email}', email)
    .replace('{postcode}', postcode)
    .replace('{description}', description)
    .replace('{material}', material)
    .replace('{damageType}', damageType)
    .replace('{notes}', notes);
}

/**
 * API configuration
 */
const API_CONFIG = {
  // Validation: Fast initial check using Chat Completions
  validation: {
    maxTokens: 500,
    temperature: 0.3,
    responseFormat: { type: "json_object" }
  },
  
  // Triage: Uses your trained Assistant
  triage: {
    // Your Assistant ID (set in environment variables)
    assistantId: process.env.AZURE_OPENAI_ASSISTANT_ID || 'asst_YOUR_ASSISTANT_ID',
    
    // Optional: Override assistant settings per run
    instructions: null, // null = use assistant's default instructions
    temperature: null,  // null = use assistant's default
    maxTokens: null     // null = use assistant's default
  }
};

// CommonJS exports (required for Azure Functions)
module.exports = {
  VALIDATION_PROMPT,
  TRIAGE_MESSAGE,
  buildValidationPrompt,
  buildTriageMessage,
  API_CONFIG
};
