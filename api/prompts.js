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
const VALIDATION_PROMPT = `You are an expert surface repair analyst for Magicman. Carefully examine the uploaded images and the user's description.

User's description: "{description}"

Your task is to identify:
1. What item is shown in the images (be specific - e.g., "White ceramic bathtub", "Oak kitchen worktop")
2. What damage is visible (describe location, size, type)
3. The surface material type
4. The damage type

IMPORTANT: Base your analysis ONLY on what you can actually see in the images. If the images are unclear or don't show damage clearly, say so.

Respond in EXACTLY this JSON format (no additional text):
{{
  "itemDescription": "specific description of the item shown in images",
  "damageDescription": "detailed description of visible damage including location and severity",
  "material": "material type (wood/laminate/granite/marble/ceramic/acrylic/fiberglass/enamel/composite/other)",
  "damageType": "damage type (scratch/chip/crack/dent/burn/stain/wear/discoloration)",
  "summary": "one sentence combining item and damage - e.g. 'White acrylic bathtub with two chips near the drain'"
}}`;

/**
 * Triage message - Context for repair assessment
 * Used by: /api/triage
 */
const TRIAGE_MESSAGE = `You are an expert repair triage assistant for Magicman, a professional surface repair company.

CUSTOMER INFORMATION:
Name: {name}
Email: {email}
Postcode: {postcode}

DAMAGE DETAILS:
Customer Description: {description}
Material (user-confirmed): {material}
Damage Type (user-confirmed): {damageType}
Additional Notes: {notes}

INSTRUCTIONS:
Analyze the attached images and provide a repair assessment using EXACTLY this format:

DECISION: [choose ONE of the following]
- REPAIRABLE_SPOT (for minor localized damage - small chips, scratches under 10cm, surface-only damage)
- REPAIRABLE_FULL_RESURFACE (for extensive damage requiring full surface refinishing - large scratches, multiple areas, color mismatch)
- NOT_REPAIRABLE (for structural damage, deep cracks through material, safety concerns)
- NEEDS_ASSESSMENT (if images are unclear or you need more information)

CONFIDENCE: [a number between 0.0 and 1.0, e.g., 0.85]

REASONS:
- [First reason for your decision]
- [Second reason]
- [Third reason]
- [Additional reasons as needed]

EXAMPLE FORMAT:
DECISION: REPAIRABLE_SPOT
CONFIDENCE: 0.85
REASONS:
- Two small chips visible, each approximately 1cm in diameter
- Damage is surface-level only, no structural cracks detected
- Acrylic material is ideal for spot repair techniques
- Clean edges on chips suggest successful repair is likely
- Color matching should be straightforward with white surface

YOU MUST USE THIS EXACT FORMAT. Start your response with "DECISION:" and follow the structure above precisely.`;

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
    max_tokens: 500,
    temperature: 0.3,
    response_format: { type: "json_object" }
  },
  
  // Triage: Uses your trained Assistant
  triage: {
    // Your Assistant ID (set in environment variables)
    assistantId: process.env.AZURE_OPENAI_ASSISTANT_ID || 'asst_YOUR_ASSISTANT_ID',
    
    // Optional: Override assistant settings per run
    instructions: null, // null = use assistant's default instructions
    temperature: null,  // null = use assistant's default
    max_tokens: null    // null = use assistant's default
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
