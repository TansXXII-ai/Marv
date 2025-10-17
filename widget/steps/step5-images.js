// Step 5: Image upload - Chat style
import { userData } from '../core/state.js';
import { CONFIG } from '../core/config.js';
import { validateFile, validateImageCount } from '../utils/validators.js';
import { showStep } from './step-router.js';
import { addBotMessage, addInputArea, removeLastInputArea, showTypingIndicator, hideTypingIndicator } from '../utils/chat-helpers.js';
import { callValidateAPI } from '../utils/api.js';
import { updateValidatedData } from '../core/state.js';

export async function showImageUploadStep() {
    await addBotMessage("Excellent! Now I need to see what we're working with. 📸", 300);
    await addBotMessage(`Please upload photos of the damage (up to ${CONFIG.MAX_IMAGES} images, max 10MB each).`, 600);
    
    const inputArea = addInputArea(`
        <div class="marv-upload-area" id="uploadArea">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <p>Click or drag images here</p>
            <input type="file" id="fileInput" accept="image/*" multiple style="display: none;">
        </div>
        <div class="marv-image-preview" id="imagePreview"></div>
        <div class="marv-btn-group">
            <button class="marv-btn-secondary" id="imgBackBtn">Back</button>
            <button class="marv-btn" id="imgNextBtn" disabled>Analyze (0/${CONFIG.MAX_IMAGES})</button>
        </div>
    `);

    const uploadArea = inputArea.querySelector('#uploadArea');
    const fileInput = inputArea.querySelector('#fileInput');
    const preview = inputArea.querySelector('#imagePreview');
    const backBtn = inputArea.querySelector('#imgBackBtn');
    const nextBtn = inputArea.querySelector('#imgNextBtn');

    renderImagePreviews(preview, nextBtn);

    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('marv-upload-area-active');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('marv-upload-area-active');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('marv-upload-area-active');
        handleFiles(e.dataTransfer.files, preview, nextBtn);
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files, preview, nextBtn);
    });

    backBtn.addEventListener('click', () => showStep(4));
    
    nextBtn.addEventListener('click', async () => {
        if (userData.images.length > 0) {
            removeLastInputArea();
            await addBotMessage(`Got it! I can see ${userData.images.length} image${userData.images.length > 1 ? 's' : ''}. Let me analyze ${userData.images.length > 1 ? 'them' : 'it'}... 🔍`, 100);
            
            showTypingIndicator();
            
            try {
                const result = await callValidateAPI();
                hideTypingIndicator();
                
                updateValidatedData({
                    itemDescription: result.itemDescription || '',
                    damageDescription: result.damageDescription || '',
                    aiSummary: result.summary || '',
                    surfaceMaterial: result.material || '',
                    damageType: result.damageType || '',
                    additionalNotes: '',
                    imageCount: userData.images.length
                });
                
                showStep(6);
            } catch (error) {
                hideTypingIndicator();
                console.error('Validation error:', error);
                await addBotMessage("Oops! I had trouble analyzing those images. Please try again or upload different photos. 😕", 100);
            }
        }
    });
}

function handleFiles(files, preview, nextBtn) {
    const filesArray = Array.from(files);
    
    filesArray.forEach(file => {
        if (!validateImageCount(userData.images.length)) {
            alert(`Maximum ${CONFIG.MAX_IMAGES} images allowed`);
            return;
        }

        const validation = validateFile(file);
        if (!validation.valid) {
            alert(validation.errors.join('\n'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            userData.images.push({
                data: e.target.result,
                name: file.name
            });
            renderImagePreviews(preview, nextBtn);
        };
        reader.readAsDataURL(file);
    });
}

function renderImagePreviews(container, nextBtn) {
    container.innerHTML = userData.images.map((img, index) => `
        <div class="marv-image-item">
            <img src="${img.data}" alt="${img.name}">
            <button class="marv-image-remove" data-index="${index}">×</button>
        </div>
    `).join('');

    container.querySelectorAll('.marv-image-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            userData.images.splice(index, 1);
            renderImagePreviews(container, nextBtn);
        });
    });

    nextBtn.textContent = `Analyze (${userData.images.length}/${CONFIG.MAX_IMAGES})`;
    nextBtn.disabled = userData.images.length === 0;
}
