// Configuration and constants
export const CONFIG = {
    API_BASE_URL: 'https://ashy-forest-06915f903.2.azurestaticapps.net/api',
    MAX_IMAGES: 9,
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
};

export const DECISION_COLORS = {
    'REPAIRABLE_COSMETIC': '#10b981',
    'REPAIRABLE_SPOT': '#10b981',
    'REPAIRABLE_FULL_RESURFACE': '#3b82f6',
    'NOT_REPAIRABLE': '#ef4444',
    'NEEDS_ASSESSMENT': '#f59e0b',
    'DEFAULT': '#6b7280'
};

export const DECISION_LABELS = {
    'REPAIRABLE_COSMETIC': 'Repairable - Cosmetic',
    'REPAIRABLE_SPOT': 'Repairable - Spot Repair',
    'REPAIRABLE_FULL_RESURFACE': 'Repairable - Full Resurface',
    'NOT_REPAIRABLE': 'Not Repairable',
    'NEEDS_ASSESSMENT': 'Needs Assessment'
};

// Extended material options
export const MATERIAL_OPTIONS = [
    { value: 'acrylic', label: 'Acrylic' },
    { value: 'wood', label: 'Wood' },
    { value: 'laminate', label: 'Laminate' },
    { value: 'granite', label: 'Granite' },
    { value: 'marble', label: 'Marble' },
    { value: 'quartz', label: 'Quartz' },
    { value: 'ceramic', label: 'Ceramic' },
    { value: 'porcelain', label: 'Porcelain' },
    { value: 'fiberglass', label: 'Fiberglass' },
    { value: 'enamel', label: 'Enamel' },
    { value: 'composite', label: 'Composite' },
    { value: 'solid_surface', label: 'Solid Surface (Corian)' },
    { value: 'glass', label: 'Glass' },
    { value: 'metal', label: 'Metal' },
    { value: 'plastic', label: 'Plastic' },
    { value: 'concrete', label: 'Concrete' },
    { value: 'tile', label: 'Tile' },
    { value: 'vinyl', label: 'Vinyl' },
    { value: 'other', label: 'Other' },
    { value: 'unknown', label: 'Not Sure' }
];

// Extended damage options
export const DAMAGE_OPTIONS = [
    { value: 'chip', label: 'Chip' },
    { value: 'crack', label: 'Crack' },
    { value: 'scratch', label: 'Scratch' },
    { value: 'dent', label: 'Dent' },
    { value: 'burn', label: 'Burn' },
    { value: 'stain', label: 'Stain' },
    { value: 'discoloration', label: 'Discoloration' },
    { value: 'wear', label: 'General Wear' },
    { value: 'gouge', label: 'Gouge' },
    { value: 'hole', label: 'Hole' },
    { value: 'water_damage', label: 'Water Damage' },
    { value: 'multiple', label: 'Multiple Issues' },
    { value: 'other', label: 'Other' }
];
