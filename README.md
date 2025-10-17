# MARV - Magicman AI Damage Assessment Widget

An AI-powered damage assessment widget that allows customers to submit photos and receive instant repair feasibility analysis using Azure OpenAI's vision capabilities.

## 🎯 Features

- **Multi-step Form**: Guided user experience collecting customer information
- **Smart Image Upload**: Drag-and-drop interface supporting up to 9 images
- **AI Validation**: Initial quick analysis of uploaded images
- **User Confirmation**: Customers can verify and correct AI assessments
- **Detailed Analysis**: Comprehensive repair feasibility results with confidence scores
- **Editable Summaries**: Users can correct AI-generated summaries for improved training data
- **Modular Architecture**: Clean, maintainable codebase split into focused modules

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Vanilla JavaScript (ES6 Modules)
- **Styling**: CSS3 with responsive design
- **Backend**: Azure Functions (Node.js 18)
- **AI**: Azure OpenAI GPT-4o-mini with vision API
- **Hosting**: Azure Static Web Apps
- **Build Tool**: esbuild
- **Deployment**: GitHub Actions (CI/CD)

### Project Structure
```
/Marv
├── index.html                          # Test/demo page
├── widget/
│   ├── marv-widget.js                  # Main entry point
│   ├── marv-widget.css                 # Complete widget styles
│   ├── package.json                    # Build configuration
│   ├── core/                           # Core functionality
│   │   ├── config.js                   # Configuration & constants
│   │   ├── state.js                    # State management
│   │   └── init.js                     # Widget initialization
│   ├── utils/                          # Utility functions
│   │   ├── helpers.js                  # Helper functions
│   │   ├── validators.js               # Validation logic
│   │   └── api.js                      # API communication
│   ├── steps/                          # Widget steps (7 steps)
│   │   ├── step-router.js              # Step routing
│   │   ├── step1-name.js               # Name input
│   │   ├── step2-email.js              # Email input
│   │   ├── step3-postcode.js           # Postcode input
│   │   ├── step4-description.js        # Damage description
│   │   ├── step5-images.js             # Image upload
│   │   ├── step6-validation.js         # AI validation confirmation
│   │   └── step7-results.js            # Results display
│   ├── components/                     # Reusable components
│   │   ├── loading.js                  # Loading spinner
│   │   └── error.js                    # Error display
│   └── parsers/                        # Data parsers
│       └── ai-response.js              # AI response parser
├── api/                                # Azure Functions
│   ├── validate/                       # Quick image validation
│   │   ├── index.js
│   │   └── function.json
│   ├── triage/                         # Full repair analysis
│   │   ├── index.js
│   │   └── function.json
│   ├── host.json
│   └── package.json
└── .github/
    └── workflows/
        └── azure-static-web-apps-*.yml # CI/CD pipeline
```

## 🚀 Deployment

### Prerequisites
- Azure subscription
- GitHub account
- Node.js 18+ (for local development)

### Azure Resources

**Azure Static Web App**: `Marv-Chatbot`
- URL: https://ashy-forest-06915f903.2.azurestaticapps.net
- Tier: Standard
- Region: Automatic

**Azure OpenAI**: `magroupAI`
- Endpoint: https://magroupai.openai.azure.com
- Deployment: gpt-4o-mini
- API Version: 2024-08-01-preview
- Region: UK South

### Environment Variables

Set in Azure Static Web App → Configuration:
```
AZURE_OPENAI_ENDPOINT=https://magroupai.openai.azure.com
AZURE_OPENAI_API_KEY=[your-key]
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_API_VERSION=2024-08-01-preview
```

### Automatic Deployment

Every push to `main` triggers automatic deployment via GitHub Actions:

1. ✅ Checkout code
2. ✅ Setup Node.js 18
3. ✅ Install dependencies
4. ✅ Build widget bundle (esbuild)
5. ✅ Deploy to Azure Static Web Apps

## 🛠️ Local Development

### Setup
```bash
# Clone repository
git clone https://github.com/TansXXII-ai/Marv.git
cd Marv

# Install widget dependencies
cd widget
npm install
```

### Build Widget
```bash
# Production build (minified)
npm run build

# Development build (watch mode)
npm run dev

# Development build (single run)
npm run build:dev
```

### Test Locally
```bash
# Serve the site
npx http-server . -p 8080

# Open in browser
open http://localhost:8080
```

## 📝 Widget Integration

To integrate the widget into any website:
```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="widget/marv-widget.css">
</head>
<body>
    <!-- Your page content -->
    
    <!-- Widget container -->
    <div id="marv-widget"></div>
    
    <!-- Load widget -->
    <script src="widget/dist/marv-widget.bundle.js"></script>
</body>
</html>
```

## 🔧 Configuration

### Customizing Decision Colors

Edit `widget/core/config.js`:
```javascript
export const DECISION_COLORS = {
    'REPAIRABLE_COSMETIC': '#10b981',       // Green
    'REPAIRABLE_FULL_RESURFACE': '#3b82f6', // Blue
    'NOT_REPAIRABLE': '#ef4444',            // Red
    'NEEDS_ASSESSMENT': '#f59e0b'           // Amber
};
```

### Adjusting Upload Limits

Edit `widget/core/config.js`:
```javascript
export const CONFIG = {
    MAX_IMAGES: 9,                           // Maximum images
    MAX_FILE_SIZE: 10 * 1024 * 1024,        // 10MB per image
};
```

## 📊 Widget Flow

1. **Step 1**: Name input
2. **Step 2**: Email input
3. **Step 3**: Postcode input
4. **Step 4**: Damage description
5. **Step 5**: Image upload (up to 9 images)
6. **Step 6**: AI validation & user confirmation
7. **Step 7**: Final analysis with results

## 🎨 Results Display

The results page includes:
- **Color-coded decision card** (Green/Blue/Red/Amber)
- **Confidence bar** with percentage
- **Analysis reasons** in bullet points
- **Editable AI summary** (user corrections logged)
- **Additional information** (collapsible)
- **Action buttons** (Start Over, Contact Us)

## 📦 API Endpoints

### `/api/validate` (POST)
Quick image validation before full analysis.

**Input**: Multipart form with images + description  
**Output**: JSON with material, damage type, and summary

### `/api/triage` (POST)
Final repair feasibility analysis.

**Input**: Multipart form with images + validated metadata  
**Output**: JSON with decision, confidence, and reasons

## 🐛 Troubleshooting

### Build Fails
```bash
cd widget
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Widget Doesn't Load
- Check browser console for errors
- Verify `widget/dist/marv-widget.bundle.js` exists
- Ensure `index.html` points to correct path

### GitHub Actions Fails
- Check Actions tab for detailed logs
- Verify Azure deployment token is valid
- Ensure all module files are committed

## 📈 Future Enhancements

- [ ] Azure Blob Storage for image handling
- [ ] Enhanced error handling and user feedback
- [ ] Analytics dashboard in Application Insights
- [ ] Automated testing suite
- [ ] User correction data logging endpoint
- [ ] Multi-language support

## 📄 License

Proprietary - Innoflex/Magicman

## 🤝 Contributing

This is a private repository. Contact the development team for contribution guidelines.

## 📞 Support

For issues or questions:
- Check Azure Portal: Innoflex Azure subscription
- GitHub Issues: https://github.com/TansXXII-ai/Marv/issues
- Documentation: See `/docs` folder (coming soon)

---

**Built with ❤️ for Magicman by Innoflex**
