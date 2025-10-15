const https = require('https');
const Busboy = require('busboy');

module.exports = async function (context, req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
    return;
  }

  try {
    // Parse multipart form data
    const formData = await parseMultipartFormData(req, context);
    
    context.log('Form data parsed:', {
      name: formData.name,
      email: formData.email,
      postcode: formData.postcode,
      descriptionLength: formData.text?.length,
      imageCount: formData.images?.length
    });

    // Azure OpenAI Configuration
    const endpoint = 'https://magroupai.openai.azure.com';
    const apiKey = process.env.AZURE_OPENAI_KEY;
    const assistantId = 'asst_C4YVnC4eSMXNDibjfqB4b3tF';
    const apiVersion = '2024-02-15-preview';

    if (!apiKey) {
      throw new Error('Azure OpenAI API key not configured');
    }

    // Get base64 image data URLs from the parsed form
    let imageUrls = [];
    if (formData.images && formData.images.length > 0) {
      context.log(`Processing ${formData.images.length} images...`);
      
      // Convert image buffers to base64 data URLs
      imageUrls = formData.images.map(img => {
        const base64 = img.buffer.toString('base64');
        return `data:${img.contentType};base64,${base64}`;
      });
      
      context.log(`Converted ${imageUrls.length} images to base64 data URLs`);
    } else {
      context.log('No images provided in request');
    }

    // Call the AI Assistant with base64 image data URLs
    const aiResponse = await callMagicmanAI(
      endpoint,
      apiKey,
      assistantId,
      apiVersion,
      formData.text,
      imageUrls,
      context
    );

    // Return the AI's response
    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: {
        decision: aiResponse.decision,
        confidence_0to1: aiResponse.confidence_0to1,
        reasons: aiResponse.reasons
      }
    };

  } catch (error) {
    context.log.error('Error processing triage:', error);
    
    context.res = {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: {
        error: 'Failed to analyse damage',
        message: error.message
      }
    };
  }
};

async function parseMultipartFormData(req, context) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ 
      headers: req.headers,
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit per file
      }
    });
    
    const formData = {
      name: '',
      email: '',
      postcode: '',
      text: '',
      images: []
    };
    
    const fileBuffers = [];

    // Handle text fields
    busboy.on('field', (fieldname, value) => {
      formData[fieldname] = value;
    });

    // Handle file uploads
    busboy.on('file', (fieldname, fileStream, fileInfo) => {
      const { filename, mimeType } = fileInfo;
      const chunks = [];
      
      fileStream.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      fileStream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        formData.images.push({
          filename: filename,
          contentType: mimeType,
          buffer: buffer
        });
        context.log(`Parsed file: ${filename}, size: ${buffer.length} bytes, type: ${mimeType}`);
      });
      
      fileStream.on('error', (err) => {
        context.log.error(`Error reading file ${filename}:`, err);
      });
    });

    // Handle completion
    busboy.on('finish', () => {
      resolve(formData);
    });

    // Handle errors
    busboy.on('error', (err) => {
      reject(err);
    });

    // Pipe the request to busboy
    const rawBody = req.rawBody || req.body;
    const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
    
    // Create a readable stream from the buffer
    const { Readable } = require('stream');
    const stream = Readable.from(bodyBuffer);
    stream.pipe(busboy);
  });
}

async function callMagicmanAI(endpoint, apiKey, assistantId, apiVersion, text, imageUrls, context) {
  try {
    // Step 1: Create a thread
    context.log('Creating thread...');
    const thread = await makeRequest(
      endpoint,
      apiKey,
      apiVersion,
      'POST',
      '/openai/threads',
      {}
    );

    // Step 2: Add message to thread with images (as base64 data URLs)
    context.log('Adding message to thread...');
    
    // Build message content with text and images (as base64 data URLs)
    const messageContent = [
      {
        type: 'text',
        text: `Customer damage description: ${text}\n\nPlease analyse this damage and provide your triage decision.`
      }
    ];

    // Add images as base64 data URLs (exactly like the playground does)
    if (imageUrls && imageUrls.length > 0) {
      imageUrls.forEach(imageUrl => {
        messageContent.push({
          type: 'image_url',
          image_url: {
            url: imageUrl,
            detail: 'auto'
          }
        });
      });
      context.log(`Adding ${imageUrls.length} images as base64 data URLs`);
    }

    await makeRequest(
      endpoint,
      apiKey,
      apiVersion,
      'POST',
      `/openai/threads/${thread.id}/messages`,
      {
        role: 'user',
        content: messageContent
      }
    );

    // Step 3: Run the assistant
    context.log('Running assistant...');
    const run = await makeRequest(
      endpoint,
      apiKey,
      apiVersion,
      'POST',
      `/openai/threads/${thread.id}/runs`,
      {
        assistant_id: assistantId
      }
    );

    // Step 4: Wait for completion
    context.log('Waiting for completion...');
    let runStatus = run;
    let attempts = 0;
    const maxAttempts = 60; // Increased timeout for image processing

    while (runStatus.status !== 'completed' && attempts < maxAttempts) {
      await sleep(1000);
      runStatus = await makeRequest(
        endpoint,
        apiKey,
        apiVersion,
        'GET',
        `/openai/threads/${thread.id}/runs/${run.id}`,
        null
      );
      attempts++;

      context.log(`Run status: ${runStatus.status} (attempt ${attempts}/${maxAttempts})`);

      if (runStatus.status === 'failed' || runStatus.status === 'cancelled' || runStatus.status === 'expired') {
        // Log the full run status for debugging
        context.log.error('Run failed. Full status object:', JSON.stringify(runStatus, null, 2));
        const errorMessage = runStatus.last_error?.message || 'Unknown error';
        const errorCode = runStatus.last_error?.code || 'unknown_error';
        context.log.error(`Assistant run ${runStatus.status}: [${errorCode}] ${errorMessage}`);
        throw new Error(`Assistant run ${runStatus.status}: ${errorMessage}`);
      }
    }

    if (runStatus.status !== 'completed') {
      throw new Error('Assistant run timed out');
    }

    // Step 5: Get messages
    context.log('Retrieving messages...');
    const messages = await makeRequest(
      endpoint,
      apiKey,
      apiVersion,
      'GET',
      `/openai/threads/${thread.id}/messages`,
      null
    );

    // Get the assistant's response
    const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
    if (!assistantMessage) {
      throw new Error('No assistant response found');
    }

    const responseText = assistantMessage.content[0].text.value;
    context.log('AI Response:', responseText);

    // Parse JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not find JSON in AI response');
    }

    const aiResult = JSON.parse(jsonMatch[0]);
    
    return aiResult;

  } catch (error) {
    context.log.error('Error calling Magicman AI:', error);
    throw error;
  }
}

function makeRequest(endpoint, apiKey, apiVersion, method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, endpoint);
    url.searchParams.append('api-version', apiVersion);

    const options = {
      method: method,
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Failed to parse response: ' + data));
          }
        } else {
          reject(new Error(`API request failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
