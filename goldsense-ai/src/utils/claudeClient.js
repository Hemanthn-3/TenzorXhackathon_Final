const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY;
// The proxy configured in vite.config.js will redirect this to https://api.anthropic.com
const CLAUDE_URL = '/api/claude/v1/messages';

export async function callClaude({ 
  systemPrompt, 
  userText, 
  imageDataURL, 
  maxTokens = 1000 
}) {
  if (!CLAUDE_API_KEY) {
    console.error('VITE_CLAUDE_API_KEY not set in .env');
    alert('VITE_CLAUDE_API_KEY is missing! Did you add it and restart your dev server?');
    return null;
  }

  try {
    // Build content array
    const content = [];

    // Add image if provided
    if (imageDataURL) {
      const base64 = imageDataURL.split(',')[1];
      const media_type = imageDataURL.startsWith('data:image/png') 
        ? 'image/png' 
        : 'image/jpeg';
      
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type,
          data: base64
        }
      });
    }

    // Add text
    content.push({ type: "text", text: userText });

    const requestBody = {
      model: "claude-3-5-sonnet-20241022",
      max_tokens: maxTokens,
      temperature: 0.1,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content
      }]
    };

    let retries = 3;
    let response;
    
    while (retries > 0) {
      response = await fetch(CLAUDE_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const err = await response.json();
        const errMsg = err.error?.message || JSON.stringify(err);
        
        // Handle Rate limits (429)
        if (response.status === 429) {
          console.warn(`Claude rate limited. Retrying... (${retries - 1} left). Error: ${errMsg}`);
          if (retries === 1) {
             alert('Claude API Error: ' + errMsg);
             return null;
          }
          await new Promise(r => setTimeout(r, 4000));
          retries--;
          continue;
        }
        
        console.error('Claude API error:', err);
        alert('Claude API Error: ' + errMsg);
        return null;
      }
      
      break;
    }

    const data = await response.json();
    const text = data.content?.[0]?.text;
    
    if (!text) {
      console.error('Claude returned empty response', data);
      return null;
    }

    return text;

  } catch (error) {
    console.error('Claude API call failed:', error);
    alert('Claude Network Error: ' + error.message);
    return null;
  }
}
