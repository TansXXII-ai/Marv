// Step 4: Validation confirmation - Chat style with editable fields
import { validatedData, updateValidatedData } from '../core/state.js';
import { MATERIAL_OPTIONS, DAMAGE_OPTIONS } from '../../shared/config.js';
import { showStep } from './step-router.js';
import { addBotMessage, addBotMessageWithContent, addInputArea, removeLastInputArea, showTypingIndicator, hideTypingIndicator, showAnalysisLoader } from '../utils/chat-helpers.js';
import { callTriageAPI } from '../utils/api.js';
import { showResultsWithData } from './step5-results.js';

export async function showValidationStep() {
    showTypingIndicator();
    await new Promise(resolve => setTimeout(resolve, 800));
    hideTypingIndicator();
    
    await addBotMessage("Great! Here's what I can see from your images:", 300);
    
    // Build material options with AI-detected material at the top
    const detectedMaterial = validatedData.surfaceMaterial?.toLowerCase() || '';
    const materialOptionsHTML = buildMaterialOptions(detectedMaterial);
    
    // Build damage options with AI-detected damage at the top
    const detectedDamage = validatedData.damageType?.toLowerCase() || '';
    const damageOptionsHTML = buildDamageOptions(detectedDamage);
    
    const analysisContent = `
        <div class="marv-validation-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h5 style="margin: 0;">🔍 Item Detected:</h5>
                <button type="button" class="marv-edit-btn" id="editItemBtn" style="font-size: 12px; padding: 4px 10px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Edit
                </button>
            </div>
            <p id="itemDescDisplay" style="margin: 0; padding: 10px; background: white; border-radius: 8px; line-height: 1.5;">${validatedData.itemDescription || 'Unable to determine item'}</p>
            <textarea id="itemDescInput" class="marv-textarea" rows="2" style="display: none; margin-top: 8px;">${validatedData.itemDescription || 'Unable to determine item'}</textarea>
            <div id="itemDescActions" style="display: none; margin-top: 8px; gap: 8px;" class="marv-btn-group">
                <button type="button" class="marv-btn-secondary" id="cancelItemBtn" style="flex: 0; padding: 6px 12px; font-size: 13px;">Cancel</button>
                <button type="button" class="marv-btn-primary" id="saveItemBtn" style="flex: 0; padding: 6px 12px; font-size: 13px;">Save</button>
            </div>
        </div>
        
        <div class="marv-validation-section damage">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h5 style="margin: 0;">⚠️ Damage Detected:</h5>
                <button type="button" class="marv-edit-btn" id="editDamageBtn" style="font-size: 12px; padding: 4px 10px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Edit
                </button>
            </div>
            <p id="damageDescDisplay" style="margin: 0; padding: 10px; background: white; border-radius: 8px; line-height: 1.5;">${validatedData.damageDescription || 'Unable to determine damage'}</p>
            <textarea id="damageDescInput" class="marv-textarea" rows="3" style="display: none; margin-top: 8px;">${validatedData.damageDescription || 'Unable to determine damage'}</textarea>
            <div id="damageDescActions" style="display: none; margin-top: 8px; gap: 8px;" class="marv-btn-group">
                <button type="button" class="marv-btn-secondary" id="cancelDamageBtn" style="flex: 0; padding: 6px 12px; font-size: 13px;">Cancel</button>
                <button type="button" class="marv-btn-primary" id="saveDamageBtn" style="flex: 0; padding: 6px 12px; font-size: 13px;">Save</button>
            </div>
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

    setTimeout(() => {
        setupValidationEventListeners();
    }, 100);
}

function buildMaterialOptions(detectedMaterial) {
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
    const itemDescDisplay = document.getElementById('itemDescDisplay');
    const itemDescInput = document.getElementById('itemDescInput');
    const itemDescActions = document.getElementById('itemDescActions');
    const editItemBtn = document.getElementById('editItemBtn');
    const saveItemBtn = document.getElementById('saveItemBtn');
    const cancelItemBtn = document.getElementById('cancelItemBtn');
    
    const damageDescDisplay = document.getElementById('damageDescDisplay');
    const damageDescInput = document.getElementById('damageDescInput');
    const damageDescActions = document.getElementById('damageDescActions');
    const editDamageBtn = document.getElementById('editDamageBtn');
    const saveDamageBtn = document.getElementById('saveDamageBtn');
    const cancelDamageBtn = document.getElementById('cancelDamageBtn');
    
    const materialSelect = document.getElementById('materialSelect');
    const damageSelect = document.getElementById('damageSelect');
    const notesInput = document.getElementById('notesInput');
    const backBtn = document.getElementById('valBackBtn');
    const nextBtn = document.getElementById('valNextBtn');

    if (!backBtn || !nextBtn) {
        console.error('Validation buttons not found');
        return;
    }

    // Item Description Edit/Save/Cancel
    if (editItemBtn) {
        editItemBtn.addEventListener('click', () => {
            itemDescDisplay.style.display = 'none';
            itemDescInput.style.display = 'block';
            itemDescActions.style.display = 'flex';
            editItemBtn.style.display = 'none';
            itemDescInput.focus();
        });
    }

    if (saveItemBtn) {
        saveItemBtn.addEventListener('click', () => {
            const newValue = itemDescInput.value.trim();
            if (newValue) {
                itemDescDisplay.textContent = newValue;
                itemDescDisplay.style.display = 'block';
                itemDescInput.style.display = 'none';
                itemDescActions.style.display = 'none';
                editItemBtn.style.display = 'flex';
                updateValidatedData({ itemDescription: newValue });
            }
        });
    }

    if (cancelItemBtn) {
        cancelItemBtn.addEventListener('click', () => {
            itemDescInput.value = itemDescDisplay.textContent;
            itemDescDisplay.style.display = 'block';
            itemDescInput.style.display = 'none';
            itemDescActions.style.display = 'none';
            editItemBtn.style.display = 'flex';
        });
    }

    // Damage Description Edit/Save/Cancel
    if (editDamageBtn) {
        editDamageBtn.addEventListener('click', () => {
            damageDescDisplay.style.display = 'none';
            damageDescInput.style.display = 'block';
            damageDescActions.style.display = 'flex';
            editDamageBtn.style.display = 'none';
            damageDescInput.focus();
        });
    }

    if (saveDamageBtn) {
        saveDamageBtn.addEventListener('click', () => {
            const newValue = damageDescInput.value.trim();
            if (newValue) {
                damageDescDisplay.textContent = newValue;
                damageDescDisplay.style.display = 'block';
                damageDescInput.style.display = 'none';
                damageDescActions.style.display = 'none';
                editDamageBtn.style.display = 'flex';
                updateValidatedData({ damageDescription: newValue });
            }
        });
    }

    if (cancelDamageBtn) {
        cancelDamageBtn.addEventListener('click', () => {
            damageDescInput.value = damageDescDisplay.textContent;
            damageDescDisplay.style.display = 'block';
            damageDescInput.style.display = 'none';
            damageDescActions.style.display = 'none';
            editDamageBtn.style.display = 'flex';
        });
    }

    backBtn.addEventListener('click', () => showStep(3));
    
    nextBtn.addEventListener('click', async () => {
        const itemDesc = itemDescDisplay.style.display === 'none' 
            ? itemDescInput?.value.trim() 
            : itemDescDisplay?.textContent.trim();
            
        const damageDesc = damageDescDisplay.style.display === 'none'
            ? damageDescInput?.value.trim()
            : damageDescDisplay?.textContent.trim();
        
        updateValidatedData({
            itemDescription: itemDesc || validatedData.itemDescription,
            damageDescription: damageDesc || validatedData.damageDescription,
            surfaceMaterial: materialSelect?.value || validatedData.surfaceMaterial,
            damageType: damageSelect?.value || validatedData.damageType,
            additionalNotes: notesInput?.value.trim() || ''
        });
        
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
        
        showTypingIndicator();
        await new Promise(resolve => setTimeout(resolve, 800));
        hideTypingIndicator();
        
        await addBotMessage("Perfect! Let me do a complete repair analysis now... 🧠", 400);
        
        showAnalysisLoader('Analyzing repair feasibility...');
        
        try {
            const result = await callTriageAPI();
            hideTypingIndicator();
            
            if (!result || !result.ok) {
                throw new Error('Invalid response from triage API');
            }
            
            showTypingIndicator();
            await new Promise(resolve => setTimeout(resolve, 600));
            hideTypingIndicator();
            
            await addBotMessage("Analysis complete! Here are my findings: 📋", 300);
            showResultsWithData(result);
            
        } catch (error) {
            hideTypingIndicator();
            console.error('Triage error:', error);
            
            showTypingIndicator();
            await new Promise(resolve => setTimeout(resolve, 600));
            hideTypingIndicator();
            
            await addBotMessage("I'm having trouble completing the analysis. Please try again in a moment. 😕", 100);
            
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
