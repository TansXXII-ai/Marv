// Step 3: Image upload - Chat style with photo guidance
import { userData } from '../core/state.js';
import { CONFIG } from '../core/config.js';
import { validateFile, validateImageCount } from '../utils/validators.js';
import { showStep } from './step-router.js';
import { addBotMessage, addBotMessageWithContent, addInputArea, removeLastInputArea, showTypingIndicator, hideTypingIndicator, showAnalysisLoader } from '../utils/chat-helpers.js';
import { callValidateAPI } from '../utils/api.js';
import { updateValidatedData } from '../core/state.js';

export async function showImageUploadStep() {
    showTypingIndicator();
    await new Promise(resolve => setTimeout(resolve, 800));
    hideTypingIndicator();
    
    await addBotMessage("Excellent! Now I need to see what we're working with. 📸", 300);
    
    showTypingIndicator();
    await new Promise(resolve => setTimeout(resolve, 1200));
    hideTypingIndicator();
    
    await addBotMessage("For the best assessment, please upload:", 600);
    
    const guidanceContent = `
        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px; border-radius: 8px; margin: 8px 0;">
            <p style="margin: 0 0 10px 0; font-weight: 600; color: #1e40af;">📷 Photo Guidelines:</p>
            <ul style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 14px; line-height: 1.8;">
                <li><strong>Close-up photo</strong> of the damage with a coin or ruler next to it (helps us estimate size)</li>
                <li><strong>Wide shot</strong> from a few feet back showing the entire item in context</li>
                <li>Use good lighting and avoid blurry images</li>
            </ul>
            <p style="margin: 10px 0 0 0; font-size: 13px; color: #6b7280; font-style: italic;">
                💡 If you can't include a coin/ruler, I'll make my best estimate of the damage size.
            </p>
        </div>
    `;
    
    await addBotMessageWithContent(guidanceContent, 900);
    
    showTypingIndicator();
    await new Promise(resolve => setTimeout(resolve, 600));
    hideTypingIndicator();
    
    await addBotMessage(`You can upload up to ${CONFIG.MAX_IMAGES} images (max 10MB each).`, 300);
    
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

    backBtn.addEventListener('click', () => showStep(2));
    
    nextBtn.addEventListener('click', async () => {
        if (userData.images.length > 0) {
            nextBtn.disabled = true;
            
            removeLastInputArea();
            
            showTypingIndicator();
            await new Promise(resolve => setTimeout(resolve, 600));
            hideTypingIndicator();
            
            await addBotMessage(`Got it! I can see ${userData.images.length} image${userData.images.length > 1 ? 's' : ''}. Let me analyze ${userData.images.length > 1 ? 'them' : 'it'}... 🔍`, 100);
            
            showAnalysisLoader('Analyzing images...');
            
            try {
                const result = await callValidateAPI();
                hideTypingIndicator();
                
                if (!result || !result.validation) {
                    throw new Error('Invalid response from validation API');
                }
                
                updateValidatedData({
                    itemDescription: result.validation.itemDescription || '',
                    damageDescription: result.validation.damageDescription || '',
                    aiSummary: result.validation.summary || '',
                    surfaceMaterial: result.validation.material || '',
                    damageType: result.validation.damageType || '',
                    additionalNotes: '',
                    imageCount: userData.images.length
                });
                
                showStep(4);
                
            } catch (error) {
                hideTypingIndicator();
                console.error('Validation error:', error);
                
                showTypingIndicator();
                await new Promise(resolve => setTimeout(resolve, 800));
                hideTypingIndicator();
                
                await addBotMessage("Oops! I had trouble analyzing those images. This could be because:", 100);
                
                showTypingIndicator();
                await new Promise(resolve => setTimeout(resolve, 600));
                hideTypingIndicator();
                
                await addBotMessage("• The images are unclear or too dark<br>• The damage isn't visible enough<br>• There's a temporary connection issue", 400);
                
                showTypingIndicator();
                await new Promise(resolve => setTimeout(resolve, 600));
                hideTypingIndicator();
                
                await addBotMessage("Would you like to try uploading different photos? 📸", 700);
                
                // Re-enable the next button for retry
                nextBtn.disabled = false;
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

    const buttonText = 'Analyze';
    nextBtn.textContent = `${buttonText} (${userData.images.length}/${CONFIG.MAX_IMAGES})`;
    nextBtn.disabled = userData.images.length === 0;
}
