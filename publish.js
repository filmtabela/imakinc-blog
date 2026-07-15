import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import fetch from "node-fetch";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

function createBatchRequest(
  custom_id,
  topic,
  model = "claude-haiku-4-5-20251001",
  systemPrompt,
  userPrompt
) {
  return {
    custom_id: custom_id,
    params: {
      model: model,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    },
  };
}

async function submitBatch(requests) {
  if (requests.length === 0) {
    console.log("No requests to batch.");
    return null;
  }

  console.log(`Submitting IMAK batch with ${requests.length} requests...`);

  const batch = await client.beta.messages.batches.create({
    requests: requests,
  });

  console.log(`Batch submitted. ID: ${batch.id}`);
  fs.writeFileSync("batch-id.txt", batch.id);

  return batch;
}

async function pollBatchResults(batchId) {
  let batch = await client.beta.messages.batches.retrieve(batchId);

  while (batch.processing_status === "in_progress") {
    console.log(`Batch processing... waiting 60s`);
    await new Promise((resolve) => setTimeout(resolve, 60000));
    batch = await client.beta.messages.batches.retrieve(batchId);
  }

  console.log(`Batch complete. Status: ${batch.processing_status}`);

  if (batch.processing_status === "succeeded") {
    const results = await client.beta.messages.batches.results(batchId);
    const articles = [];

    for await (const result of results) {
      if (result.result.type === "succeeded") {
        articles.push({
          id: result.custom_id,
          content: result.result.message.content[0].text,
          status: "success",
        });
      } else {
        console.error(`Request failed:`, result.result);
        articles.push({
          id: result.custom_id,
          status: "failed",
        });
      }
    }

    return articles;
  }

  return [];
}

async function fetchPexelsImage(query) {
  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`,
      {
        headers: { Authorization: PEXELS_API_KEY },
      }
    );
    const data = await response.json();
    return data.photos[0]?.src?.large || null;
  } catch (error) {
    console.error("Pexels fetch failed:", error);
    return null;
  }
}

function buildArticleHTML(topic, content) {
  const slug = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${topic}</title>
  <meta name="description" content="${topic}">
</head>
<body>
  <article>
    <h1>${topic}</h1>
    ${content}
  </article>
</body>
</html>`;

  return { slug, html };
}

async function publishArticle(topic, content) {
  const { slug, html } = buildArticleHTML(topic, content);
  const htmlPath = path.join("articles", `${slug}.html`);

  if (!fs.existsSync("articles")) {
    fs.mkdirSync("articles", { recursive: true });
  }

  fs.writeFileSync(htmlPath, html);
  console.log(`Published IMAK article: ${slug}`);

  return slug;
}

function getRandomTopics(count = 3) {
  const topics = [
    "How to Apply to Australian Universities from India",
    "Student Visa Process for UK 2024",
    "Best Affordable Countries for Indian Students",
    "Scholarships for Indian Students in Canada",
    "IELTS Preparation Tips for International Students",
    "Cost of Living for Students in USA vs Australia",
    "Work-Study Programs for International Students",
    "Top Engineering Universities in Europe",
    "Masters Programs in UK for Indian Graduates",
    "Study Abroad on a Budget: 10 Money-Saving Tips",
  ];

  const shuffled = [...topics].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

async function main() {
  if (process.argv[2] === "retrieve" && fs.existsSync("batch-id.txt")) {
    const batchId = fs.readFileSync("batch-id.txt", "utf-8").trim();
    console.log(`Retrieving IMAK batch ${batchId}...`);

    const articles = await pollBatchResults(batchId);

    for (const article of articles) {
      if (article.status === "success") {
        const topicName = article.id.replace("imak-", "");
        await publishArticle(topicName, article.content);
      }
    }

    console.log(`Published ${articles.length} IMAK articles`);
    fs.unlinkSync("batch-id.txt");
    return;
  }

  console.log("Building IMAK batch...");

  const topics = getRandomTopics(3);
  const requests = [];

  for (const topic of topics) {
    const systemPrompt = `You are an expert education consultant for IMAK Overseas Education, helping Indian students study abroad. Write practical, actionable articles.`;

    const userPrompt = `Write a detailed blog article about: "${topic}"

Requirements:
- 800-1200 words
- Practical advice for Indian students
- Include step-by-step guidance where relevant
- Format as HTML <p> and <h2> tags
- Focus on value, not sales`;

    requests.push(
      createBatchRequest(
        `imak-${topic.toLowerCase().replace(/\s+/g, "-")}`,
        topic,
        "claude-haiku-4-5-20251001",
        systemPrompt,
        userPrompt
      )
    );
  }

  const batch = await submitBatch(requests);

  if (batch) {
    console.log(`\nIMAK Batch queued. Retrieve with:`);
    console.log(`  node publish.js retrieve`);
    console.log(`Cost: 50% off. Processing 12-24 hours.`);
  }
}

main().catch(console.error);
