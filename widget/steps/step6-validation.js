// Step 6: Validation confirmation
import { widgetContent, validatedData, updateValidatedData } from '../core/state.js';
import { MATERIAL_OPTIONS, DAMAGE_OPTIONS } from '../core/config.js';
import { showStep } from './step-router.js';
import { showLoading } from '../components/loading.js';
import { showError } from '../components/error.js';
import { callTriageAPI } from '../utils/api.js';
import { showResultsWithData } from './step7-results.js';

export function showValidationStep() {
    const materialOptions = MATERIAL_OPTIONS.map(opt => 
        `<option value="${opt.value}" ${validatedData.surfaceMaterial === opt.value ? 'selected' : ''}>${opt.label}</option>`
    ).join('');

    const damageOptions = DAMAGE_OPTIONS.map(opt => 
        `<option value="${opt.value}" ${validatedData.damageType === opt.value ? 'selected' : ''}>${opt.label}</option>`
    ).join('');

    widgetContent.innerHTML = `
        <div class="marv-step">
            <h2>Please Confirm</h2>
            
            <div class="marv-validation-card">
                <h3>AI Summary:</h3>
                <p class="marv-ai-summary">${validatedData.aiSummary}</p>
                
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
                    <textarea id="notesInput" class="marv-textarea" rows="3" placeholder="Add any corrections or additional details...">${validatedData.additionalNotes}</textarea>
                </div>
            </div>
            
            <div class="marv-btn-group">
                <button class="marv-btn-secondary" id="valBackBtn">Back</button>
                <button class="marv-btn" id="valNextBtn">Confirm & Analyze</button>
            </div>
        </div>
    `;

    const materialSelect = document.getElementById('materialSelect');
    const damageSelect = document.getElementById('damageSelect');
    const notesInput = document.getElementById('notesInput');
    const backBtn = document.getElementById('valBackBtn');
    const nextBtn = document.getElementById('valNextBtn');

    backBtn.addEventListener('click', () => showStep(5));
    
    nextBtn.addEventListener('click', async () => {
        updateValidatedData({
            surfaceMaterial: materialSelect.value,
            damageType: damageSelect.value,
            additionalNotes: notesInput.value.trim()
        });
        
        showLoading('Performing final analysis...');
        
        try {
            console.log('Calling triage API...');
            const result = await callTriageAPI();
            
            console.log('=== TRIAGE API RESPONSE ===');
            console.log('Full response:', result);
            console.log('Response type:', typeof result);
            console.log('Has result property?', result && result.result);
            console.log('========================');
            
            // Check if result exists
            if (!result) {
                throw new Error('No response from triage API');
            }
            
            // Check if result has the expected 'result' property
            let formattedResult;
            if (result.result) {
                // API returned { result: "DECISION: ..." }
                formattedResult = result;
            } else if (typeof result === 'string') {
                // API returned just the string directly
                formattedResult = { result: result };
            } else if (result.decision) {
                // API returned structured format { decision: "...", confidence: ... }
                formattedResult = {
                    result: `DECISION: ${result.decision || 'UNKNOWN'} CONFIDENCE: ${result.confidence || 0} REASONS: ${result.reasons || 'No reasons provided'}`
                };
            } else {
                // Unknown format - try to stringify it
                console.warn('Unexpected API response format:', result);
                formattedResult = { result: JSON.stringify(result) };
            }
            
            console.log('Formatted result being sent to results page:', formattedResult);
            showResultsWithData(formattedResult);
            
        } catch (error) {
            console.error('=== TRIAGE ERROR ===');
            console.error('Error object:', error);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('==================');
            
            showError('Failed to complete analysis. Please try again.');
        }
    });
}
