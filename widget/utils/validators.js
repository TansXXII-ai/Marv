// Validation functions
import { CONFIG } from '../core/config.js';

export function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateFile(file) {
    const errors = [];
    
    if (file.size > CONFIG.MAX_FILE_SIZE) {
        errors.push(`${file.name} is too large. Maximum size is 10MB`);
    }
    
    if (!file.type.startsWith('image/')) {
        errors.push(`${file.name} is not an image`);
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

export function validateImageCount(currentCount) {
    return currentCount < CONFIG.MAX_IMAGES;
}
