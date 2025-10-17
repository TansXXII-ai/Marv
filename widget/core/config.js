// Configuration and constants
export const CONFIG = {
    API_BASE_URL: 'https://ashy-forest-06915f903.2.azurestaticapps.net/api',
    MAX_IMAGES: 9,
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
};

export const DECISION_COLORS = {
    'REPAIRABLE_COSMETIC': '#10b981',
    'REPAIRABLE_SPOT': '#10b981',  // ADD THIS LINE
    'REPAIRABLE_FULL_RESURFACE': '#3b82f6',
    'NOT_REPAIRABLE': '#ef4444',
    'NEEDS_ASSESSMENT': '#f59e0b',
    'DEFAULT': '#6b7280'
};

export const DECISION_LABELS = {
    'REPAIRABLE_COSMETIC': 'Repairable - Cosmetic',
    'REPAIRABLE_SPOT': 'Repairable - Spot Repair',  // ADD THIS LINE
    'REPAIRABLE_FULL_RESURFACE': 'Repairable - Full Resurface',
    'NOT_REPAIRABLE': 'Not Repairable',
    'NEEDS_ASSESSMENT': 'Needs Assessment'
};


export const MATERIAL_OPTIONS = [
    { value: 'acrylic', label: 'Acrylic' },
    { value: 'fiberglass', label: 'Fiberglass' },
    { value: 'enamel', label: 'Enamel' },
    { value: 'ceramic', label: 'Ceramic' },
    { value: 'unknown', label: 'Not sure' }
];

export const DAMAGE_OPTIONS = [
    { value: 'chip', label: 'Chip' },
    { value: 'crack', label: 'Crack' },
    { value: 'scratch', label: 'Scratch' },
    { value: 'burn', label: 'Burn' },
    { value: 'stain', label: 'Stain' },
    { value: 'multiple', label: 'Multiple issues' }
];
