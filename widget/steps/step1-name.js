// Step 1: Name input
import { widgetContent, userData, updateUserData } from '../core/state.js';
import { showStep } from './step-router.js';

export function showNameStep() {
    widgetContent.innerHTML = `
        <div class="marv-step">
            <h2>What's your name?</h2>
            <input type="text" id="nameInput" class="marv-input" placeholder="Enter your name" value="${userData.name}">
            <button class="marv-btn" id="nameNextBtn">Next</button>
        </div>
    `;

    const input = document.getElementById('nameInput');
    const btn = document.getElementById('nameNextBtn');

    input.focus();
    
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
            updateUserData('name', input.value.trim());
            showStep(2);
        }
    });

    btn.addEventListener('click', () => {
        if (input.value.trim()) {
            updateUserData('name', input.value.trim());
            showStep(2);
        }
    });
}
