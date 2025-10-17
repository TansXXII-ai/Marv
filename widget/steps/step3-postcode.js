// Step 3: Postcode input
import { widgetContent, userData, updateUserData } from '../core/state.js';
import { showStep } from './step-router.js';

export function showPostcodeStep() {
    widgetContent.innerHTML = `
        <div class="marv-step">
            <h2>What's your postcode?</h2>
            <input type="text" id="postcodeInput" class="marv-input" placeholder="e.g. SW1A 1AA" value="${userData.postcode}">
            <div class="marv-btn-group">
                <button class="marv-btn-secondary" id="postcodeBackBtn">Back</button>
                <button class="marv-btn" id="postcodeNextBtn">Next</button>
            </div>
        </div>
    `;

    const input = document.getElementById('postcodeInput');
    const backBtn = document.getElementById('postcodeBackBtn');
    const nextBtn = document.getElementById('postcodeNextBtn');

    input.focus();

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
            updateUserData('postcode', input.value.trim());
            showStep(4);
        }
    });

    backBtn.addEventListener('click', () => showStep(2));
    
    nextBtn.addEventListener('click', () => {
        if (input.value.trim()) {
            updateUserData('postcode', input.value.trim());
            showStep(4);
        }
    });
}
