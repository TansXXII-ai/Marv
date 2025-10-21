// Step 6: Customer details collection
import { userData, updateUserData, validatedData } from '../core/state.js';
import { validateEmail } from '../utils/validators.js';
import { showStep } from './step-router.js';
import { addBotMessage, addBotMessageWithContent, addInputArea, removeLastInputArea, showTypingIndicator, hideTypingIndicator } from '../utils/chat-helpers.js';

export async function showCustomerDetailsStep() {
    showTypingIndicator();
    await new Promise(resolve => setTimeout(resolve, 800));
    hideTypingIndicator();
    
    await addBotMessage("Great! To complete your booking, I need a few more details.", 300);
    
    showTypingIndicator();
    await new Promise(resolve => setTimeout(resolve, 600));
    hideTypingIndicator();
    
    await addBotMessage("Please fill in your contact information below:", 600);
    
    const formContent = `
        <div class="marv-customer-form">
            <div class="marv-form-group">
                <label for="fullNameInput">Full Name *</label>
                <input type="text" id="fullNameInput" class="marv-input" placeholder="John Smith" value="${userData.fullName || userData.name || ''}" required>
            </div>
            
            <div class="marv-form-group">
                <label for="addressInput">Address *</label>
                <textarea id="addressInput" class="marv-textarea" rows="2" placeholder="123 High Street" required>${userData.address || ''}</textarea>
            </div>
            
            <div class="marv-form-group">
                <label for="postcodeInput">Postcode *</label>
                <input type="text" id="postcodeInput" class="marv-input" placeholder="SW1A 1AA" value="${userData.postcode || ''}" required>
            </div>
            
            <div class="marv-form-group">
                <label for="phoneInput">Contact Telephone Number *</label>
                <input type="tel" id="phoneInput" class="marv-input" placeholder="07123 456789" value="${userData.phone || ''}" required>
            </div>
            
            <div class="marv-form-group">
                <label for="emailInput">Email Address *</label>
                <input type="email" id="emailInput" class="marv-input" placeholder="john@example.com" value="${userData.email || ''}" required>
            </div>
            
            <div class="marv-form-group">
                <label for="timingSelect">When do you need this fixed? *</label>
                <select id="timingSelect" class="marv-select" required>
                    <option value="">Please select...</option>
                    <option value="next_5_days">Next 5 working days</option>
                    <option value="next_2_weeks">In the next 2 weeks</option>
                    <option value="next_month">In the next month</option>
                    <option value="flexible">Completely flexible</option>
                </select>
            </div>
            
            <div class="marv-form-group" style="margin-top: 16px;">
                <label class="marv-checkbox-label">
                    <input type="checkbox" id="termsCheckbox" required>
                    <span>I accept the <button type="button" id="termsLinkBtn" class="marv-terms-link">Terms & Conditions</button> *</span>
                </label>
            </div>
            
            <div class="marv-btn-group" style="margin-top: 20px;">
                <button type="button" class="marv-btn-secondary" id="backToResultsBtn">Back</button>
                <button type="button" class="marv-btn-primary" id="submitBookingBtn">Submit Booking</button>
            </div>
        </div>
    `;
    
    await addBotMessageWithContent(formContent, 900);
    
    setTimeout(() => {
        setupCustomerDetailsEventListeners();
    }, 100);
}

function setupCustomerDetailsEventListeners() {
    const fullNameInput = document.getElementById('fullNameInput');
    const addressInput = document.getElementById('addressInput');
    const postcodeInput = document.getElementById('postcodeInput');
    const phoneInput = document.getElementById('phoneInput');
    const emailInput = document.getElementById('emailInput');
    const timingSelect = document.getElementById('timingSelect');
    const termsCheckbox = document.getElementById('termsCheckbox');
    const termsLinkBtn = document.getElementById('termsLinkBtn');
    const backBtn = document.getElementById('backToResultsBtn');
    const submitBtn = document.getElementById('submitBookingBtn');

    if (termsLinkBtn) {
        termsLinkBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.open('https://www.magicman.co.uk/terms-conditions', '_blank');
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showStep(5); // Back to results
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            // Validate all required fields
            const fullName = fullNameInput?.value.trim();
            const address = addressInput?.value.trim();
            const postcode = postcodeInput?.value.trim();
            const phone = phoneInput?.value.trim();
            const email = emailInput?.value.trim();
            const timing = timingSelect?.value;
            const termsAccepted = termsCheckbox?.checked;

            if (!fullName) {
                alert('Please enter your full name');
                fullNameInput?.focus();
                return;
            }

            if (!address) {
                alert('Please enter your address');
                addressInput?.focus();
                return;
            }

            if (!postcode) {
                alert('Please enter your postcode');
                postcodeInput?.focus();
                return;
            }

            if (!phone) {
                alert('Please enter your contact telephone number');
                phoneInput?.focus();
                return;
            }

            if (!email || !validateEmail(email)) {
                alert('Please enter a valid email address');
                emailInput?.focus();
                return;
            }

            if (!timing) {
                alert('Please select when you need the repair');
                timingSelect?.focus();
                return;
            }

            if (!termsAccepted) {
                alert('Please accept the Terms & Conditions to proceed');
                return;
            }

            // Save customer details
            updateUserData('fullName', fullName);
            updateUserData('address', address);
            updateUserData('postcode', postcode);
            updateUserData('phone', phone);
            updateUserData('email', email);
            updateUserData('timing', timing);

            // Disable button to prevent double submission
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';

            removeLastInputArea();

            showTypingIndicator();
            await new Promise(resolve => setTimeout(resolve, 1000));
            hideTypingIndicator();

            await addBotMessage("Perfect! Your booking request has been received. 🎉", 300);

            showTypingIndicator();
            await new Promise(resolve => setTimeout(resolve, 800));
            hideTypingIndicator();

            await addBotMessage("A Magicman technician will contact you shortly to confirm the appointment.", 600);

            // Show final confirmation step
            showStep(7);
        });
    }
}
