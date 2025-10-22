// Step 5: Results display - Condensed with pricing
import { validatedData, resetState, widgetContainer } from '../core/state.js';
import { getDecisionColor, getDecisionLabel } from '../utils/helpers.js';
import { getJobDuration, getPrice } from '../../shared/config.js';
import { parseAIResponse } from '../parsers/ai-response.js';
import { showStep } from './step-router.js';
import { addBotMessage, addBotMessageWithContent, showTypingIndicator, hideTypingIndicator } from '../utils/chat-helpers.js';

export async function showResultsWithData(triageResponse) {
    const resultText = triageResponse.result_text || triageResponse.result || '';
    const parsed = parseAIResponse(resultText);
    const color = getDecisionColor(parsed.decision);
    const jobDuration = getJobDuration(parsed.decision, parsed.confidence);
    const price = getPrice(jobDuration);
    
    // Condense reasons to max 3 most important points
    const condensedReasons = parsed.reasons.slice(0, 3);
    
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
                
                ${price ? `
                    <div class="marv-price-estimate">
                        <div class="marv-price-label">Estimated Price:</div>
                        <div class="marv-price-value">£${price}</div>
                        <div class="marv-price-note">${jobDuration === 'HALF_DAY' ? 'Half day job' : 'Full day job'}</div>
                    </div>
                ` : ''}
                
                ${condensedReasons.length > 0 ? `
                    <div class="marv-reasons">
                        <h4>Key Points:</h4>
                        <ul>
                            ${condensedReasons.map(reason => `<li>${reason}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        </div>

        <div class="marv-results-actions">
            <button type="button" class="marv-btn-primary" id="proceedBtn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                    <path d="M5 12h14"></path>
                    <path d="M12 5l7 7-7 7"></path>
                </svg>
                ${price ? 'Proceed with Booking' : 'Request Technical Review'}
            </button>
            <button type="button" class="marv-btn-secondary" id="viewDetailsBtn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                View Full Details
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

        <div class="marv-info-card" id="fullDetailsCard" style="margin-top: 12px; display: none;">
            <div class="marv-accordion-content" style="display: block; border: none; background: white; padding: 16px;">
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
                ${parsed.reasons.length > 3 ? `
                    <div class="marv-detail-row" style="border-top: 2px solid #e5e7eb; margin-top: 12px; padding-top: 12px;">
                        <span class="marv-detail-label">Full Analysis:</span>
                        <span class="marv-detail-value">
                            <ul style="margin: 0; padding-left: 18px;">
                                ${parsed.reasons.map(r => `<li style="margin-bottom: 6px;">${r}</li>`).join('')}
                            </ul>
                        </span>
                    </div>
                ` : ''}
            </div>
        </div>

        <details class="marv-debug-details">
            <summary>Raw AI Response (Debug)</summary>
            <pre class="marv-debug-pre">${resultText}</pre>
        </details>
    `;
    
    await addBotMessageWithContent(resultsContent, 0);
    
    setTimeout(() => {
        setupResultsEventListeners();
    }, 100);
}

function setupResultsEventListeners() {
    const proceedBtn = document.getElementById('proceedBtn');
    const viewDetailsBtn = document.getElementById('viewDetailsBtn');
    const fullDetailsCard = document.getElementById('fullDetailsCard');
    const startOverBtn = document.getElementById('startOverBtn');
    const closeBtn = document.getElementById('closeBtn');

    if (proceedBtn) {
        proceedBtn.addEventListener('click', () => {
            showStep(6); // Go to customer details form
        });
    }

    if (viewDetailsBtn) {
        viewDetailsBtn.addEventListener('click', () => {
            if (fullDetailsCard.style.display === 'none') {
                fullDetailsCard.style.display = 'block';
                viewDetailsBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                        <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                    Hide Details
                `;
            } else {
                fullDetailsCard.style.display = 'none';
                viewDetailsBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    View Full Details
                `;
            }
        });
    }

    if (startOverBtn) {
        startOverBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to start over? All current data will be lost.')) {
                resetState();
                showStep(1);
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to close? All current data will be cleared.')) {
                resetState();
                widgetContainer.style.display = 'none';
            }
        });
    }
}
