const https = require('https');
const fs = require('fs');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const TOPICS = [
  "MBBS in Russia fees 2026 for Indian students",
  "Study in Singapore without IELTS for Indian students",
  "Best countries for MBBS from India 2026",
  "Canada PR pathway for Indian students through study",
  "Study in Germany free tuition for Indian students",
  "MBBS in Georgia fees and admission process India",
  "Study in Malaysia cheapest option for Indian students",
  "UK student visa process for Indian students 2026",
  "MBBS in Philippines NMC approved colleges India",
  "Study in Dubai without IELTS Indian students",
  "Australia student visa for Indian students 2026",
  "MBBS in Kyrgyzstan fees NMC approved 2026",
  "Study in Malta EU degree for Indian students",
  "No IELTS countries for Indian students to study abroad",
  "MBBS abroad cheapest countries for Indian students",
  "Study abroad scholarships for Indian students 2026",
  "Singapore private college admission for Indian students",
];

const PUBLISHED_FILE = 'published.json';

function getPublished() {
  if (fs.existsSync(PUBLISHED_FILE)) return JSON.parse(fs.readFileSync(PUBLISHED_FILE, 'utf8'));
  return [];
}

function savePublished(list) {
  fs.writeFileSync(PUBLISHED_FILE, JSON.stringify(list, null, 2));
}

function slug(topic) {
  return topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function callClaude(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log('API status:', res.statusCode);
          if (parsed.error) {
            reject(new Error('API error: ' + parsed.error.message));
            return;
          }
          if (!parsed.content || !parsed.content[0]) {
            console.log('Full response:', JSON.stringify(parsed).substring(0, 500));
            reject(new Error('No content in response'));
            return;
          }
          resolve(parsed.content[0].text);
        } catch(e) {
          reject(new Error('Parse error: ' + e.message + ' Raw: ' + data.substring(0, 200)));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function buildArticlePage(topic, content, dateStr, articleSlug) {
  const { title, intro, sections, cta } = content;
  const sectionsHTML = sections.map(s => `<h2>${s.heading}</h2><p>${s.body}</p>`).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title} | IMAK Overseas Education</title>
<meta name="description" content="${intro.substring(0, 155)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;1,400&display=swap" rel="stylesheet">
<style>
:root{--navy:#08101E;--navy-mid:#0D1B2E;--navy-card:#102038;--navy-light:#163050;--border:rgba(25,124,192,0.16);--blue:#197CC0;--blue-b:#2290D8;--white:#FFFFFF;--text:#D8E8F4;--muted:#7DA4BF;}
*{margin:0;padding:0;box-sizing:border-box;}html{scroll-behavior:smooth;}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--navy);color:var(--text);line-height:1.7;}
nav{position:sticky;top:0;z-index:100;background:rgba(8,16,30,0.97);backdrop-filter:blur(14px);border-bottom:1px solid var(--border);}
.nav-inner{max-width:1200px;margin:0 auto;padding:0 2rem;display:flex;align-items:center;justify-content:space-between;height:110px;}
.nav-logo{display:flex;align-items:center;text-decoration:none;flex-shrink:0;}
.nav-logo img{height:80px;width:auto;object-fit:contain;}
.nav-links{display:flex;align-items:center;gap:0.1rem;list-style:none;}
.nav-links a{color:var(--muted);text-decoration:none;font-size:0.82rem;font-weight:500;padding:0.42rem 0.65rem;border-radius:6px;transition:all 0.2s;white-space:nowrap;}
.nav-links a:hover{color:var(--white);background:var(--navy-light);}
.nav-cta{background:var(--blue)!important;color:var(--white)!important;padding:0.42rem 1rem!important;border-radius:7px!important;font-weight:700!important;}
.mob-cta{display:none;gap:0.5rem;}
@media(max-width:960px){.nav-links{display:none;}.mob-cta{display:flex;}}
.btn{display:inline-flex;align-items:center;gap:0.4rem;padding:0.82rem 1.8rem;border-radius:9px;font-weight:700;font-size:0.88rem;text-decoration:none;transition:all 0.2s;}
.btn-blue{background:var(--blue);color:var(--white);}.btn-blue:hover{background:var(--blue-b);}
.btn-out{background:transparent;color:var(--white);border:1px solid var(--border);}.btn-out:hover{border-color:var(--blue-b);color:var(--blue-b);}
.btn-sm{padding:0.45rem 0.9rem;font-size:0.8rem;border-radius:7px;}
.article-hero{background:linear-gradient(160deg,var(--navy) 0%,var(--navy-mid) 100%);padding:4rem 2rem 3rem;border-bottom:1px solid var(--border);}
.article-hero .container{max-width:800px;margin:0 auto;}
.article-date{font-size:0.72rem;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--blue-b);margin-bottom:0.8rem;}
.article-hero h1{font-size:clamp(1.8rem,4vw,2.8rem);font-weight:800;color:var(--white);line-height:1.12;margin-bottom:1rem;}
.article-hero .intro{font-size:1rem;color:var(--muted);line-height:1.7;}
.article-body{max-width:800px;margin:0 auto;padding:3rem 2rem;}
.article-body h2{font-size:1.3rem;font-weight:800;color:var(--white);margin:2rem 0 0.7rem;}
.article-body p{color:var(--muted);line-height:1.8;margin-bottom:1rem;font-size:0.95rem;}
.cta-box{background:var(--navy-card);border:1px solid var(--border);border-radius:18px;padding:2.5rem;text-align:center;margin:3rem 0;}
.cta-box h3{font-size:1.4rem;font-weight:800;color:var(--white);margin-bottom:0.6rem;}
.cta-box p{color:var(--muted);margin-bottom:1.5rem;font-size:0.9rem;}
.btn-group{display:flex;gap:0.9rem;flex-wrap:wrap;justify-content:center;}
footer{background:#050D18;border-top:1px solid var(--border);padding:2rem;text-align:center;}
footer p{font-size:0.75rem;color:var(--muted);}
</style>
</head>
<body>
<nav>
  <div class="nav-inner">
    <a href="/" class="nav-logo"><img src="/images/imak-logo.png" alt="IMAK Overseas Education"></a>
    <ul class="nav-links">
      <li><a href="/destinations.html">Destinations</a></li>
      <li><a href="/our-services.html">Services</a></li>
      <li><a href="/find-my-university.html">Universities</a></li>
      <li><a href="/course-finder.html">Courses</a></li>
      <li><a href="/blog.html">Blog</a></li>
      <li><a href="/about-us.html">About</a></li>
      <li><a href="/contact-us.html">Contact</a></li>
      <li><a href="tel:+919000171849" style="color:#4db8ff;font-weight:700;">📞 Call Us</a></li>
      <li><a href="/book-an-appointment.html" class="nav-cta">Book Free Call</a></li>
    </ul>
    <div class="mob-cta">
      <a href="tel:+919000171849" class="btn btn-out btn-sm">📞 Call</a>
      <a href="/book-an-appointment.html" class="btn btn-blue btn-sm">Book Free Call</a>
    </div>
  </div>
</nav>
<div class="article-hero">
  <div class="container">
    <div class="article-date">${dateStr}</div>
    <h1>${title}</h1>
    <p class="intro">${intro}</p>
  </div>
</div>
<div class="article-body">
  ${sectionsHTML}
  <div class="cta-box">
    <h3>Ready to Study Abroad?</h3>
    <p>${cta}</p>
    <div class="btn-group">
      <a href="/book-an-appointment.html" class="btn btn-blue">Book Free Counselling →</a>
      <a href="https://wa.me/919000171849" class="btn btn-out">WhatsApp Us</a>
    </div>
  </div>
</div>
<footer><p>&copy; 2026 IMAK Overseas Education, Hyderabad. All rights reserved.</p></footer>
</body>
</html>`;
}

function buildBlogIndex(articles) {
  const cards = articles.slice(0, 30).map(a => `
    <a href="/blog/${a.slug}.html" class="blog-card">
      <div class="blog-date">${a.date}</div>
      <h3>${a.title}</h3>
      <p>${a.intro}</p>
      <span class="read-more">Read more →</span>
    </a>`).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Study Abroad Blog | IMAK Overseas Education</title>
<meta name="description" content="Latest guides for Indian students planning to study abroad. MBBS, undergraduate, postgraduate in 20+ countries.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;1,400&display=swap" rel="stylesheet">
<style>
:root{--navy:#08101E;--navy-mid:#0D1B2E;--navy-card:#102038;--navy-light:#163050;--border:rgba(25,124,192,0.16);--blue:#197CC0;--blue-b:#2290D8;--white:#FFFFFF;--text:#D8E8F4;--muted:#7DA4BF;}
*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--navy);color:var(--text);line-height:1.6;}
nav{position:sticky;top:0;z-index:100;background:rgba(8,16,30,0.97);backdrop-filter:blur(14px);border-bottom:1px solid var(--border);}
.nav-inner{max-width:1200px;margin:0 auto;padding:0 2rem;display:flex;align-items:center;justify-content:space-between;height:110px;}
.nav-logo{display:flex;align-items:center;text-decoration:none;flex-shrink:0;}
.nav-logo img{height:80px;width:auto;object-fit:contain;}
.nav-links{display:flex;align-items:center;gap:0.1rem;list-style:none;}
.nav-links a{color:var(--muted);text-decoration:none;font-size:0.82rem;font-weight:500;padding:0.42rem 0.65rem;border-radius:6px;transition:all 0.2s;white-space:nowrap;}
.nav-links a:hover{color:var(--white);background:var(--navy-light);}
.nav-cta{background:var(--blue)!important;color:var(--white)!important;padding:0.42rem 1rem!important;border-radius:7px!important;font-weight:700!important;}
.mob-cta{display:none;gap:0.5rem;}
@media(max-width:960px){.nav-links{display:none;}.mob-cta{display:flex;}}
.btn{display:inline-flex;align-items:center;padding:0.82rem 1.8rem;border-radius:9px;font-weight:700;font-size:0.88rem;text-decoration:none;transition:all 0.2s;}
.btn-blue{background:var(--blue);color:var(--white);}
.btn-sm{padding:0.45rem 0.9rem;font-size:0.8rem;border-radius:7px;}
.btn-out{background:transparent;color:var(--white);border:1px solid var(--border);}
.hero{padding:4rem 2rem 3rem;border-bottom:1px solid var(--border);}
.hero .container{max-width:1200px;margin:0 auto;}
.s-label{font-size:0.7rem;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--blue-b);margin-bottom:0.55rem;}
.hero h1{font-size:clamp(1.8rem,4vw,2.8rem);font-weight:800;color:var(--white);margin-bottom:0.8rem;letter-spacing:-0.025em;}
.hero h1 em{font-style:italic;color:var(--blue-b);font-family:'Lora',serif;}
.hero p{color:var(--muted);font-size:0.95rem;}
.blog-grid{max-width:1200px;margin:0 auto;padding:3rem 2rem;display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem;}
.blog-card{background:var(--navy-card);border:1px solid var(--border);border-radius:14px;padding:1.75rem;text-decoration:none;color:inherit;transition:border-color 0.22s,transform 0.22s;display:block;}
.blog-card:hover{border-color:rgba(25,124,192,0.4);transform:translateY(-3px);}
.blog-date{font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--blue-b);margin-bottom:0.6rem;}
.blog-card h3{font-size:0.95rem;font-weight:700;color:var(--white);margin-bottom:0.5rem;line-height:1.4;}
.blog-card p{font-size:0.8rem;color:var(--muted);line-height:1.6;margin-bottom:0.8rem;}
.read-more{font-size:0.78rem;font-weight:700;color:var(--blue-b);}
@media(max-width:768px){.blog-grid{grid-template-columns:1fr;}}
footer{background:#050D18;border-top:1px solid var(--border);padding:2rem;text-align:center;}
footer p{font-size:0.75rem;color:var(--muted);}
</style>
</head>
<body>
<nav>
  <div class="nav-inner">
    <a href="/" class="nav-logo"><img src="/images/imak-logo.png" alt="IMAK Overseas Education"></a>
    <ul class="nav-links">
      <li><a href="/destinations.html">Destinations</a></li>
      <li><a href="/our-services.html">Services</a></li>
      <li><a href="/find-my-university.html">Universities</a></li>
      <li><a href="/course-finder.html">Courses</a></li>
      <li><a href="/blog.html" style="color:#fff;">Blog</a></li>
      <li><a href="/about-us.html">About</a></li>
      <li><a href="/contact-us.html">Contact</a></li>
      <li><a href="tel:+919000171849" style="color:#4db8ff;font-weight:700;">📞 Call Us</a></li>
      <li><a href="/book-an-appointment.html" class="nav-cta">Book Free Call</a></li>
    </ul>
    <div class="mob-cta">
      <a href="tel:+919000171849" class="btn btn-out btn-sm">📞 Call</a>
      <a href="/book-an-appointment.html" class="btn btn-blue btn-sm">Book Free Call</a>
    </div>
  </div>
</nav>
<div class="hero">
  <div class="container">
    <p class="s-label">Study Abroad Guides</p>
    <h1>Everything You Need to Know About <em>Studying Abroad</em></h1>
    <p>Honest, practical guides for Indian students. Updated daily.</p>
  </div>
</div>
<div class="blog-grid">${cards}</div>
<footer><p>&copy; 2026 IMAK Overseas Education, Hyderabad. All rights reserved.</p></footer>
</body>
</html>`;
}

async function main() {
  console.log('API KEY present:', !!ANTHROPIC_API_KEY);
  const published = getPublished();
  const remaining = TOPICS.filter(t => !published.find(p => p.topic === t));

  if (remaining.length === 0) {
    console.log('All topics published!');
    return;
  }

  const topic = remaining[0];
  const articleSlug = slug(topic);
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  console.log('Generating article for:', topic);

  const prompt = `Write a detailed, SEO-optimized study abroad guide for Indian students on the topic: "${topic}"

Return ONLY valid JSON, no markdown backticks, no explanation:
{
  "title": "SEO title under 65 chars",
  "intro": "2-3 sentence intro under 200 chars",
  "sections": [
    {"heading": "heading", "body": "2-3 sentences"},
    {"heading": "heading", "body": "2-3 sentences"},
    {"heading": "heading", "body": "2-3 sentences"},
    {"heading": "heading", "body": "2-3 sentences"}
  ],
  "cta": "One sentence CTA for free counselling"
}

Write for Indian students. Mention costs in INR. Be specific and practical.`;

  const raw = await callClaude(prompt);
  console.log('Raw response preview:', raw.substring(0, 100));

  let content;
  try {
    content = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch(e) {
    console.error('JSON parse error:', e.message);
    console.error('Raw:', raw.substring(0, 300));
    process.exit(1);
  }

  if (!fs.existsSync('blog')) fs.mkdirSync('blog');

  const articleHTML = buildArticlePage(topic, content, dateStr, articleSlug);
  fs.writeFileSync(`blog/${articleSlug}.html`, articleHTML);
  console.log('Written: blog/' + articleSlug + '.html');

  published.unshift({ topic, slug: articleSlug, title: content.title, intro: content.intro, date: dateStr });
  savePublished(published);

  const indexHTML = buildBlogIndex(published);
  fs.writeFileSync('blog.html', indexHTML);
  console.log('Rebuilt: blog.html');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
