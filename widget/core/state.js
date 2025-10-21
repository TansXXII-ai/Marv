// State management - Updated with new customer fields
export let currentStep = 1;
export let userData = {
    name: '',
    description: '',
    images: [],
    // New customer detail fields
    fullName: '',
    address: '',
    postcode: '',
    phone: '',
    email: '',
    timing: ''
};
export let validatedData = {};

// DOM references
export let widgetContainer = null;
export let widgetContent = null;
export let widgetHeader = null;

export function setDOMReferences(container, content, header) {
    widgetContainer = container;
    widgetContent = content;
    widgetHeader = header;
}

export function setCurrentStep(step) {
    currentStep = step;
}

export function updateUserData(field, value) {
    userData[field] = value;
}

export function updateValidatedData(data) {
    validatedData = { ...validatedData, ...data };
}

export function resetState() {
    currentStep = 1;
    userData = {
        name: '',
        description: '',
        images: [],
        fullName: '',
        address: '',
        postcode: '',
        phone: '',
        email: '',
        timing: ''
    };
    validatedData = {};
}
