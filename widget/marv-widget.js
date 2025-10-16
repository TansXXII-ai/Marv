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
      <button id="marv-bubble" class="marv-bubble">
        <svg class="marv-bubble-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 
            012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      <div id="marv-panel" class="marv-panel marv-hidden">
        <div class="marv-header">
          <div class="marv-header-content">
            <div class="marv-status-dot"></div>
            <h2 class="marv-title">Marv • Magicman AI</h2>
          </div>
          <button id="marv-close" class="marv-close-btn">
            <svg class="marv-close-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div id="marv-progress" class="marv-progress">
          <div class="marv-progress-bar">
            <div class="marv-progress-step" data-step="1"></div>
            <div class="marv-progress-step" data-step="2"></div>
            <div class="marv-progress-step" data-step="3"></div>
            <div class="marv-progress-step" data-step="4"></div>
            <div class="marv-progress-step" data-step="5"></div>
          </div>
        </div>

        <div id="marv-content" class="marv-content"></div>

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
      case 1: return this.formData.name.trim().length > 0;
      case 2: return this.formData.email.trim().includes('@');
      case 3: return this.formData.postcode.trim().length > 0;
      case 4: return this.formData.description.trim().length > 10;
      case 5: return this.formData.images.length > 0;
      default: return true;
    }
  }

  renderStep() {
    const content = document.getElementById('marv-content');
    const continueBtn = document.getElementById('marv-continue');
    const backBtn = document.getElementById('marv-back');
    const footer = document.getElementById('marv-footer');
    const progress = document.getElementById('marv-progress');

    document.querySelectorAll('.marv-progress-step').forEach((step, i) => {
      step.classList.toggle('marv-progress-active', i + 1 <= this.step);
    });

    backBtn.classList.toggle('marv-hidden', !(this.step > 1 && this.step < 6));
    footer.classList.toggle('marv-hidden', this.step === 6);
    progress.classList.toggle('marv-hidden', this.step === 6);

    continueBtn.textContent = this.step === 5 ? 'Analyse Damage' : 'Continue';
    continueBtn.disabled = !this.canProceed();

    switch (this.step) {
      case 1: content.innerHTML = this.renderNameStep(); break;
      case 2: content.innerHTML = this.renderEmailStep(); break;
      case 3: content.innerHTML = this.renderPostcodeStep(); break;
      case 4: content.innerHTML = this.renderDescriptionStep(); break;
      case 5: content.innerHTML = this.renderImagesStep(); this.attachImageHandlers(); break;
      case 6: content.innerHTML = this.renderResultStep(); this.attachResultHandlers(); break;
    }

    this.attachInputHandlers();
  }

  renderNameStep() {
    return `
      <div class="marv-step">
        <h3 class="marv-step-title">Welcome! What's your name?</h3>
        <input id="marv-name-input" class="marv-input" placeholder="Enter your name" 
          value="${this.formData.name}" autocomplete="name" />
      </div>
    `;
  }

  renderEmailStep() {
    return `
      <div class="marv-step">
        <h3 class="marv-step-title">Hi ${this.formData.name}! What's your email?</h3>
        <input id="marv-email-input" type="email" class="marv-input" 
          placeholder="your.email@example.com" value="${this.formData.email}" autocomplete="email" />
      </div>
    `;
  }

  renderPostcodeStep() {
    return `
      <div class="marv-step">
        <h3 class="marv-step-title">What's your postcode?</h3>
        <input id="marv-postcode-input" class="marv-input" placeholder="e.g. SW1A 1AA"
          value="${this.formData.postcode}" autocomplete="postal-code" />
      </div>
    `;
  }

  renderDescriptionStep() {
    return `
      <div class="marv-step">
        <h3 class="marv-step-title">Describe the damage</h3>
        <textarea id="marv-description-input" class="marv-textarea" rows="6"
          placeholder="e.g. Small chip on kitchen worktop near the sink...">${this.formData.description}</textarea>
      </div>
    `;
  }

  renderImagesStep() {
    const previews = this.formData.images.map((img, i) => `
      <div class="marv-image-preview">
        <img src="${img.preview}" alt="Upload ${i + 1}" />
        <button class="marv-image-remove" data-index="${i}">×</button>
      </div>`).join('');

    const showUpload = this.formData.images.length < 9;
    return `
      <div class="marv-step">
        <h3 class="marv-step-title">Upload photos</h3>
        <p class="marv-step-subtitle">Add up to 9 clear photos of the damage.</p>
        ${previews ? `<div class="marv-image-grid">${previews}</div>` : ''}
        ${showUpload ? `
          <button id="marv-upload-btn" class="marv-upload-btn">
            <svg class="marv-upload-icon" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Photos (${this.formData.images.length}/9)</span>
          </button>
        ` : ''}
        <input type="file" id="marv-file-input" class="marv-file-input" accept="image/*" multiple />
      </div>
    `;
  }

  renderResultStep() {
    if (!this.result) return '<div class="marv-loading">Loading...</div>';
    return `
      <div class="marv-step">
        <div class="marv-result-card marv-decision-green">
          <h3 class="marv-result-title">Analysis Complete</h3>
          <div class="marv-result-section">
            <div class="marv-result-label">Result</div>
            <div class="marv-result-value">${this.result}</div>
          </div>
        </div>
        <div class="marv-info-box"><p>✓ A Magicman technician will review and confirm shortly.</p></div>
        <button id="marv-new-enquiry" class="marv-btn marv-btn-primary marv-btn-full">New Enquiry</button>
      </div>
    `;
  }

  renderLoadingState() {
    return `
      <div class="marv-loading">
        <div class="marv-loading-dots"><div></div><div></div><div></div></div>
        <p>Analysing your damage...</p>
      </div>
    `;
  }

  attachInputHandlers() {
    const map = {
      'marv-name-input': 'name',
      'marv-email-input': 'email',
      'marv-postcode-input': 'postcode',
      'marv-description-input': 'description'
    };
    for (const [id, field] of Object.entries(map)) {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', (e) => {
          this.formData[field] = e.target.value;
          document.getElementById('marv-continue').disabled = !this.canProceed();
        });
      }
    }
  }

  attachImageHandlers() {
    const uploadBtn = document.getElementById('marv-upload-btn');
    const fileInput = document.getElementById('marv-file-input');
    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => this.handleImageUpload(e));
    }
    document.querySelectorAll('.marv-image-remove').forEach(btn =>
      btn.addEventListener('click', (e) => this.removeImage(e.target.dataset.index))
    );
  }

  attachResultHandlers() {
    const btn = document.getElementById('marv-new-enquiry');
    if (btn) btn.addEventListener('click', () => this.reset());
  }

  handleImageUpload(e) {
    const files = Array.from(e.target.files);
    if (this.formData.images.length + files.length > 9) {
      alert('Maximum 9 images allowed');
      return;
    }
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        this.formData.images.push({ file, preview: ev.target.result });
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
      const formData = new FormData();
      formData.append('name', this.formData.name);
      formData.append('email', this.formData.email);
      formData.append('postcode', this.formData.postcode);
      formData.append('description', this.formData.description);
      this.formData.images.forEach(img => formData.append('images', img.file, img.file.name));

      const res = await fetch(`${this.apiBase}/triage`, { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok || !data.ok) throw new Error(data.error || 'AI analysis failed');

      // ✅ Update here — match new API output
      this.result = data.result_text || 'No response received.';
      this.step = 6;
      this.renderStep();
      this.resetTimer = setTimeout(() => this.reset(), 30000);

    } catch (err) {
      console.error('Error:', err);
      alert('Failed to analyse damage. Please try again.');
      this.step = 5;
      this.renderStep();
    } finally {
      this.loading = false;
    }
  }

  reset() {
    if (this.resetTimer) clearTimeout(this.resetTimer);
    this.formData = { name: '', email: '', postcode: '', description: '', images: [] };
    this.result = null;
    this.step = 1;
    this.close();
  }
}

// Initialize widget
document.addEventListener('DOMContentLoaded', () => {
  window.marvWidget = new MarvWidget({
    apiBase: window.MARV_CONFIG?.apiBase || '/api'
  });
});
