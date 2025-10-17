// Step 6: Validation confirmation - Chat style
import { validatedData, updateValidatedData } from '../core/state.js';
import { MATERIAL_OPTIONS, DAMAGE_OPTIONS } from '../core/config.js';
import { showStep } from './step-router.js';
import { addBotMessage, addBotMessageWithContent, addInputArea, removeLastInputArea, showTypingIndicator, hideTypingIndicator } from '../utils/chat-helpers.js';
import { callTriageAPI } from '../utils/api.js';
import { showResultsWithData } from '../steps/step7-results.js';

export async function showValidationStep() {
    await addBotMessage("Great! Here's what I can see from your images:", 300);
    
    const analysisContent = `
        <div class="marv-validation-section">
            <h5>🔍 Item Detected:</h5>
            <p>${validatedData.itemDescription || 'Unable to determine item'}</p>
        </div>
        
        <div class="marv-validation-section damage">
            <h5>⚠️ Damage Detected:</h5>
            <p>${validatedData.damageDescription || 'Unable to determine damage'}</p>
        </div>
    `;
    
    await addBotMessageWithContent(analysisContent, 600);
    await addBotMessage("Does this look correct? You can adjust the details below if needed:", 900);
    
    const materialOptions = MATERIAL_OPTIONS.map(opt => 
        `<option value="${opt.value}" ${validatedData.surfaceMaterial === opt.value ? 'selected' : ''}>${opt.label}</option>`
    ).join('');

    const damageOptions = DAMAGE_OPTIONS.map(opt => 
        `<option value="${opt.value}" ${validatedData.damageType === opt.value ? 'selected' : ''}>${opt.label}</option>`
    ).join('');

    const inputArea = addInputArea(`
        <div class="marv-form-group">
            <label>Surface Material:</label>
            <select id="materialSelect" class="marv-select">
                ${materialOptions}
            </select>
        </div>
        
        <div class="marv-form-group">
            <label>Damage Type:</label>
            <select id="damageSelect" class="marv-select">
                ${damageOptions}
            </select>
        </div>
        
        <div class="marv-form-group">
            <label>Additional Notes (optional):</label>
            <textarea id="notesInput" class="marv-textarea" rows="2" placeholder="Any corrections or extra details...">${validatedData.additionalNotes}</textarea>
        </div>
        
        <div class="marv-btn-group">
            <button class="marv-btn-secondary" id="valBackBtn">Back</button>
            <button class="marv-btn" id="valNextBtn">Looks Good! ✓</button>
        </div>
    `);

    const materialSelect = inputArea.querySelector('#materialSelect');
    const damageSelect = inputArea.querySelector('#damageSelect');
    const notesInput = inputArea.querySelector('#notesInput');
    const backBtn = inputArea.querySelector('#valBackBtn');
    const nextBtn = inputArea.querySelector('#valNextBtn');

    backBtn.addEventListener('click', () => showStep(5));
    
    nextBtn.addEventListener('click', async () => {
        updateValidatedData({
            surfaceMaterial: materialSelect.value,
            damageType: damageSelect.value,
            additionalNotes: notesInput.value.trim()
        });
        
        removeLastInputArea();
        await addBotMessage("Perfect! Let me do a complete analysis now... 🧠", 100);
        
        showTypingIndicator();
        
        try {
            const result = await callTriageAPI();
            hideTypingIndicator();
            
            if (!result) {
                throw new Error('No response from triage API');
            }
            
            let formattedResult;
            if (result.result) {
                formattedResult = result;
            } else if (typeof result === 'string') {
                formattedResult = { result: result };
            } else if (result.decision) {
                formattedResult = {
                    result: `DECISION: ${result.decision || 'UNKNOWN'} CONFIDENCE: ${result.confidence || 0} REASONS: ${result.reasons || 'No reasons provided'}`
                };
            } else {
                console.warn('Unexpected API response format:', result);
                formattedResult = { result: JSON.stringify(result) };
            }
            
            await addBotMessage("Analysis complete! Here are my findings: 📋", 300);
            showResultsWithData(formattedResult);
            
        } catch (error) {
            hideTypingIndicator();
            console.error('Triage error:', error);
            await addBotMessage("I'm having trouble completing the analysis. Please try again in a moment. 😕", 100);
        }
    });
}
