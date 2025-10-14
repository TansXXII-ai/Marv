const https = require('https');

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

    // Azure OpenAI Configuration
    const endpoint = 'https://magroupai.openai.azure.com';
    const apiKey = process.env.AZURE_OPENAI_KEY;
    const assistantId = 'asst_C4YVnC4eSMXNDibjfqB4b3tF';
    const apiVersion = '2024-05-01-preview';

    if (!apiKey) {
      throw new Error('Azure OpenAI API key not configured');
    }

    // Call the AI Assistant
    const aiResponse = await callMagicmanAI(
      endpoint,
      apiKey,
      assistantId,
      apiVersion,
      text,
      images,
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
