// Step 2: Email input - Chat style
import { userData, updateUserData } from '../core/state.js';
import { validateEmail } from '../utils/validators.js';
import { showStep } from './step-router.js';
import { addBotMessage, addUserMessage, addInputArea, removeLastInputArea } from '../utils/chat-helpers.js';

export async function showEmailStep() {
    await addBotMessage(`Nice to meet you, ${userData.name}! 😊`, 300);
    await addBotMessage("What's your email address?", 600);
    
    const inputArea = addInputArea(`
        <input type="email" id="emailInput" class="marv-input" placeholder="your@email.com" value="${userData.email}" autofocus>
        <div class="marv-btn-group">
            <button class="marv-btn-secondary" id="emailBackBtn">Back</button>
            <button class="marv-btn" id="emailNextBtn">Send</button>
        </div>
    `);

    const input = inputArea.querySelector('#emailInput');
    const backBtn = inputArea.querySelector('#emailBackBtn');
    const nextBtn = inputArea.querySelector('#emailNextBtn');

    input.focus();

    const handleSubmit = async () => {
        const email = input.value.trim();
        if (validateEmail(email)) {
            updateUserData('email', email);
            removeLastInputArea();
            await addUserMessage(email, 100);
            showStep(3);
        } else {
            await addBotMessage("Hmm, that doesn't look like a valid email address. Please try again! 📧", 100);
        }
    };

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSubmit();
    });

    backBtn.addEventListener('click', () => showStep(1));
    nextBtn.addEventListener('click', handleSubmit);
}
