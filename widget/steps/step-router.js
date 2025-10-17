// Step router
import { setCurrentStep } from '../core/state.js';
import { showNameStep } from './step1-name.js';
import { showEmailStep } from './step2-email.js';
import { showPostcodeStep } from './step3-postcode.js';
import { showDescriptionStep } from './step4-description.js';
import { showImageUploadStep } from './step5-images.js';
import { showValidationStep } from './step6-validation.js';
import { showResultsWithData } from './step7-results.js';

export function showStep(step) {
    setCurrentStep(step);
    
    switch(step) {
        case 1: showNameStep(); break;
        case 2: showEmailStep(); break;
        case 3: showPostcodeStep(); break;
        case 4: showDescriptionStep(); break;
        case 5: showImageUploadStep(); break;
        case 6: showValidationStep(); break;
        case 7: showResultsWithData(); break;
        default: console.error('Unknown step:', step);
    }
}
