#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const BLOG_DIR = path.join(__dirname, 'blog');
const OUTPUT_FILE = path.join(__dirname, 'published.json');

if (!ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY not set');
  process.exit(1);
}

if (!PEXELS_API_KEY) {
  console.error('Error: PEXELS_API_KEY not set');
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
      const jsonMatch = parsed.content[0].text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
    throw new Error('Invalid response from Claude API');
  } catch (err) {
    console.error('Error generating blog post:', err.message);
    throw err;
  }
}

// Fetch image from Pexels
async function fetchPexelsImage(keyword) {
  const options = {
    hostname: 'api.pexels.com',
    port: 443,
    path: `/v1/search?query=${encodeURIComponent(keyword)}&per_page=1`,
    method: 'GET',
    headers: {
      'Authorization': PEXELS_API_KEY
    }
  };

  try {
    const response = await httpsRequest(options);
    const data = JSON.parse(response);
    
    if (data.photos && data.photos.length > 0) {
      return {
        url: data.photos[0].src.medium,
        photographer: data.photos[0].photographer,
        source: 'Pexels'
      };
    }
    return {
      url: `https://via.placeholder.com/800x400?text=${encodeURIComponent(keyword)}`,
      photographer: 'Placeholder',
      source: 'Placeholder'
    };
  } catch (err) {
    console.error('Error fetching image:', err.message);
    return {
      url: `https://via.placeholder.com/800x400?text=${encodeURIComponent(keyword)}`,
      photographer: 'Placeholder',
      source: 'Placeholder'
    };
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

    // Fetch image
    const image = await fetchPexelsImage(randomTopic);
    console.log(`Fetched image from ${image.source}`);

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
    body { font-family: Georgia, serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #08101E; }
    img { max-width: 100%; height: auto; margin: 20px 0; }
    .meta { color: #666; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>${post.title}</h1>
  <p class="meta">Published: ${new Date().toLocaleDateString()}</p>
  <img src="${image.url}" alt="${post.title}">
  <p class="meta">Photo by ${image.photographer} via ${image.source}</p>
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
      image: image.url,
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
