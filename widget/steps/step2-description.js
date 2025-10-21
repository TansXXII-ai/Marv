// Step 2: Description input - Chat style
import { userData, updateUserData } from '../core/state.js';
import { showStep } from './step-router.js';
import { addBotMessage, addUserMessage, addInputArea, removeLastInputArea, showTypingIndicator, hideTypingIndicator } from '../utils/chat-helpers.js';

export async function showDescriptionStep() {
    showTypingIndicator();
    await new Promise(resolve => setTimeout(resolve, 1000));
    hideTypingIndicator();
    
    await addBotMessage(`Perfect, ${userData.name}! Now, can you describe the damage?`, 300);
    
    showTypingIndicator();
    await new Promise(resolve => setTimeout(resolve, 800));
    hideTypingIndicator();
    
    await addBotMessage("Tell me what happened and what you can see. The more detail, the better! 🔍", 300);
    
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
            showStep(3);
        }
    };

    backBtn.addEventListener('click', () => showStep(1));
    nextBtn.addEventListener('click', handleSubmit);
}
