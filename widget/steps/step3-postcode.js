// Step 3: Postcode input - Chat style
import { userData, updateUserData } from '../core/state.js';
import { showStep } from './step-router.js';
import { addBotMessage, addUserMessage, addInputArea, removeLastInputArea } from '../utils/chat-helpers.js';

export async function showPostcodeStep() {
    await addBotMessage("Great! Now, what's your postcode?", 300);
    await addBotMessage("This helps us connect you with the nearest Magicman technician.", 600);
    
    const inputArea = addInputArea(`
        <input type="text" id="postcodeInput" class="marv-input" placeholder="e.g. SW1A 1AA" value="${userData.postcode}" autofocus>
        <div class="marv-btn-group">
            <button class="marv-btn-secondary" id="postcodeBackBtn">Back</button>
            <button class="marv-btn" id="postcodeNextBtn">Send</button>
        </div>
    `);

    const input = inputArea.querySelector('#postcodeInput');
    const backBtn = inputArea.querySelector('#postcodeBackBtn');
    const nextBtn = inputArea.querySelector('#postcodeNextBtn');

    input.focus();

    const handleSubmit = async () => {
        const postcode = input.value.trim();
        if (postcode) {
            updateUserData('postcode', postcode);
            removeLastInputArea();
            await addUserMessage(postcode, 100);
            showStep(4);
        }
    };

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSubmit();
    });

    backBtn.addEventListener('click', () => showStep(2));
    nextBtn.addEventListener('click', handleSubmit);
}
