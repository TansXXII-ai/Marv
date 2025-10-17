// Step 4: Description input - Chat style
import { userData, updateUserData } from '../core/state.js';
import { showStep } from './step-router.js';
import { addBotMessage, addUserMessage, addInputArea, removeLastInputArea } from '../utils/chat-helpers.js';

export async function showDescriptionStep() {
    await addBotMessage("Perfect! Now, can you describe the damage?", 300);
    await addBotMessage("Tell me what happened and what you can see. The more detail, the better! 🔍", 600);
    
    const inputArea = addInputArea(`
        <textarea id="descriptionInput" class="marv-textarea" placeholder="e.g., There's a 10cm scratch on my white bathtub..." rows="4" autofocus>${userData.description}</textarea>
        <div class="marv-btn-group">
            <button class="marv-btn-secondary" id="descBackBtn">Back</button>
            <button class="marv-btn" id="descNextBtn">Send</button>
        </div>
    `);

    const input = inputArea.querySelector('#descriptionInput');
    const backBtn = inputArea.querySelector('#descBackBtn');
    const nextBtn = inputArea.querySelector('#descNextBtn');

    input.focus();

    const handleSubmit = async () => {
        const description = input.value.trim();
        if (description) {
            updateUserData('description', description);
            removeLastInputArea();
            await addUserMessage(description, 100);
            showStep(5);
        }
    };

    backBtn.addEventListener('click', () => showStep(3));
    nextBtn.addEventListener('click', handleSubmit);
}
