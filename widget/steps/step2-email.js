// Step 2: Email input
import { widgetContent, userData, updateUserData } from '../core/state.js';
import { validateEmail } from '../utils/validators.js';
import { showStep } from './step-router.js';

export function showEmailStep() {
    widgetContent.innerHTML = `
        <div class="marv-step">
            <h2>What's your email?</h2>
            <input type="email" id="emailInput" class="marv-input" placeholder="your@email.com" value="${userData.email}">
            <div class="marv-btn-group">
                <button class="marv-btn-secondary" id="emailBackBtn">Back</button>
                <button class="marv-btn" id="emailNextBtn">Next</button>
            </div>
        </div>
    `;

    const input = document.getElementById('emailInput');
    const backBtn = document.getElementById('emailBackBtn');
    const nextBtn = document.getElementById('emailNextBtn');

    input.focus();

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && validateEmail(input.value)) {
            updateUserData('email', input.value.trim());
            showStep(3);
        }
    });

    backBtn.addEventListener('click', () => showStep(1));
    
    nextBtn.addEventListener('click', () => {
        if (validateEmail(input.value)) {
            updateUserData('email', input.value.trim());
            showStep(3);
        } else {
            alert('Please enter a valid email address');
        }
    });
}
