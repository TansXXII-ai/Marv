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
                <h3>AI Analysis:</h3>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #374151;">Item Detected:</h4>
                    <p style="margin: 0 0 16px 0; padding: 12px; background: #f3f4f6; border-radius: 8px; color: #1f2937; line-height: 1.6; font-size: 14px;">
                        ${validatedData.itemDescription || 'Unable to determine item'}
                    </p>
                    
                    <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #374151;">Damage Detected:</h4>
                    <p style="margin: 0; padding: 12px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; color: #92400e; line-height: 1.6; font-size: 14px;">
                        ${validatedData.damageDescription || 'Unable to determine damage'}
                    </p>
                </div>
                
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
            console.log('========================');
            
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
            
            console.log('Formatted result being sent to results page:', formattedResult);
            showResultsWithData(formattedResult);
            
        } catch (error) {
            console.error('=== TRIAGE ERROR ===');
            console.error('Error object:', error);
            console.error('==================');
            
            showError('Failed to complete analysis. Please try again.');
        }
    });
}
