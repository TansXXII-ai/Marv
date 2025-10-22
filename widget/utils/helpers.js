// Helper functions
import { DECISION_COLORS, DECISION_LABELS } from '../../shared/config.js';

export function getDecisionColor(decision) {
    return DECISION_COLORS[decision] || DECISION_COLORS.DEFAULT;
}

export function getDecisionLabel(decision) {
    return DECISION_LABELS[decision] || decision;
}

export function dataURItoBlob(dataURI) {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
}

export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
