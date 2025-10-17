// Step 7: Results display
import { widgetContent, validatedData, resetState } from '../core/state.js';
import { getDecisionColor, getDecisionLabel } from '../utils/helpers.js';
import { parseAIResponse } from '../parsers/ai-response.js';
import { showStep } from './step-router.js';

export function showResultsWithData(triageResponse) {
    const parsed = parseAIResponse(triageResponse.result);
    const color = getDecisionColor(parsed.decision);
    
    widgetContent.innerHTML = `
        <div class="marv-results-container">
            <div class="marv-decision-card" style="border-color: ${color};">
                <div class="marv-decision-header" style="background-color: ${color};">
                    <h3>${getDecisionLabel(parsed.decision)}</h3>
                </div>
                <div class="marv-decision-body">
                    <div class="marv-confidence">
                        <span class="marv-confidence-label">Confidence:</span>
                        <div class="marv-confidence-bar">
                            <div class="marv-confidence-fill" style="width: ${parsed.confidence * 100}%; background-color: ${color};"></div>
                        </div>
                        <span class="marv-confidence-value">${(parsed.confidence * 100).toFixed(0)}%</span>
                    </div>
                    
                    ${parsed.reasons.length > 0 ? `
                        <div class="marv-reasons">
                            <h4>Analysis:</h4>
                            <ul>
                                ${parsed.reasons.map(reason => `<li>${reason}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>

            <div class="marv-summary-card">
                <div class="marv-summary-header">
                    <h4>AI Summary</h4>
                    <button type="button" class="marv-edit-btn" id="editSummaryBtn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                    </button>
                </div>
                <div class="marv-summary-content">
                    <div id="summaryDisplay" class="marv-summary-display">
                        ${validatedData.aiSummary || 'No summary available'}
                    </div>
                    <div id="summaryEdit" class="marv-summary-edit" style="display: none;">
                        <textarea 
                            id="summaryTextarea" 
                            class="marv-summary-textarea"
                            rows="4"
                        >${validatedData.aiSummary || ''}</textarea>
                        <div class="marv-summary-actions">
                            <button type="button" class="marv-btn-secondary" id="cancelEditBtn">Cancel</button>
                            <button type="button" class="marv-btn-primary" id="saveEditBtn">Save</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="marv-info-card">
                <button type="button" class="marv-accordion-btn" id="toggleDetailsBtn">
                    <span>Additional Information</span>
                    <svg class="marv-accordion-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>
                <div class="marv-accordion-content" id="detailsContent" style="display: none;">
                    <div class="marv-detail-row">
                        <span class="marv-detail-label">Surface Material:</span>
                        <span class="marv-detail-value">${validatedData.surfaceMaterial || 'Unknown'}</span>
                    </div>
                    <div class="marv-detail-row">
                        <span class="marv-detail-label">Damage Type:</span>
                        <span class="marv-detail-value">${validatedData.damageType || 'Unknown'}</span>
                    </div>
                    ${validatedData.additionalNotes ? `
                        <div class="marv-detail-row">
                            <span class="marv-detail-label">Additional Notes:</span>
                            <span class="marv-detail-value">${validatedData.additionalNotes}</span>
                        </div>
                    ` : ''}
                    <div class="marv-detail-row">
                        <span class="marv-detail-label">Images Submitted:</span>
                        <span class="marv-detail-value">${validatedData.imageCount || 0}</span>
                    </div>
                </div>
            </div>

            <div class="marv-results-actions">
                <button type="button" class="marv-btn-secondary" id="startOverBtn">Start Over</button>
                <button type="button" class="marv-btn-primary" id="contactUsBtn">Contact Us</button>
            </div>

            <details class="marv-debug-details">
                <summary>Raw AI Response (Debug)</summary>
                <pre class="marv-debug-pre">${triageResponse.result}</pre>
            </details>
        </div>
    `;

    setupResultsEventListeners();
}

function setupResultsEventListeners() {
    const editBtn = document.getElementById('editSummaryBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');
    const saveBtn = document.getElementById('saveEditBtn');
    const summaryDisplay = document.getElementById('summaryDisplay');
    const summaryEdit = document.getElementById('summaryEdit');
    const summaryTextarea = document.getElementById('summaryTextarea');

    editBtn.addEventListener('click', () => {
        summaryDisplay.style.display = 'none';
        summaryEdit.style.display = 'block';
        summaryTextarea.focus();
    });

    cancelBtn.addEventListener('click', () => {
        summaryTextarea.value = validatedData.aiSummary || '';
        summaryDisplay.style.display = 'block';
        summaryEdit.style.display = 'none';
    });

    saveBtn.addEventListener('click', () => {
        const newSummary = summaryTextarea.value.trim();
        if (newSummary) {
            const originalSummary = validatedData.aiSummary;
            validatedData.aiSummary = newSummary;
            summaryDisplay.textContent = newSummary;
            summaryDisplay.style.display = 'block';
            summaryEdit.style.display = 'none';
            
            console.log('User corrected summary:', {
                original: originalSummary,
                corrected: newSummary,
                timestamp: new Date().toISOString()
            });
        }
    });

    const toggleBtn = document.getElementById('toggleDetailsBtn');
    const detailsContent = document.getElementById('detailsContent');
    const accordionIcon = toggleBtn.querySelector('.marv-accordion-icon');

    toggleBtn.addEventListener('click', () => {
        const isHidden = detailsContent.style.display === 'none';
        detailsContent.style.display = isHidden ? 'block' : 'none';
        accordionIcon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    });

    document.getElementById('startOverBtn').addEventListener('click', () => {
        resetState();
        showStep(1);
    });

    document.getElementById('contactUsBtn').addEventListener('click', () => {
        window.open('https://magicman.co.uk/contact', '_blank');
    });
}
