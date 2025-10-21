// Chat helper functions for conversational UI
import { widgetContent } from '../core/state.js';

let messageContainer = null;

export function initChatContainer() {
    widgetContent.innerHTML = '<div class="marv-chat-container" id="marvChatContainer"></div>';
    messageContainer = document.getElementById('marvChatContainer');
    return messageContainer;
}

export function addBotMessage(text, delay = 0) {
    if (!messageContainer) {
        initChatContainer();
    }
    
    return new Promise((resolve) => {
        setTimeout(() => {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'marv-message marv-message-bot';
            messageDiv.innerHTML = `
                <div class="marv-message-avatar">M</div>
                <div class="marv-message-bubble">
                    <p class="marv-message-text">${text}</p>
                </div>
            `;
            messageContainer.appendChild(messageDiv);
            scrollToBottom();
            resolve();
        }, delay);
    });
}

export function addUserMessage(text, delay = 0) {
    if (!messageContainer) {
        initChatContainer();
    }
    
    return new Promise((resolve) => {
        setTimeout(() => {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'marv-message marv-message-user';
            messageDiv.innerHTML = `
                <div class="marv-message-avatar">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </div>
                <div class="marv-message-bubble">
                    <p class="marv-message-text">${text}</p>
                </div>
            `;
            messageContainer.appendChild(messageDiv);
            scrollToBottom();
            resolve();
        }, delay);
    });
}

export function addBotMessageWithContent(content, delay = 0) {
    if (!messageContainer) {
        initChatContainer();
    }
    
    return new Promise((resolve) => {
        setTimeout(() => {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'marv-message marv-message-bot';
            messageDiv.innerHTML = `
                <div class="marv-message-avatar">M</div>
                <div class="marv-message-bubble" style="max-width: 90%;">
                    ${content}
                </div>
            `;
            messageContainer.appendChild(messageDiv);
            scrollToBottom();
            resolve();
        }, delay);
    });
}

export function addInputArea(inputHTML) {
    if (!messageContainer) {
        initChatContainer();
    }
    
    const inputDiv = document.createElement('div');
    inputDiv.className = 'marv-input-area';
    inputDiv.innerHTML = inputHTML;
    messageContainer.appendChild(inputDiv);
    scrollToBottom();
    
    return inputDiv;
}

export function showTypingIndicator() {
    if (!messageContainer) {
        initChatContainer();
    }
    
    const existingTyping = document.getElementById('marvTypingIndicator');
    if (existingTyping) return; // Don't add multiple typing indicators
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'marv-message marv-message-bot';
    typingDiv.id = 'marvTypingIndicator';
    typingDiv.innerHTML = `
        <div class="marv-message-avatar">M</div>
        <div class="marv-message-bubble">
            <div class="marv-typing">
                <div class="marv-typing-dot"></div>
                <div class="marv-typing-dot"></div>
                <div class="marv-typing-dot"></div>
            </div>
        </div>
    `;
    messageContainer.appendChild(typingDiv);
    scrollToBottom();
}

export function showAnalysisLoader(message = 'Analyzing...') {
    if (!messageContainer) {
        initChatContainer();
    }
    
    const existingLoader = document.getElementById('marvAnalysisLoader');
    if (existingLoader) existingLoader.remove();
    
    const loaderDiv = document.createElement('div');
    loaderDiv.className = 'marv-message marv-message-bot';
    loaderDiv.id = 'marvAnalysisLoader';
    loaderDiv.innerHTML = `
        <div class="marv-message-avatar">M</div>
        <div class="marv-message-bubble">
            <div class="marv-analysis-loader">
                <div class="marv-analysis-spinner">
                    <svg width="40" height="40" viewBox="0 0 50 50">
                        <circle class="marv-spinner-track" cx="25" cy="25" r="20" fill="none" stroke-width="4"></circle>
                        <circle class="marv-spinner-path" cx="25" cy="25" r="20" fill="none" stroke-width="4"></circle>
                    </svg>
                </div>
                <p class="marv-analysis-text">${message}</p>
                <div class="marv-analysis-progress">
                    <div class="marv-progress-bar"></div>
                </div>
            </div>
        </div>
    `;
    messageContainer.appendChild(loaderDiv);
    scrollToBottom();
}

export function hideTypingIndicator() {
    const typingDiv = document.getElementById('marvTypingIndicator');
    if (typingDiv) {
        typingDiv.remove();
    }
    
    const loaderDiv = document.getElementById('marvAnalysisLoader');
    if (loaderDiv) {
        loaderDiv.remove();
    }
}

export function clearChat() {
    if (messageContainer) {
        messageContainer.innerHTML = '';
    }
}

function scrollToBottom() {
    if (widgetContent) {
        widgetContent.scrollTop = widgetContent.scrollHeight;
    }
}

export function removeLastInputArea() {
    const inputAreas = messageContainer.querySelectorAll('.marv-input-area');
    if (inputAreas.length > 0) {
        inputAreas[inputAreas.length - 1].remove();
    }
}
