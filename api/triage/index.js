const https = require('https');
const { BlobServiceClient } = require('@azure/storage-blob');
const { parse } = require('querystring');

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

    // Upload images to Azure Blob Storage
    let imageUrls = [];
    if (formData.images && formData.images.length > 0) {
      context.log(`Uploading ${formData.images.length} images to Blob Storage...`);
      
      try {
        imageUrls = await uploadImagesToBlob(formData.images, context);
        context.log('Images uploaded successfully. URLs:', imageUrls);
      } catch (uploadError) {
        context.log.error('Error uploading images:', uploadError);
        // Continue even if image upload fails - AI will analyze text only
      }
    } else {
      context.log('No images provided in request');
    }

    // Azure OpenAI Configuration
    const endpoint = 'https://magroupai.openai.azure.com';
    const apiKey = process.env.AZURE_OPENAI_KEY;
    const assistantId = 'asst_C4YVnC4eSMXNDibjfqB4b3tF';
    const apiVersion = '2024-05-01-preview';

    if (!apiKey) {
      throw new Error('Azure OpenAI API key not configured');
    }

    // Call the AI Assistant with uploaded image URLs
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
  
  const boundary = '--' + boundaryMatch[1];
  const rawBody = req.rawBody || req.body;
  
  // Split by boundary
  const parts = rawBody.toString('binary').split(boundary);
  
  const formData = {
    name: '',
    email: '',
    postcode: '',
    text: '',
    images: []
  };

  for (const part of parts) {
    if (!part || part === '--\r\n' || part === '--') continue;

    // Parse headers
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;

    const headers = part.substring(0, headerEnd);
    const content = part.substring(headerEnd + 4, part.length - 2); // Remove trailing \r\n

    // Extract field name
    const nameMatch = headers.match(/name="([^"]+)"/);
    if (!nameMatch) continue;

    const fieldName = nameMatch[1];

    // Check if it's a file
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    
    if (filenameMatch) {
      // It's a file
      const filename = filenameMatch[1];
      const contentTypeMatch = headers.match(/Content-Type: (.+)/);
      const contentType = contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream';

      // Convert binary string to buffer
      const buffer = Buffer.from(content, 'binary');
      
      formData.images.push({
        filename: filename,
        contentType: contentType,
        buffer: buffer
      });
      
      context.log(`Parsed image: ${filename}, size: ${buffer.length} bytes, type: ${contentType}`);
    } else {
      // It's a text field
      formData[fieldName] = content;
    }
  }

  return formData;
}

async function uploadImagesToBlob(images, context) {
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
      
      // Get the public URL
      const imageUrl = blockBlobClient.url;
      uploadedUrls.push(imageUrl);
      
      context.log(`Successfully uploaded: ${imageUrl}`);
    } catch (error) {
      context.log.error(`Error uploading image ${i}:`, error.message);
      // Continue with other images even if one fails
    }
  }

  context.log(`Total images uploaded: ${uploadedUrls.length}`);
  return uploadedUrls;
}

async function callMagicmanAI(endpoint, apiKey, assistantId, apiVersion, text, images, context) {
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

    // Step 2: Add message to thread
    context.log('Adding message to thread...');
    
    // Build the message content
    const messageContent = [
      {
        type: 'text',
        text: `Customer damage description: ${text}\n\nPlease analyse this damage and provide your triage decision.`
      }
    ];

    // Add images if provided
    if (images && images.length > 0) {
      images.forEach((imageUrl, index) => {
        messageContent.push({
          type: 'image_url',
          image_url: {
            url: imageUrl
          }
        });
      });
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
    const maxAttempts = 30;

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

      if (runStatus.status === 'failed' || runStatus.status === 'cancelled' || runStatus.status === 'expired') {
        throw new Error(`Assistant run ${runStatus.status}: ${runStatus.last_error?.message || 'Unknown error'}`);
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
