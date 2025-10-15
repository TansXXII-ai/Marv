const https = require('https');
const { BlobServiceClient } = require('@azure/storage-blob');
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

    // Upload images to Blob Storage and get SAS URLs
    let imageUrls = [];
    if (formData.images && formData.images.length > 0) {
      context.log(`Processing ${formData.images.length} images...`);
      
      try {
        // Upload to Blob Storage with SAS tokens
        imageUrls = await uploadImagesToBlobWithSAS(formData.images, context);
        context.log(`Images uploaded to Blob Storage. URLs ready for AI`);
      } catch (uploadError) {
        context.log.error('Error uploading images:', uploadError);
        // Continue - AI will analyze text only
      }
    } else {
      context.log('No images provided in request');
    }

    // Call the AI Assistant with image URLs
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
  const contentType = req.headers['content-type'] || '';
  
  if (!contentType.includes('multipart/form-data')) {
    throw new Error('Content-Type must be multipart/form-data');
  }

  // Extract boundary from content-type
  const boundaryMatch = contentType.match(/boundary=(.+)$/);
  if (!boundaryMatch) {
    throw new Error('No boundary found in multipart data');
  }
  
  const boundary = Buffer.from('--' + boundaryMatch[1]);
  const rawBody = req.rawBody || req.body;
  
  // Ensure we have a Buffer
  const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
  
  const formData = {
    name: '',
    email: '',
    postcode: '',
    text: '',
    images: []
  };

  // Split by boundary using Buffer methods
  let position = 0;
  while (position < bodyBuffer.length) {
    // Find next boundary
    const boundaryIndex = bodyBuffer.indexOf(boundary, position);
    if (boundaryIndex === -1) break;
    
    // Find end of this part (next boundary)
    const nextBoundaryIndex = bodyBuffer.indexOf(boundary, boundaryIndex + boundary.length);
    if (nextBoundaryIndex === -1) break;
    
    // Extract this part
    const partStart = boundaryIndex + boundary.length + 2; // +2 for \r\n
    const partEnd = nextBoundaryIndex - 2; // -2 for \r\n before boundary
    const part = bodyBuffer.slice(partStart, partEnd);
    
    // Find header/body separator (\r\n\r\n)
    const separator = Buffer.from('\r\n\r\n');
    const separatorIndex = part.indexOf(separator);
    if (separatorIndex === -1) {
      position = nextBoundaryIndex;
      continue;
    }
    
    // Extract headers and content
    const headers = part.slice(0, separatorIndex).toString('utf8');
    const content = part.slice(separatorIndex + 4); // +4 for \r\n\r\n
    
    // Parse field name
    const nameMatch = headers.match(/name="([^"]+)"/);
    if (!nameMatch) {
      position = nextBoundaryIndex;
      continue;
    }
    
    const fieldName = nameMatch[1];
    
    // Check if it's a file
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    
    if (filenameMatch) {
      // It's a file - keep as Buffer (don't convert to string!)
      const filename = filenameMatch[1];
      const contentTypeMatch = headers.match(/Content-Type: (.+)/);
      const contentType = contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream';
      
      formData.images.push({
        filename: filename,
        contentType: contentType,
        buffer: content // Pure Buffer - not converted to string!
      });
      
      context.log(`Parsed image: ${filename}, size: ${content.length} bytes, type: ${contentType}`);
    } else {
      // It's a text field
      formData[fieldName] = content.toString('utf8').trim();
    }
    
    position = nextBoundaryIndex;
  }

  return formData;
}

async function uploadImagesToBlobWithSAS(images, context) {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  
  if (!connectionString) {
    throw new Error('Azure Storage connection string not configured');
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerName = 'marv-images';
  const containerClient = blobServiceClient.getContainerClient(containerName);
  
  const uploadedUrls = [];

  for (let i = 0; i < images.length; i++) {
    try {
      const image = images[i];
      
      context.log(`Uploading image ${i + 1}/${images.length}: ${image.filename}`);
      
      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const extension = image.filename.split('.').pop() || 'jpg';
      const blobName = `upload-${timestamp}-${random}.${extension}`;
      
      // Upload to blob storage
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.upload(image.buffer, image.buffer.length, {
        blobHTTPHeaders: { blobContentType: image.contentType }
      });
      
      // Generate SAS token with read permissions (valid for 24 hours)
      const sasUrl = await blockBlobClient.generateSasUrl({
        permissions: 'r',
        expiresOn: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
      
      uploadedUrls.push(sasUrl);
      
      context.log(`Successfully uploaded: ${blobName}`);
    } catch (error) {
      context.log.error(`Error uploading image ${i}:`, error.message);
      // Continue with other images even if one fails
    }
  }

  context.log(`Total images uploaded: ${uploadedUrls.length}`);
  return uploadedUrls;
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

    // Step 2: Add message to thread with images
    context.log('Adding message to thread...');
    
    // Build message content with text and images
    const messageContent = [
      {
        type: 'text',
        text: `Customer damage description: ${text}\n\nPlease analyse this damage and provide your triage decision.`
      }
    ];

    // Add images as image_url content (using Blob Storage SAS URLs)
    if (imageUrls && imageUrls.length > 0) {
      imageUrls.forEach(imageUrl => {
        messageContent.push({
          type: 'image_url',
          image_url: {
            url: imageUrl
          }
        });
      });
      context.log(`Adding ${imageUrls.length} images to message`);
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
