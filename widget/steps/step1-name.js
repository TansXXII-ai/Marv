// Step 1: Name input - Chat style
import { userData, updateUserData } from '../core/state.js';
import { showStep } from './step-router.js';
import { initChatContainer, addBotMessage, addUserMessage, addInputArea, removeLastInputArea } from '../utils/chat-helpers.js';

export async function showNameStep() {
    initChatContainer();
    
    await addBotMessage("👋 Hi! I'm Marv, your AI assistant from Magicman.", 300);
    await addBotMessage("I'm here to help assess damage and provide repair recommendations.", 600);
    await addBotMessage("Let's get started! What's your name?", 900);
    
    const inputArea = addInputArea(`
        <input type="text" id="nameInput" class="marv-input" placeholder="Enter your name" value="${userData.name}" autofocus>
        <div class="marv-btn-group">
            <button class="marv-btn" id="nameNextBtn">Send</button>
        </div>
    `);

    const input = inputArea.querySelector('#nameInput');
    const btn = inputArea.querySelector('#nameNextBtn');

    input.focus();
    
    const handleSubmit = async () => {
        const name = input.value.trim();
        if (name) {
            updateUserData('name', name);
            removeLastInputArea();
            await addUserMessage(name, 100);
            showStep(2);
        }
    };
    
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSubmit();
    });

    btn.addEventListener('click', handleSubmit);
}
