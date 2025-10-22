// MARV Form Module - Traditional Web Form with AI
// This can run alongside the chatbot on the same page

import { CONFIG } from '../shared/config.js';
import { callValidateAPI, callTriageAPI, parseAIResponse } from '../shared/api.js';

class MARVForm {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`MARV Form: Container #${containerId} not found`);
            return;
        }
        
        this.formData = {
            name: '',
            description: '',
            images: []
        };
        
        this.validatedData = {};
        this.currentStep = 1;
        
        this.init();
    }
    
    init() {
        this.container.innerHTML = `
            <div class="marv-form-container">
                <div class="marv-form-header">
                    <h2>Get Your Repair Assessment</h2>
                    <p>AI-powered damage analysis in minutes</p>
                </div>
                
                <div class="marv-form-progress">
                    <div class="marv-progress-step active" data-step="1">
                        <div class="marv-step-number">1</div>
                        <div class="marv-step-label">Your Details</div>
                    </div>
                    <div class="marv-progress-line"></div>
                    <div class="marv-progress-step" data-step="2">
                        <div class="marv-step-number">2</div>
                        <div class="marv-step-label">Photos</div>
                    </div>
                    <div class="marv-progress-line"></div>
                    <div class="marv-progress-step" data-step="3">
                        <div class="marv-step-number">3</div>
                        <div class="marv-step-label">Review</div>
                    </div>
                    <div class="marv-progress-line"></div>
                    <div class="marv-progress-step" data-step="4">
                        <div class="marv-step-number">4</div>
                        <div class="marv-step-label">Results</div>
                    </div>
                </div>
                
                <div class="marv-form-body" id="marvFormBody">
                    ${this.renderStep1()}
                </div>
            </div>
        `;
        
        this.attachStep1Listeners();
    }
    
    renderStep1() {
        return `
            <form id="marvStep1Form" class="marv-form-step">
                <h3>Tell us about yourself</h3>
                
                <div class="marv-form-row">
                    <div class="marv-form-field">
                        <label for="formName">Your Name *</label>
                        <input type="text" id="formName" name="name" required placeholder="John Smith" value="${this.formData.name}">
                    </div>
                </div>
                
                <div class="marv-form-row">
                    <div class="marv-form-field">
                        <label for="formDescription">Describe the Damage *</label>
                        <textarea id="formDescription" name="description" rows="4" required placeholder="E.g., Large scratch on white bathtub near the drain...">${this.formData.description}</textarea>
                        <small>Please be as detailed as possible</small>
                    </div>
                </div>
                
                <div class="marv-form-actions">
                    <button type="submit" class="marv-form-btn marv-form-btn-primary">
                        Next: Upload Photos
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </button>
                </div>
            </form>
        `;
    }
    
    attachStep1Listeners() {
        const form = document.getElementById('marvStep1Form');
        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.formData.name = document.getElementById('formName').value.trim();
            this.formData.description = document.getElementById('formDescription').value.trim();
            this.goToStep(2);
        });
    }
    
    renderStep2() {
        return `
            <div class="marv-form-step">
                <h3>Upload Photos</h3>
                
                <div class="marv-photo-guidelines">
                    <h4>📸 Photo Guidelines</h4>
                    <ul>
                        <li><strong>Close-up:</strong> Take a photo with a coin or ruler next to the damage for size reference</li>
                        <li><strong>Wide shot:</strong> Take a photo from a few feet back showing the entire item</li>
                        <li><strong>Good lighting:</strong> Ensure the damage is clearly visible</li>
                    </ul>
                    <p class="marv-note">💡 If you can't include a size reference, we'll estimate the damage size</p>
                </div>
                
                <div class="marv-upload-zone" id="uploadZone">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <h4>Drop photos here or click to browse</h4>
                    <p>Maximum ${CONFIG.MAX_IMAGES} images (10MB each)</p>
                    <input type="file" id="fileInput" accept="image/*" multiple style="display: none;">
                </div>
                
                <div class="marv-image-grid" id="imageGrid"></div>
                
                <div class="marv-form-actions">
                    <button type="button" class="marv-form-btn marv-form-btn-secondary" id="backBtn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        Back
                    </button>
                    <button type="button" class="marv-form-btn marv-form-btn-primary" id="analyzeBtn" disabled>
                        Analyze Photos (${this.formData.images.length})
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }
    
    attachStep2Listeners() {
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');
        const backBtn = document.getElementById('backBtn');
        const analyzeBtn = document.getElementById('analyzeBtn');
        
        uploadZone.addEventListener('click', () => fileInput.click());
        
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });
        
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });
        
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files);
        });
        
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
        
        backBtn.addEventListener('click', () => this.goToStep(1));
        
        analyzeBtn.addEventListener('click', async () => {
            await this.analyzeImages();
        });
        
        this.renderImageGrid();
    }
    
    handleFiles(files) {
        Array.from(files).forEach(file => {
            if (this.formData.images.length >= CONFIG.MAX_IMAGES) {
                alert(`Maximum ${CONFIG.MAX_IMAGES} images allowed`);
                return;
            }
            
            if (file.size > CONFIG.MAX_FILE_SIZE) {
                alert(`${file.name} is too large (max 10MB)`);
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                this.formData.images.push({
                    data: e.target.result,
                    name: file.name
                });
                this.renderImageGrid();
                this.updateAnalyzeButton();
            };
            reader.readAsDataURL(file);
        });
    }
    
    renderImageGrid() {
        const grid = document.getElementById('imageGrid');
        if (!grid) return;
        
        grid.innerHTML = this.formData.images.map((img, index) => `
            <div class="marv-image-card">
                <img src="${img.data}" alt="${img.name}">
                <button class="marv-image-delete" data-index="${index}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `).join('');
        
        grid.querySelectorAll('.marv-image-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                this.formData.images.splice(index, 1);
                this.renderImageGrid();
                this.updateAnalyzeButton();
            });
        });
    }
    
    updateAnalyzeButton() {
        const btn = document.getElementById('analyzeBtn');
        if (!btn) return;
        
        btn.disabled = this.formData.images.length === 0;
        btn.textContent = `Analyze Photos (${this.formData.images.length})`;
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '16');
        svg.setAttribute('height', '16');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', '5');
        line.setAttribute('y1', '12');
        line.setAttribute('x2', '19');
        line.setAttribute('y2', '12');
        
        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', '12 5 19 12 12 19');
        
        svg.appendChild(line);
        svg.appendChild(polyline);
        btn.appendChild(svg);
    }
    
    async analyzeImages() {
        this.showLoader('Analyzing your photos...');
        
        try {
            const result = await callValidateAPI(this.formData);
            
            if (result && result.validation) {
                this.validatedData = {
                    itemDescription: result.validation.itemDescription || '',
                    damageDescription: result.validation.damageDescription || '',
                    surfaceMaterial: result.validation.material || '',
                    damageType: result.validation.damageType || '',
                    aiSummary: result.validation.summary || '',
                    additionalNotes: '',
                    imageCount: this.formData.images.length
                };
                this.goToStep(3);
            } else {
                throw new Error('Invalid response from validation API');
            }
        } catch (error) {
            console.error('Validation error:', error);
            this.hideLoader();
            alert('Failed to analyze images. Please try again.');
        }
    }
    
    renderStep3() {
        const materialOptions = this.getMaterialOptions();
        const damageOptions = this.getDamageOptions();
        
        return `
            <div class="marv-form-step">
                <h3>Review & Confirm</h3>
                <p class="marv-form-intro">Please review our AI analysis and make any corrections</p>
                
                <div class="marv-validation-grid">
                    <div class="marv-validation-card">
                        <label>Item Detected</label>
                        <textarea id="itemDesc" rows="2">${this.validatedData.itemDescription}</textarea>
                    </div>
                    
                    <div class="marv-validation-card">
                        <label>Damage Detected</label>
                        <textarea id="damageDesc" rows="3">${this.validatedData.damageDescription}</textarea>
                    </div>
                    
                    <div class="marv-validation-card">
                        <label>Surface Material</label>
                        <select id="materialSelect">
                            ${materialOptions}
                        </select>
                    </div>
                    
                    <div class="marv-validation-card">
                        <label>Damage Type</label>
                        <select id="damageSelect">
                            ${damageOptions}
                        </select>
                    </div>
                    
                    <div class="marv-validation-card full-width">
                        <label>Additional Notes (Optional)</label>
                        <textarea id="notesInput" rows="2" placeholder="Any additional details...">${this.validatedData.additionalNotes || ''}</textarea>
                    </div>
                </div>
                
                <div class="marv-form-actions">
                    <button type="button" class="marv-form-btn marv-form-btn-secondary" id="backBtn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        Back
                    </button>
                    <button type="button" class="marv-form-btn marv-form-btn-primary" id="submitBtn">
                        Get Results
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }
    
    attachStep3Listeners() {
        const backBtn = document.getElementById('backBtn');
        const submitBtn = document.getElementById('submitBtn');
        
        backBtn.addEventListener('click', () => this.goToStep(2));
        
        submitBtn.addEventListener('click', async () => {
            this.validatedData.itemDescription = document.getElementById('itemDesc').value.trim();
            this.validatedData.damageDescription = document.getElementById('damageDesc').value.trim();
            this.validatedData.surfaceMaterial = document.getElementById('materialSelect').value;
            this.validatedData.damageType = document.getElementById('damageSelect').value;
            this.validatedData.additionalNotes = document.getElementById('notesInput').value.trim();
            
            await this.getRepairAnalysis();
        });
    }
    
    async getRepairAnalysis() {
        this.showLoader('Analyzing repair feasibility...');
        
        try {
            const combinedData = {
                ...this.formData,
                ...this.validatedData
            };
            
            const result = await callTriageAPI(combinedData);
            
            if (result && result.ok) {
                this.hideLoader();
                this.showResults(result);
            } else {
                throw new Error('Invalid response from triage API');
            }
        } catch (error) {
            console.error('Triage error:', error);
            this.hideLoader();
            alert('Failed to get repair analysis. Please try again.');
        }
    }
    
    showResults(triageResponse) {
        const parsed = parseAIResponse(triageResponse.result_text || triageResponse.result);
        const color = this.getDecisionColor(parsed.decision);
        const price = this.getPrice(parsed.decision);
        
        const bodyEl = document.getElementById('marvFormBody');
        bodyEl.innerHTML = `
            <div class="marv-form-step">
                <div class="marv-results-card" style="border-color: ${color};">
                    <div class="marv-results-header" style="background-color: ${color};">
                        <h2>${this.getDecisionLabel(parsed.decision)}</h2>
                        <div class="marv-confidence-badge">${(parsed.confidence * 100).toFixed(0)}% Confidence</div>
                    </div>
                    
                    ${price ? `
                        <div class="marv-price-box">
                            <div class="marv-price-label">Estimated Price</div>
                            <div class="marv-price-amount">£${price}</div>
                            <div class="marv-price-detail">${price === 180 ? 'Half day job' : 'Full day job'}</div>
                        </div>
                    ` : ''}
                    
                    <div class="marv-results-body">
                        <h4>Analysis Summary</h4>
                        <ul class="marv-results-list">
                            ${parsed.reasons.slice(0, 3).map(r => `<li>${r}</li>`).join('')}
                        </ul>
                        
                        <details class="marv-details-section">
                            <summary>View Full Assessment Details</summary>
                            <div class="marv-details-content">
                                <p><strong>Item:</strong> ${this.validatedData.itemDescription}</p>
                                <p><strong>Damage:</strong> ${this.validatedData.damageDescription}</p>
                                <p><strong>Material:</strong> ${this.validatedData.surfaceMaterial}</p>
                                <p><strong>Type:</strong> ${this.validatedData.damageType}</p>
                                ${this.validatedData.additionalNotes ? `<p><strong>Notes:</strong> ${this.validatedData.additionalNotes}</p>` : ''}
                            </div>
                        </details>
                    </div>
                </div>
                
                <div class="marv-form-actions">
                    <button type="button" class="marv-form-btn marv-form-btn-secondary" id="startOverBtn">
                        Start New Assessment
                    </button>
                    <button type="button" class="marv-form-btn marv-form-btn-primary" id="contactBtn">
                        ${price ? 'Book This Repair' : 'Request Technical Review'}
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('startOverBtn').addEventListener('click', () => {
            this.reset();
        });
        
        document.getElementById('contactBtn').addEventListener('click', () => {
            // Navigate to customer details or booking page
            window.location.href = '/booking?ref=' + Date.now();
        });
        
        this.goToStep(4);
    }
    
    // Helper methods
    getMaterialOptions() {
        const materials = [
            'acrylic', 'wood', 'laminate', 'granite', 'marble', 'quartz',
            'ceramic', 'porcelain', 'fiberglass', 'enamel', 'composite',
            'solid_surface', 'glass', 'metal', 'plastic', 'concrete', 'tile', 'vinyl', 'other'
        ];
        
        return materials.map(m => `
            <option value="${m}" ${this.validatedData.surfaceMaterial === m ? 'selected' : ''}>
                ${m.charAt(0).toUpperCase() + m.slice(1).replace('_', ' ')}
            </option>
        `).join('');
    }
    
    getDamageOptions() {
        const damages = [
            'chip', 'crack', 'scratch', 'dent', 'burn', 'stain',
            'discoloration', 'wear', 'gouge', 'hole', 'water_damage', 'multiple', 'other'
        ];
        
        return damages.map(d => `
            <option value="${d}" ${this.validatedData.damageType === d ? 'selected' : ''}>
                ${d.charAt(0).toUpperCase() + d.slice(1).replace('_', ' ')}
            </option>
        `).join('');
    }
    
    getDecisionColor(decision) {
        const colors = {
            'REPAIRABLE_SPOT': '#10b981',
            'REPAIRABLE_FULL_RESURFACE': '#3b82f6',
            'NOT_REPAIRABLE': '#f59e0b',
            'NEEDS_ASSESSMENT': '#f59e0b'
        };
        return colors[decision] || '#6b7280';
    }
    
    getDecisionLabel(decision) {
        const labels = {
            'REPAIRABLE_SPOT': 'Likely Repairable - Spot Repair',
            'REPAIRABLE_FULL_RESURFACE': 'Likely Repairable - Full Resurface',
            'NOT_REPAIRABLE': 'Needs Technical Review',
            'NEEDS_ASSESSMENT': 'Needs Technical Review'
        };
        return labels[decision] || decision;
    }
    
    getPrice(decision) {
        if (decision === 'REPAIRABLE_SPOT') return 180;
        if (decision === 'REPAIRABLE_FULL_RESURFACE') return 300;
        return null;
    }
    
    showLoader(message) {
        const overlay = document.createElement('div');
        overlay.id = 'marvFormLoader';
        overlay.className = 'marv-form-loader-overlay';
        overlay.innerHTML = `
            <div class="marv-form-loader">
                <div class="marv-loader-spinner"></div>
                <p>${message}</p>
            </div>
        `;
        this.container.appendChild(overlay);
    }
    
    hideLoader() {
        const loader = document.getElementById('marvFormLoader');
        if (loader) loader.remove();
    }
    
    goToStep(step) {
        this.currentStep = step;
        this.updateProgressBar();
        
        const bodyEl = document.getElementById('marvFormBody');
        
        switch(step) {
            case 1:
                bodyEl.innerHTML = this.renderStep1();
                this.attachStep1Listeners();
                break;
            case 2:
                bodyEl.innerHTML = this.renderStep2();
                this.attachStep2Listeners();
                break;
            case 3:
                bodyEl.innerHTML = this.renderStep3();
                this.attachStep3Listeners();
                break;
            case 4:
                // Results already rendered
                break;
        }
        
        bodyEl.scrollTop = 0;
        this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    updateProgressBar() {
        document.querySelectorAll('.marv-progress-step').forEach((step, index) => {
            if (index + 1 < this.currentStep) {
                step.classList.add('completed');
                step.classList.remove('active');
            } else if (index + 1 === this.currentStep) {
                step.classList.add('active');
                step.classList.remove('completed');
            } else {
                step.classList.remove('active', 'completed');
            }
        });
    }
    
    reset() {
        this.formData = {
            name: '',
            description: '',
            images: []
        };
        this.validatedData = {};
        this.goToStep(1);
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new MARVForm('marv-form');
    });
} else {
    new MARVForm('marv-form');
}

export default MARVForm;
