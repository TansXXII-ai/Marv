// Step 7: Final confirmation page
import { userData, resetState, widgetContainer } from '../core/state.js';
import { addBotMessageWithContent } from '../utils/chat-helpers.js';
import { showStep } from './step-router.js';

export async function showConfirmationStep() {
    const timingLabels = {
        'next_5_days': 'Next 5 working days',
        'next_2_weeks': 'In the next 2 weeks',
        'next_month': 'In the next month',
        'flexible': 'Completely flexible'
    };

    const confirmationContent = `
        <div class="marv-confirmation-card">
            <div class="marv-confirmation-header">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #10b981;">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <h2 style="margin: 16px 0 8px 0; color: #1f2937; font-size: 24px;">Booking Submitted!</h2>
                <p style="margin: 0; color: #6b7280; font-size: 15px;">Reference: MRV-${Date.now().toString().slice(-8)}</p>
            </div>
            
            <div class="marv-confirmation-body">
                <div class="marv-confirmation-section">
                    <h4>📋 Booking Summary</h4>
                    <div class="marv-detail-row">
                        <span class="marv-detail-label">Name:</span>
                        <span class="marv-detail-value">${userData.fullName || userData.name}</span>
                    </div>
                    <div class="marv-detail-row">
                        <span class="marv-detail-label">Address:</span>
                        <span class="marv-detail-value">${userData.address}</span>
                    </div>
                    <div class="marv-detail-row">
                        <span class="marv-detail-label">Postcode:</span>
                        <span class="marv-detail-value">${userData.postcode}</span>
                    </div>
                    <div class="marv-detail-row">
                        <span class="marv-detail-label">Phone:</span>
                        <span class="marv-detail-value">${userData.phone}</span>
                    </div>
                    <div class="marv-detail-row">
                        <span class="marv-detail-label">Email:</span>
                        <span class="marv-detail-value">${userData.email}</span>
                    </div>
                    <div class="marv-detail-row">
                        <span class="marv-detail-label">Timing:</span>
                        <span class="marv-detail-value">${timingLabels[userData.timing] || userData.timing}</span>
                    </div>
                </div>
                
                <div class="marv-confirmation-section">
                    <h4>📧 What Happens Next?</h4>
                    <ol style="margin: 0; padding-left: 20px; color: #4b5563; line-height: 1.8;">
                        <li>You'll receive a confirmation email shortly</li>
                        <li>A Magicman technician will contact you within 24 hours</li>
                        <li>We'll schedule a convenient appointment time</li>
                        <li>Our expert will arrive and complete the repair</li>
                    </ol>
                </div>
                
                <div class="marv-confirmation-actions">
                    <button type="button" class="marv-btn-secondary" id="newAssessmentBtn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                            <polyline points="1 4 1 10 7 10"></polyline>
                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                        </svg>
                        New Assessment
                    </button>
                    <button type="button" class="marv-btn-secondary" id="closeWidgetBtn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;

    await addBotMessageWithContent(confirmationContent, 300);

    setTimeout(() => {
        setupConfirmationEventListeners();
    }, 100);
}

function setupConfirmationEventListeners() {
    const newAssessmentBtn = document.getElementById('newAssessmentBtn');
    const closeWidgetBtn = document.getElementById('closeWidgetBtn');

    if (newAssessmentBtn) {
        newAssessmentBtn.addEventListener('click', () => {
            resetState();
            showStep(1);
        });
    }

    if (closeWidgetBtn) {
        closeWidgetBtn.addEventListener('click', () => {
            resetState();
            widgetContainer.style.display = 'none';
        });
    }
}
