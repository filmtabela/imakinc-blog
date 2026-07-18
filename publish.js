#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const BLOG_DIR = path.join(__dirname, 'blog');
const OUTPUT_FILE = path.join(__dirname, 'published.json');

if (!ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY not set');
  process.exit(1);
}

// Ensure blog directory exists
if (!fs.existsSync(BLOG_DIR)) {
  fs.mkdirSync(BLOG_DIR, { recursive: true });
}

// Helper to make HTTPS requests
function httpsRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        } else {
          resolve(responseData);
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Call Anthropic API to generate blog post
async function generateBlogPost(topic) {
  const payload = JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: `Write a comprehensive blog post about: "${topic}". 
                
Format as JSON with the following structure:
{
  "title": "Post Title",
  "excerpt": "Brief 1-2 sentence summary",
  "content": "Full blog post content in HTML (use <p>, <h2>, <ul>, <li> tags)"
}

Only output valid JSON, no markdown or extra text.`
      }
    ]
  });

  const options = {
    hostname: 'api.anthropic.com',
    port: 443,
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    }
  };

  try {
    const response = await httpsRequest(options, payload);
    const parsed = JSON.parse(response);
    
    if (parsed.content && parsed.content[0] && parsed.content[0].text) {
      let text = parsed.content[0].text.trim();
      
      // Strip markdown code fences if present
      text = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
      
      // Try to extract JSON object
      let jsonStr = text;
      if (text.includes('{')) {
        const startIdx = text.indexOf('{');
        const endIdx = text.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          jsonStr = text.substring(startIdx, endIdx + 1);
        }
      }
      
      const post = JSON.parse(jsonStr);
      if (post.title && post.content) {
        return post;
      }
    }
    throw new Error('Invalid response format from Claude API');
  } catch (err) {
    console.error('Error generating blog post:', err.message);
    throw err;
  }
}

// Main publish function
async function publish() {
  const topics = [
    'Study Opportunities in Australia',
    'Overseas Education Benefits',
    'Student Visa Process in 2026',
    'Affordable Universities Abroad',
    'Career Prospects After Studying Overseas'
  ];

  const randomTopic = topics[Math.floor(Math.random() * topics.length)];
  console.log(`Publishing: ${randomTopic}`);

  try {
    // Generate blog post
    const post = await generateBlogPost(randomTopic);
    console.log(`Generated post: ${post.title}`);

    // Create filename
    const slug = post.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${timestamp}-${slug}`;

    // Generate HTML
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${post.title}</title>
  <style>
    body { font-family: Georgia, serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
    h1 { color: #08101E; border-bottom: 2px solid #197CC0; padding-bottom: 10px; }
    h2 { color: #197CC0; margin-top: 20px; }
    .meta { color: #666; font-size: 0.9em; font-style: italic; }
    p { text-align: justify; }
  </style>
</head>
<body>
  <h1>${post.title}</h1>
  <p class="meta">Published: ${new Date().toLocaleDateString()}</p>
  <div>${post.content}</div>
</body>
</html>`;

    // Write HTML file
    const htmlPath = path.join(BLOG_DIR, `${filename}.html`);
    fs.writeFileSync(htmlPath, htmlContent);
    console.log(`Written: ${htmlPath}`);

    // Update published.json
    const published = fs.existsSync(OUTPUT_FILE) 
      ? JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8')) 
      : [];
    
    published.push({
      title: post.title,
      slug: filename,
      date: new Date().toISOString(),
      excerpt: post.excerpt
    });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(published, null, 2));
    console.log(`Updated: ${OUTPUT_FILE}`);

    console.log('✓ Publish complete');
  } catch (err) {
    console.error('Publish failed:', err.message);
    process.exit(1);
  }
}

// Run
publish();
