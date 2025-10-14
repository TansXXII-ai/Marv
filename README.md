# Marv Widget - Magicman Automated Repair Validator

An embeddable AI-powered chat widget for damage assessment and repair estimation.

## 📁 Repository Structure

```
marv-widget/
├── index.html              # Demo page
├── widget/
│   ├── marv-widget.js     # Main widget JavaScript
│   ├── marv-widget.css    # Widget styles
│   └── embed.html         # Integration guide for customers
├── README.md              # This file
└── .gitignore
```

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/marv-widget.git
cd marv-widget
```

### 2. Test Locally

Open `index.html` in your browser to see the demo. The widget will appear as a chat bubble in the bottom-right corner.

### 3. Deploy to Azure Static Web Apps

#### Option A: GitHub Actions (Recommended)

1. Create an Azure Static Web App in the Azure Portal
2. Connect it to your GitHub repository
3. Azure will automatically set up a GitHub Actions workflow
4. Every push to `main` will auto-deploy

#### Option B: Azure CLI

```bash
# Install Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Login to Azure
az login

# Create and deploy
az staticwebapp create \
  --name marv-widget \
  --resource-group your-resource-group \
  --source . \
  --location "West Europe" \
  --branch main
```

## 🔧 Configuration

### API Endpoint

Update the `apiBase` in your configuration:

```javascript
window.MARV_CONFIG = {
  apiBase: 'https://your-function-app.azurewebsites.net'
};
```

### Azure Function Expected Format

The widget expects your `/triage` endpoint to accept:

```json
{
  "text": "Damage description",
  "images": ["url1", "url2"],
  "name": "Customer name",
  "email": "customer@email.com",
  "postcode": "SW1A 1AA"
}
```

And respond with:

```json
{
  "decision": "REPAIRABLE_SPOT",
  "confidence_0to1": 0.85,
  "reasons": [
    "Small surface damage detected",
    "Material appears to be suitable for spot repair"
  ]
}
```

### Decision Types

- `REPAIRABLE_SPOT` - Green border
- `REPAIRABLE_FULL_RESURFACE` - Blue border
- `NCD` (Not Cost-Effective to Repair) - Red border
- `NEEDS_MORE_INFO` - Amber border

## 📸 Image Upload

### Current Implementation

Images are currently stored as base64 preview URLs. For production, you need to:

1. Upload images to Azure Blob Storage
2. Replace the TODO comment in `marv-widget.js` (line ~264)
3. Return the Blob Storage URLs in the `images` array

### Azure Blob Storage Integration Example

```javascript
async uploadToAzure(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${this.apiBase}/upload`, {
    method: 'POST',
    body: formData
  });
  
  const data = await response.json();
  return data.url; // Return the blob storage URL
}
```

## 🎨 Customization

### Colors

Edit CSS variables in `widget/marv-widget.css`:

```css
:root {
  --marv-primary: #0A3B6B;    /* Navy blue */
  --marv-accent: #42C2FF;     /* Light blue */
}
```

### Position

Override in your site's CSS:

```css
.marv-bubble {
  bottom: 20px !important;
  left: 20px !important;  /* Move to left side */
}
```

## 📦 Embedding on Customer Sites

Customers can add the widget to their site with 3 lines of code:

```html
<!-- In <head> -->
<link rel="stylesheet" href="https://your-site.azurestaticapps.net/widget/marv-widget.css">

<!-- Before </body> -->
<script>
  window.MARV_CONFIG = { apiBase: 'https://your-function-app.azurewebsites.net' };
</script>
<script src="https://your-site.azurestaticapps.net/widget/marv-widget.js"></script>
```

See `widget/embed.html` for a complete integration guide.

## 🔒 CORS Configuration

Ensure your Azure Function allows requests from customer domains:

```json
{
  "cors": {
    "allowedOrigins": ["*"],
    "supportCredentials": false
  }
}
```

For production, replace `"*"` with specific customer domains.

## 📱 Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 🐛 Troubleshooting

### Widget doesn't appear
- Check browser console for errors
- Verify CSS and JS files are loading (Network tab)
- Ensure `window.MARV_CONFIG` is set before script loads

### API errors
- Check CORS settings on Azure Function
- Verify API endpoint URL is correct
- Test API directly with Postman/curl

### Images not uploading
- Implement Azure Blob Storage upload (see TODO in code)
- Check file size limits (browser and Azure)
- Verify content-type headers

## 📄 License

Copyright © 2024 Magicman. All rights reserved.

## 🤝 Support

For integration support, contact: support@magicman.com

---

**Built with vanilla JavaScript** - No frameworks, just clean, embeddable code.
