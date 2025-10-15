class MarvWidget {
  constructor(config) {
    this.apiBase = config.apiBase;
    this.isOpen = false;
    this.step = 1;
    this.loading = false;
    this.formData = {
      name: '',
      email: '',
      postcode: '',
      description: '',
      images: []
    };
    this.result = null;
    this.resetTimer = null;
    
    this.init();
  }

  init() {
    this.injectStyles();
    this.createWidget();
    this.attachEventListeners();
  }

  injectStyles() {
    if (!document.getElementById('marv-widget-styles')) {
      const link = document.createElement('link');
      link.id = 'marv-widget-styles';
      link.rel = 'stylesheet';
      link.href = 'widget/marv-widget.css';
      document.head.appendChild(link);
    }
  }

  createWidget() {
    const container = document.createElement('div');
    container.id = 'marv-widget-container';
    container.innerHTML = `
      <!-- Chat Bubble -->
      <button id="marv-bubble" class="marv-bubble">
        <svg class="marv-bubble-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      <!-- Chat Panel -->
      <div id="marv-panel" class="marv-panel marv-hidden">
        <!-- Header -->
        <div class="marv-header">
          <div class="marv-header-content">
            <div class="marv-status-dot"></div>
            <h2 class="marv-title">Marv • Magicman AI</h2>
          </div>
          <button id="marv-close" class="marv-close-btn">
            <svg class="marv-close-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Progress Bar -->
        <div id="marv-progress" class="marv-progress">
          <div class="marv-progress-bar">
            <div class="marv-progress-step" data-step="1"></div>
            <div class="marv-progress-step" data-step="2"></div>
            <div class="marv-progress-step" data-step="3"></div>
            <div class="marv-progress-step" data-step="4"></div>
            <div class="marv-progress-step" data-step="5"></div>
          </div>
        </div>

        <!-- Content Area -->
        <div id="marv-content" class="marv-content">
          <!-- Steps will be injected here -->
        </div>

        <!-- Footer Actions -->
        <div id="marv-footer" class="marv-footer">
          <button id="marv-continue" class="marv-btn marv-btn-primary">Continue</button>
          <button id="marv-back" class="marv-btn marv-btn-secondary marv-hidden">Back</button>
          <div class="marv-powered">Powered by Magicman</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(container);
  }

  attachEventListeners() {
    document.getElementById('marv-bubble').addEventListener('click', () => this.open());
    document.getElementById('marv-close').addEventListener('click', () => this.close());
    document.getElementById('marv-continue').addEventListener('click', () => this.handleContinue());
    document.getElementById('marv-back').addEventListener('click', () => this.handleBack());
  }

  open() {
    this.isOpen = true;
    document.getElementById('marv-bubble').classList.add('marv-hidden');
    document.getElementById('marv-panel').classList.remove('marv-hidden');
    this.renderStep();
  }

  close() {
    this.isOpen = false;
    document.getElementById('marv-panel').classList.add('marv-hidden');
    document.getElementById('marv-bubble').classList.remove('marv-hidden');
  }

  handleContinue() {
    if (this.step === 5) {
      this.submitForm();
    } else if (this.canProceed()) {
      this.step++;
      this.renderStep();
    }
  }

  handleBack() {
    if (this.step > 1) {
      this.step--;
      this.renderStep();
    }
  }

  canProceed() {
    switch (this.step) {
      case 1:
        return this.formData.name.trim().length > 0;
      case 2:
        return this.formData.email.trim().length > 0 && this.formData.email.includes('@');
      case 3:
        return this.formData.postcode.trim().length > 0;
      case 4:
        return this.formData.description.trim().length > 10;
      case 5:
        return this.formData.images.length > 0;
      default:
        return true;
    }
  }

  renderStep() {
    const content = document.getElementById('marv-content');
    const continueBtn = document.getElementById('marv-continue');
    const backBtn = document.getElementById('marv-back');
    const footer = document.getElementById('marv-footer');
    const progress = document.getElementById('marv-progress');

    // Update progress bar
    document.querySelectorAll('.marv-progress-step').forEach((step, index) => {
      if (index + 1 <= this.step) {
        step.classList.add('marv-progress-active');
      } else {
        step.classList.remove('marv-progress-active');
      }
    });

    // Show/hide back button
    if (this.step > 1 && this.step < 6) {
      backBtn.classList.remove('marv-hidden');
    } else {
      backBtn.classList.add('marv-hidden');
    }

    // Hide progress and footer on result screen
    if (this.step === 6) {
      progress.classList.add('marv-hidden');
      footer.classList.add('marv-hidden');
    } else {
      progress.classList.remove('marv-hidden');
      footer.classList.remove('marv-hidden');
    }

    // Update continue button
    if (this.step === 5) {
      continueBtn.textContent = 'Analyse Damage';
    } else {
      continueBtn.textContent = 'Continue';
    }

    continueBtn.disabled = !this.canProceed();

    // Render step content
    switch (this.step) {
      case 1:
        content.innerHTML = this.renderNameStep();
        break;
      case 2:
        content.innerHTML = this.renderEmailStep();
        break;
      case 3:
        content.innerHTML = this.renderPostcodeStep();
        break;
      case 4:
        content.innerHTML = this.renderDescriptionStep();
        break;
      case 5:
        content.innerHTML = this.renderImagesStep();
        this.attachImageHandlers();
        break;
      case 6:
        content.innerHTML = this.renderResultStep();
        this.attachResultHandlers();
        break;
    }

    this.attachInputHandlers();
  }

  renderNameStep() {
    return `
      <div class="marv-step">
        <h3 class="marv-step-title">Welcome! What's your name?</h3>
        <p class="marv-step-subtitle">Let's start by getting to know you.</p>
        <input 
          type="text" 
          id="marv-name-input" 
          class="marv-input" 
          placeholder="Enter your name"
          value="${this.formData.name}"
          autocomplete="name"
        />
      </div>
    `;
  }

  renderEmailStep() {
    return `
      <div class="marv-step">
        <h3 class="marv-step-title">Hi ${this.formData.name}! What's your email?</h3>
        <p class="marv-step-subtitle">We'll send your repair estimate here.</p>
        <input 
          type="email" 
          id="marv-email-input" 
          class="marv-input" 
          placeholder="your.email@example.com"
          value="${this.formData.email}"
          autocomplete="email"
        />
      </div>
    `;
  }

  renderPostcodeStep() {
    return `
      <div class="marv-step">
        <h3 class="marv-step-title">What's your postcode?</h3>
        <p class="marv-step-subtitle">This helps us find your nearest technician.</p>
        <input 
          type="text" 
          id="marv-postcode-input" 
          class="marv-input" 
          placeholder="e.g. SW1A 1AA"
          value="${this.formData.postcode}"
          autocomplete="postal-code"
        />
      </div>
    `;
  }

  renderDescriptionStep() {
    return `
      <div class="marv-step">
        <h3 class="marv-step-title">Describe the damage</h3>
        <p class="marv-step-subtitle">Tell us what happened and what needs fixing.</p>
        <textarea 
          id="marv-description-input" 
          class="marv-textarea" 
          placeholder="e.g. Small chip on kitchen worktop near the sink..."
          rows="6"
        >${this.formData.description}</textarea>
      </div>
    `;
  }

  renderImagesStep() {
    const imageGrid = this.formData.images.map((img, index) => `
      <div class="marv-image-preview">
        <img src="${img.preview}" alt="Upload ${index + 1}" />
        <button class="marv-image-remove" data-index="${index}">×</button>
      </div>
    `).join('');

    const showUploadButton = this.formData.images.length < 9;

    return `
      <div class="marv-step">
        <h3 class="marv-step-title">Upload photos</h3>
        <p class="marv-step-subtitle">Add up to 9 clear photos of the damage.</p>
        
        ${this.formData.images.length > 0 ? `
          <div class="marv-image-grid">
            ${imageGrid}
          </div>
        ` : ''}
        
        ${showUploadButton ? `
          <button id="marv-upload-btn" class="marv-upload-btn">
            <svg class="marv-upload-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Photos (${this.formData.images.length}/9)</span>
          </button>
        ` : ''}
        
        <input 
          type="file" 
          id="marv-file-input" 
          class="marv-file-input" 
          accept="image/*" 
          multiple
        />
      </div>
    `;
  }

  renderResultStep() {
    if (!this.result) return '<div class="marv-loading">Loading...</div>';

    const decisionClass = this.getDecisionClass(this.result.decision);
    const decisionLabel = this.getDecisionLabel(this.result.decision);
    const confidence = Math.round((this.result.confidence_0to1 || 0) * 100);

    const reasons = this.result.reasons && this.result.reasons.length > 0
      ? this.result.reasons.map(reason => `<li><span>•</span><span>${reason}</span></li>`).join('')
      : '';

    return `
      <div class="marv-step">
        <div class="marv-result-card ${decisionClass}">
          <h3 class="marv-result-title">Analysis Complete</h3>
          
          <div class="marv-result-section">
            <div class="marv-result-label">Decision</div>
            <div class="marv-result-value">${decisionLabel}</div>
          </div>

          <div class="marv-result-section">
            <div class="marv-result-label">Confidence</div>
            <div class="marv-confidence">
              <div class="marv-confidence-bar">
                <div class="marv-confidence-fill" style="width: ${confidence}%"></div>
              </div>
              <span class="marv-confidence-text">${confidence}%</span>
            </div>
          </div>

          ${reasons ? `
            <div class="marv-result-section">
              <div class="marv-result-label">Analysis</div>
              <ul class="marv-result-reasons">${reasons}</ul>
            </div>
          ` : ''}
        </div>

        <div class="marv-info-box">
          <p>✓ A Magicman technician will review and confirm your estimate shortly.</p>
        </div>

        <button id="marv-new-enquiry" class="marv-btn marv-btn-primary marv-btn-full">
          New Enquiry
        </button>
      </div>
    `;
  }

  renderLoadingState() {
    return `
      <div class="marv-loading">
        <div class="marv-loading-dots">
          <div class="marv-loading-dot"></div>
          <div class="marv-loading-dot"></div>
          <div class="marv-loading-dot"></div>
        </div>
        <p>Analysing your damage...</p>
      </div>
    `;
  }

  attachInputHandlers() {
    const nameInput = document.getElementById('marv-name-input');
    const emailInput = document.getElementById('marv-email-input');
    const postcodeInput = document.getElementById('marv-postcode-input');
    const descriptionInput = document.getElementById('marv-description-input');

    if (nameInput) {
      nameInput.focus();
      nameInput.addEventListener('input', (e) => {
        this.formData.name = e.target.value;
        document.getElementById('marv-continue').disabled = !this.canProceed();
      });
      nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && this.canProceed()) this.handleContinue();
      });
    }

    if (emailInput) {
      emailInput.focus();
      emailInput.addEventListener('input', (e) => {
        this.formData.email = e.target.value;
        document.getElementById('marv-continue').disabled = !this.canProceed();
      });
      emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && this.canProceed()) this.handleContinue();
      });
    }

    if (postcodeInput) {
      postcodeInput.focus();
      postcodeInput.addEventListener('input', (e) => {
        this.formData.postcode = e.target.value;
        document.getElementById('marv-continue').disabled = !this.canProceed();
      });
      postcodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && this.canProceed()) this.handleContinue();
      });
    }

    if (descriptionInput) {
      descriptionInput.focus();
      descriptionInput.addEventListener('input', (e) => {
        this.formData.description = e.target.value;
        document.getElementById('marv-continue').disabled = !this.canProceed();
      });
    }
  }

  attachImageHandlers() {
    const uploadBtn = document.getElementById('marv-upload-btn');
    const fileInput = document.getElementById('marv-file-input');

    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => this.handleImageUpload(e));
    }

    document.querySelectorAll('.marv-image-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.removeImage(index);
      });
    });
  }

  attachResultHandlers() {
    const newEnquiryBtn = document.getElementById('marv-new-enquiry');
    if (newEnquiryBtn) {
      newEnquiryBtn.addEventListener('click', () => this.reset());
    }
  }

  handleImageUpload(e) {
    const files = Array.from(e.target.files);
    
    if (this.formData.images.length + files.length > 9) {
      alert('Maximum 9 images allowed');
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        this.formData.images.push({
          file: file, // Keep the actual File object for multipart upload
          preview: event.target.result // For display only
        });
        this.renderStep();
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  }

  removeImage(index) {
    this.formData.images.splice(index, 1);
    this.renderStep();
  }

  async submitForm() {
    this.loading = true;
    document.getElementById('marv-content').innerHTML = this.renderLoadingState();
    document.getElementById('marv-footer').classList.add('marv-hidden');
    document.getElementById('marv-progress').classList.add('marv-hidden');

    try {
      // Build FormData for multipart upload
      const formData = new FormData();
      formData.append('name', this.formData.name);
      formData.append('email', this.formData.email);
      formData.append('postcode', this.formData.postcode);
      formData.append('text', this.formData.description);

      // Add all image files
      this.formData.images.forEach((img, index) => {
        formData.append('images', img.file, img.file.name);
      });

      const response = await fetch(`${this.apiBase}/triage`, {
        method: 'POST',
        body: formData // Don't set Content-Type - browser will set it with boundary
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: 'Unknown error' };
        }
        
        console.error('API Error Response:', errorData);
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to analyse damage`);
      }

      this.result = await response.json();
      this.step = 6;
      this.renderStep();

      // Auto-reset after 30 seconds
      this.resetTimer = setTimeout(() => this.reset(), 30000);

    } catch (error) {
      console.error('Error:', error);
      alert('Failed to analyse damage. Please try again.');
      this.step = 5;
      this.renderStep();
    } finally {
      this.loading = false;
    }
  }

  reset() {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }

    this.formData = {
      name: '',
      email: '',
      postcode: '',
      description: '',
      images: []
    };
    this.step = 1;
    this.result = null;
    this.close();
  }

  getDecisionClass(decision) {
    const classes = {
      'REPAIRABLE_SPOT': 'marv-decision-green',
      'REPAIRABLE_FULL_RESURFACE': 'marv-decision-blue',
      'NCD': 'marv-decision-red',
      'NEEDS_MORE_INFO': 'marv-decision-amber'
    };
    return classes[decision] || 'marv-decision-gray';
  }

  getDecisionLabel(decision) {
    const labels = {
      'REPAIRABLE_SPOT': 'Spot Repair Possible',
      'REPAIRABLE_FULL_RESURFACE': 'Full Resurface Required',
      'NCD': 'Not Cost-Effective to Repair',
      'NEEDS_MORE_INFO': 'More Information Needed'
    };
    return labels[decision] || decision;
  }
}

// Initialize widget when script loads
document.addEventListener('DOMContentLoaded', () => {
  window.marvWidget = new MarvWidget({
    apiBase: window.MARV_CONFIG?.apiBase || 'https://your-function-app.azurewebsites.net'
  });
});
