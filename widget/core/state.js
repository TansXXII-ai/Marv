// State management
export let currentStep = 1;
export let userData = {
    name: '',
    email: '',
    postcode: '',
    description: '',
    images: []
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
        email: '',
        postcode: '',
        description: '',
        images: []
    };
    validatedData = {};
}
