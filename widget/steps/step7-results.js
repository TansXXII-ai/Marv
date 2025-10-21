// Step 7: Results display - Chat style (Fixed to remove AI Summary Edit)
import { validatedData, resetState, widgetContainer } from '../core/state.js';
import { getDecisionColor, getDecisionLabel } from '../utils/helpers.js';
import { parseAIResponse } from '../parsers/ai-response.js';
import { showStep } from './step-router.js';
import { addBotMessageWithContent } from '../utils/chat-helpers.js';

export async function showResultsWithData(triageResponse) {
    // Parse the result_text from the API response
    const resultText = triageResponse.result_text || triageResponse.result || '';
    const parsed = parseAIResponse(resultText);
    const color = getDecisionColor(parsed.decision);
    
    const resultsContent = `
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

        <div class="marv-info-card" style="margin-top: 12px;">
            <button type="button" class="marv-accordion-btn" id="toggleDetailsBtn">
                <span>Assessment Details</span>
                <svg class="marv-accordion-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </button>
            <div class="marv-accordion-content" id="detailsContent" style="display: none;">
                <div class="marv-detail-row">
                    <span class="marv-detail-label">Item:</span>
                    <span class="marv-detail-value">${validatedData.itemDescription || 'Not specified'}</span>
                </div>
                <div class="marv-detail-row">
                    <span class="marv-detail-label">Damage:</span>
                    <span class="marv-detail-value">${validatedData.damageDescription || 'Not specified'}</span>
                </div>
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
            <button type="button" class="marv-btn-primary" id="submitToMagicmanBtn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                    <path d="M22 2L11 13"></path>
                    <path d="M22 2l-7 20-4-9-9-4 20-7z"></path>
                </svg>
                Submit to Magicman
            </button>
            <button type="button" class="marv-btn-secondary" id="termsBtn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                Terms & Conditions
            </button>
            <button type="button" class="marv-btn-secondary" id="startOverBtn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                    <polyline points="1 4 1 10 7 10"></polyline>
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
                Start Over
            </button>
            <button type="button" class="marv-btn-secondary" id="closeBtn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                Close
            </button>
        </div>

        <details class="marv-debug-details">
            <summary>Raw AI Response (Debug)</summary>
            <pre class="marv-debug-pre">${resultText}</pre>
        </details>
    `;
    
    await addBotMessageWithContent(resultsContent, 0);
    
    // Wait for DOM to be ready
    setTimeout(() => {
        setupResultsEventListeners();
    }, 100);
}

function setupResultsEventListeners() {
    const toggleBtn = document.getElementById('toggleDetailsBtn');
    const detailsContent = document.getElementById('detailsContent');
    const accordionIcon = toggleBtn?.querySelector('.marv-accordion-icon');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const isHidden = detailsContent.style.display === 'none';
            detailsContent.style.display = isHidden ? 'block' : 'none';
            if (accordionIcon) {
                accordionIcon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
            }
        });
    }

    // Submit to Magicman button
    const submitBtn = document.getElementById('submitToMagicmanBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            // TODO: Implement submission logic
            alert('Submission feature coming soon! Your assessment will be sent to Magicman for processing.');
            console.log('Submit to Magicman clicked - implement submission logic here');
        });
    }

    // Terms & Conditions button
    const termsBtn = document.getElementById('termsBtn');
    if (termsBtn) {
        termsBtn.addEventListener('click', () => {
            // TODO: Link to actual terms and conditions page
            window.open('https://www.magicman.co.uk/terms-conditions', '_blank');
        });
    }

    // Start Over button
    const startOverBtn = document.getElementById('startOverBtn');
    if (startOverBtn) {
        startOverBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to start over? All current data will be lost.')) {
                resetState();
                showStep(1);
            }
        });
    }

    // Close button
    const closeBtn = document.getElementById('closeBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to close? All current data will be cleared.')) {
                resetState();
                widgetContainer.style.display = 'none';
            }
        });
    }
}
