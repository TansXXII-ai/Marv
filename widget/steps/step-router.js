// Step router - Updated for new 7-step flow
import { setCurrentStep } from '../core/state.js';
import { showNameStep } from './step1-name.js';
import { showDescriptionStep } from './step2-description.js';
import { showImageUploadStep } from './step3-images.js';
import { showValidationStep } from './step4-validation.js';
import { showResultsWithData } from './step5-results.js';
import { showCustomerDetailsStep } from './step6-customer-details.js';
import { showConfirmationStep } from './step7-confirmation.js';

export function showStep(step) {
    setCurrentStep(step);
    
    switch(step) {
        case 1: showNameStep(); break;           // Name only
        case 2: showDescriptionStep(); break;    // Damage description
        case 3: showImageUploadStep(); break;    // Photos with guidance
        case 4: showValidationStep(); break;     // AI validation confirmation
        case 5: showResultsWithData(); break;    // Results with pricing
        case 6: showCustomerDetailsStep(); break; // Customer details form
        case 7: showConfirmationStep(); break;   // Final confirmation
        default: console.error('Unknown step:', step);
    }
}
