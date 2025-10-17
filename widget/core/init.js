// Widget initialization
import { setDOMReferences } from './state.js';
import { showStep } from '../steps/step-router.js';

export function initWidget() {
    const widgetContainer = document.getElementById('marv-widget');
    if (!widgetContainer) {
        console.error('MARV Widget: Container element not found');
        return;
    }

    widgetContainer.innerHTML = `
        <div class="marv-widget-container">
            <div class="marv-widget-header">
                <div class="marv-logo">
                    <div class="marv-status-dot"></div>
                    <span>Marv • Magicman AI</span>
                </div>
                <button class="marv-close-btn" id="marvCloseBtn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="marv-widget-content" id="marvContent"></div>
        </div>
    `;

    const header = widgetContainer.querySelector('.marv-widget-header');
    const content = document.getElementById('marvContent');

    setDOMReferences(widgetContainer, content, header);

    // Close button
    document.getElementById('marvCloseBtn').addEventListener('click', () => {
        widgetContainer.style.display = 'none';
    });

    // Show first step
    showStep(1);
}
