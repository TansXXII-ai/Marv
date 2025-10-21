// Step 6: Validation confirmation - Chat style with editable fields
import { validatedData, updateValidatedData } from '../core/state.js';
import { MATERIAL_OPTIONS, DAMAGE_OPTIONS } from '../core/config.js';
import { showStep } from './step-router.js';
import { addBotMessage, addBotMessageWithContent, addInputArea, removeLastInputArea, showTypingIndicator, hideTypingIndicator } from '../utils/chat-helpers.js';
import { callTriageAPI } from '../utils/api.js';
import { showResultsWithData } from './step7-results.js';

export async function showValidationStep() {
    await addBotMessage("Great! Here's what I can see from your images:", 300);
    
    // Build material options with AI-detected material at the top
    const detectedMaterial = validatedData.surfaceMaterial?.toLowerCase() || '';
    const materialOptionsHTML = buildMaterialOptions(detectedMaterial);
    
    // Build damage options with AI-detected damage at the top
    const detectedDamage = validatedData.damageType?.toLowerCase() || '';
    const damageOptionsHTML = buildDamageOptions(detectedDamage);
    
    const analysisContent = `
        <div class="marv-validation-section">
            <h5>🔍 Item Detected:</h5>
            <textarea id="itemDescInput" class="marv-textarea" rows="2" style="margin-top: 8px;">${validatedData.itemDescription || 'Unable to determine item'}</textarea>
        </div>
        
        <div class="marv-validation-section damage">
            <h5>⚠️ Damage Detected:</h5>
            <textarea id="damageDescInput" class="marv-textarea" rows="3" style="margin-top: 8px;">${validatedData.damageDescription || 'Unable to determine damage'}</textarea>
        </div>
        
        <div class="marv-form-group" style="margin-top: 16px;">
            <label>Surface Material:</label>
            <select id="materialSelect" class="marv-select">
                ${materialOptionsHTML}
            </select>
        </div>
        
        <div class="marv-form-group">
            <label>Damage Type:</label>
            <select id="damageSelect" class="marv-select">
                ${damageOptionsHTML}
            </select>
        </div>
        
        <div class="marv-form-group">
            <label>Additional Notes (optional):</label>
            <textarea id="notesInput" class="marv-textarea" rows="2" placeholder="Any corrections or extra details...">${validatedData.additionalNotes || ''}</textarea>
        </div>
        
        <div class="marv-btn-group">
            <button class="marv-btn-secondary" id="valBackBtn">Back</button>
            <button class="marv-btn" id="valNextBtn">Confirm & Analyze ✓</button>
        </div>
    `;
    
    await addBotMessageWithContent(analysisContent, 600);

    // Wait for DOM to be ready
    setTimeout(() => {
        setupValidationEventListeners();
    }, 100);
}

function buildMaterialOptions(detectedMaterial) {
    // Extended material list
    const allMaterials = [
        { value: 'acrylic', label: 'Acrylic' },
        { value: 'wood', label: 'Wood' },
        { value: 'laminate', label: 'Laminate' },
        { value: 'granite', label: 'Granite' },
        { value: 'marble', label: 'Marble' },
        { value: 'quartz', label: 'Quartz' },
        { value: 'ceramic', label: 'Ceramic' },
        { value: 'porcelain', label: 'Porcelain' },
        { value: 'fiberglass', label: 'Fiberglass' },
        { value: 'enamel', label: 'Enamel' },
        { value: 'composite', label: 'Composite' },
        { value: 'solid_surface', label: 'Solid Surface (Corian)' },
        { value: 'glass', label: 'Glass' },
        { value: 'metal', label: 'Metal' },
        { value: 'plastic', label: 'Plastic' },
        { value: 'concrete', label: 'Concrete' },
        { value: 'tile', label: 'Tile' },
        { value: 'vinyl', label: 'Vinyl' },
        { value: 'other', label: 'Other' },
        { value: 'unknown', label: 'Not Sure' }
    ];
    
    // If detected material isn't in the list, add it at the top
    const materialInList = allMaterials.find(m => m.value === detectedMaterial);
    if (detectedMaterial && !materialInList && detectedMaterial !== 'unknown') {
        allMaterials.unshift({
            value: detectedMaterial,
            label: detectedMaterial.charAt(0).toUpperCase() + detectedMaterial.slice(1) + ' (AI detected)'
        });
    }
    
    return allMaterials.map(opt => 
        `<option value="${opt.value}" ${detectedMaterial === opt.value ? 'selected' : ''}>${opt.label}</option>`
    ).join('');
}

function buildDamageOptions(detectedDamage) {
    const allDamageTypes = [
        { value: 'chip', label: 'Chip' },
        { value: 'crack', label: 'Crack' },
        { value: 'scratch', label: 'Scratch' },
        { value: 'dent', label: 'Dent' },
        { value: 'burn', label: 'Burn' },
        { value: 'stain', label: 'Stain' },
        { value: 'discoloration', label: 'Discoloration' },
        { value: 'wear', label: 'General Wear' },
        { value: 'gouge', label: 'Gouge' },
        { value: 'hole', label: 'Hole' },
        { value: 'water_damage', label: 'Water Damage' },
        { value: 'multiple', label: 'Multiple Issues' },
        { value: 'other', label: 'Other' }
    ];
    
    // If detected damage isn't in the list, add it at the top
    const damageInList = allDamageTypes.find(d => d.value === detectedDamage);
    if (detectedDamage && !damageInList && detectedDamage !== 'other') {
        allDamageTypes.unshift({
            value: detectedDamage,
            label: detectedDamage.charAt(0).toUpperCase() + detectedDamage.slice(1) + ' (AI detected)'
        });
    }
    
    return allDamageTypes.map(opt => 
        `<option value="${opt.value}" ${detectedDamage === opt.value ? 'selected' : ''}>${opt.label}</option>`
    ).join('');
}

function setupValidationEventListeners() {
    const itemDescInput = document.getElementById('itemDescInput');
    const damageDescInput = document.getElementById('damageDescInput');
    const materialSelect = document.getElementById('materialSelect');
    const damageSelect = document.getElementById('damageSelect');
    const notesInput = document.getElementById('notesInput');
    const backBtn = document.getElementById('valBackBtn');
    const nextBtn = document.getElementById('valNextBtn');

    if (!backBtn || !nextBtn) {
        console.error('Validation buttons not found');
        return;
    }

    backBtn.addEventListener('click', () => showStep(5));
    
    nextBtn.addEventListener('click', async () => {
        // Update all validated data from user inputs
        updateValidatedData({
            itemDescription: itemDescInput?.value.trim() || validatedData.itemDescription,
            damageDescription: damageDescInput?.value.trim() || validatedData.damageDescription,
            surfaceMaterial: materialSelect?.value || validatedData.surfaceMaterial,
            damageType: damageSelect?.value || validatedData.damageType,
            additionalNotes: notesInput?.value.trim() || ''
        });
        
        // Show user's confirmed selections
        const confirmationSummary = `
            <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 12px; border-radius: 8px; margin: 8px 0;">
                <p style="margin: 0; font-size: 14px; line-height: 1.6;">
                    <strong>✓ Item:</strong> ${validatedData.itemDescription}<br>
                    <strong>✓ Damage:</strong> ${validatedData.damageDescription}<br>
                    <strong>✓ Material:</strong> ${materialSelect?.options[materialSelect.selectedIndex]?.text || validatedData.surfaceMaterial}<br>
                    <strong>✓ Type:</strong> ${damageSelect?.options[damageSelect.selectedIndex]?.text || validatedData.damageType}
                    ${validatedData.additionalNotes ? `<br><strong>✓ Notes:</strong> ${validatedData.additionalNotes}` : ''}
                </p>
            </div>
        `;
        
        removeLastInputArea();
        await addBotMessageWithContent(confirmationSummary, 100);
        await addBotMessage("Perfect! Let me do a complete analysis now... 🧠", 400);
        
        showTypingIndicator();
        
        try {
            const result = await callTriageAPI();
            hideTypingIndicator();
            
            if (!result || !result.ok) {
                throw new Error('Invalid response from triage API');
            }
            
            await addBotMessage("Analysis complete! Here are my findings: 📋", 300);
            showResultsWithData(result);
            
        } catch (error) {
            hideTypingIndicator();
            console.error('Triage error:', error);
            await addBotMessage("I'm having trouble completing the analysis. Please try again in a moment. 😕", 100);
            
            // Show error details
            const errorDetails = `
                <details class="marv-debug-details" style="margin-top: 12px;">
                    <summary>Technical Error Details</summary>
                    <pre class="marv-debug-pre">${error.message}</pre>
                </details>
            `;
            await addBotMessageWithContent(errorDetails, 200);
        }
    });
}
