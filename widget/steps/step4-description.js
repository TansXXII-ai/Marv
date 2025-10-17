// Step 4: Description input
import { widgetContent, userData, updateUserData } from '../core/state.js';
import { showStep } from './step-router.js';

export function showDescriptionStep() {
    widgetContent.innerHTML = `
        <div class="marv-step">
            <h2>Describe the damage</h2>
            <textarea id="descriptionInput" class="marv-textarea" placeholder="Tell us what happened..." rows="5">${userData.description}</textarea>
            <div class="marv-btn-group">
                <button class="marv-btn-secondary" id="descBackBtn">Back</button>
                <button class="marv-btn" id="descNextBtn">Next</button>
            </div>
        </div>
    `;

    const input = document.getElementById('descriptionInput');
    const backBtn = document.getElementById('descBackBtn');
    const nextBtn = document.getElementById('descNextBtn');

    input.focus();

    backBtn.addEventListener('click', () => showStep(3));
    
    nextBtn.addEventListener('click', () => {
        if (input.value.trim()) {
            updateUserData('description', input.value.trim());
            showStep(5);
        }
    });
}
