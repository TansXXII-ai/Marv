// Loading component
import { widgetContent } from '../core/state.js';

export function showLoading(message = 'Loading...') {
    widgetContent.innerHTML = `
        <div class="marv-loading">
            <div class="marv-spinner"></div>
            <p>${message}</p>
        </div>
    `;
}
