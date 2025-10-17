// API communication
import { CONFIG } from '../core/config.js';
import { userData, validatedData } from '../core/state.js';
import { dataURItoBlob } from './helpers.js';

export async function callValidateAPI() {
    const formData = new FormData();
    formData.append('description', userData.description);
    
    userData.images.forEach((img) => {
        const blob = dataURItoBlob(img.data);
        formData.append('images', blob, img.name);
    });

    const response = await fetch(`${CONFIG.API_BASE_URL}/validate`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error(`Validation failed: ${response.statusText}`);
    }

    return await response.json();
}

export async function callTriageAPI() {
    const formData = new FormData();
    formData.append('name', userData.name);
    formData.append('email', userData.email);
    formData.append('postcode', userData.postcode);
    formData.append('description', userData.description);
    formData.append('material', validatedData.surfaceMaterial);
    formData.append('damageType', validatedData.damageType);
    formData.append('notes', validatedData.additionalNotes);
    formData.append('aiSummary', validatedData.aiSummary);
    
    userData.images.forEach((img) => {
        const blob = dataURItoBlob(img.data);
        formData.append('images', blob, img.name);
    });

    const response = await fetch(`${CONFIG.API_BASE_URL}/triage`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error(`Triage failed: ${response.statusText}`);
    }

    return await response.json();
}
