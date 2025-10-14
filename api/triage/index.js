const https = require('https');
const { BlobServiceClient } = require('@azure/storage-blob');

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
    // Get the form data from the request
    const { text, images, name, email, postcode } = req.body;

    // Log received data (for debugging)
    context.log('Triage request received:', {
      name,
      email,
      postcode,
      descriptionLength: text?.length,
      imageCount: images?.length
    });

    // Upload images to Azure Blob Storage
    let imageUrls = [];
    if (images && images.length > 0) {
      context.log('Uploading images to Blob Storage...');
      context.log('Number of images received:', images.length);
      context.log('First image preview (first 100 chars):', images[0].substring(0, 100));
      
      try {
        imageUrls = await uploadImagesToBlob(images, context);
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
      text,
      imageUrls, // Send the blob storage URLs instead of base64
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
    
    // Return detailed error for debugging
    context.res = {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: {
        error: 'Failed to analyse damage',
        message: error.message,
        stack: error.stack,
        details: {
          hasApiKey: !!process.env.AZURE_OPENAI_KEY,
          endpoint: 'https://magroupai.openai.azure.com',
          assistantId: 'asst_C4YWrfzcSMXYNbBtGB4c3Fi'
        }
      }
    };
  }
};

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
    const maxAttempts = 30; // 30 seconds timeout

    while (runStatus.status !== 'completed' && attempts < maxAttempts) {
      await sleep(1000); // Wait 1 second
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

    // Get the assistant's response (first message)
    const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
    if (!assistantMessage) {
      throw new Error('No assistant response found');
    }

    // Extract the JSON response from the assistant's message
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

async function uploadImagesToBlob(images, context) {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  
  context.log('Checking connection string...');
  context.log('Connection string exists:', !!connectionString);
  
  if (!connectionString) {
    throw new Error('Azure Storage connection string not configured');
  }

  context.log('Initializing Blob Service Client...');
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerName = 'customer-images';
  const containerClient = blobServiceClient.getContainerClient(containerName);

  context.log(`Using container: ${containerName}`);
  
  const uploadedUrls = [];

  for (let i = 0; i < images.length; i++) {
    try {
      const imageData = images[i];
      
      context.log(`Processing image ${i + 1}/${images.length}`);
      context.log(`Image data length: ${imageData.length}`);
      
      // Check if it's a base64 data URL or already a URL
      if (imageData.startsWith('data:')) {
        // Extract base64 data from data URL
        const matches = imageData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          context.log.warn(`Invalid image data format for image ${i}`);
          continue;
        }

        const contentType = matches[1];
        const base64Data = matches[2];
        
        context.log(`Content type: ${contentType}`);
        
        // Convert base64 to buffer
        const imageBuffer = Buffer.from(base64Data, 'base64');
        context.log(`Image buffer size: ${imageBuffer.length} bytes`);
        
        // Generate unique filename
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const extension = contentType.split('/')[1] || 'jpg';
        const blobName = `upload-${timestamp}-${random}.${extension}`;
        
        context.log(`Uploading as: ${blobName}`);
        
        // Upload to blob storage
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.upload(imageBuffer, imageBuffer.length, {
          blobHTTPHeaders: { blobContentType: contentType }
        });
        
        // Get the public URL
        const imageUrl = blockBlobClient.url;
        uploadedUrls.push(imageUrl);
        
        context.log(`Successfully uploaded image ${i + 1}: ${imageUrl}`);
      } else {
        // Already a URL, use as-is
        context.log(`Image ${i + 1} is already a URL: ${imageData.substring(0, 50)}...`);
        uploadedUrls.push(imageData);
      }
    } catch (error) {
      context.log.error(`Error uploading image ${i}:`, error.message);
      context.log.error('Error stack:', error.stack);
      // Continue with other images even if one fails
    }
  }

  context.log(`Total images uploaded: ${uploadedUrls.length}`);
  return uploadedUrls;
}
