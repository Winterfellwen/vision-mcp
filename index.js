import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod';
import OpenAI from 'openai';
import { Jimp } from 'jimp';
import { SocksProxyAgent } from 'socks-proxy-agent';

const CONFIG = {
  timeout: parseInt(process.env.VISION_TIMEOUT || '120000', 10),
  maxRetries: parseInt(process.env.VISION_MAX_RETRIES || '5', 10),
  baseDelay: parseInt(process.env.VISION_RETRY_DELAY || '2000', 10),
  maxDelay: parseInt(process.env.VISION_RETRY_MAX_DELAY || '15000', 10),
  model: process.env.VISION_MODEL || process.env.OPENROUTER_MODEL || 'gpt-4o-mini',
  apiKey: process.env.VISION_API_KEY || process.env.OPENROUTER_API_KEY || '',
  apiUrl: process.env.VISION_API_URL || process.env.OPENROUTER_API_URL || '',
  rateLimitRpm: parseInt(process.env.VISION_RATE_LIMIT_RPM || process.env.OPENROUTER_RATE_LIMIT_RPM || '20', 10),
  proxyEnabled: (process.env.VISION_PROXY_ENABLED || process.env.OPENROUTER_PROXY_ENABLED || 'true') !== 'false',
  proxyUrl: process.env.VISION_PROXY_URL || process.env.OPENROUTER_PROXY_URL || '',
  imageMaxDim: parseInt(process.env.VISION_IMAGE_MAX_DIM || process.env.OPENROUTER_IMAGE_MAX_DIM || '768', 10),
  imageQuality: parseInt(process.env.VISION_IMAGE_QUALITY || process.env.OPENROUTER_IMAGE_QUALITY || '70', 10),
};

const timestamps = [];
const rateLimit = async () => {
  const limit = CONFIG.rateLimitRpm;
  if (limit <= 0) return;
  const now = Date.now();
  const windowStart = now - 60000;
  while (timestamps.length > 0 && timestamps[0] < windowStart) {
    timestamps.shift();
  }
  if (timestamps.length >= limit) {
    const wait = timestamps[0] + 60000 - now + 100;
    await new Promise(r => setTimeout(r, wait));
  }
  timestamps.push(Date.now());
};

const isRetryable = (err) => {
  const status = err?.status;
  const msg = (err?.message || '').toLowerCase();
  if (status === 404 || status === 429 || status === 500 || status === 502 || status === 503) return true;
  if (msg.includes('connection') || msg.includes('timeout') || msg.includes('econnreset') || msg.includes('econnrefused') || msg.includes('eaddrinfo') || msg.includes('no content')) return true;
  return false;
};

const retryWithBackoff = async (fn, retries = CONFIG.maxRetries) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(CONFIG.baseDelay * Math.pow(2, attempt - 1) + Math.random() * 500, CONFIG.maxDelay);
      await new Promise(r => setTimeout(r, delay));
    }
    try {
      return await fn();
    } catch (err) {
      if (!isRetryable(err)) throw err;
      if (attempt >= retries) throw err;
    }
  }
};

let lastPromise = Promise.resolve();
const sequential = (fn) => {
  return async (...args) => {
    await lastPromise.catch(() => {});
    return lastPromise = fn(...args);
  };
};

const COMPRESS = {
  maxDimension: CONFIG.imageMaxDim,
  quality: CONFIG.imageQuality,
};

const compressImage = async (buffer) => {
  const image = await Jimp.read(buffer);
  const { width, height } = image;
  const max = COMPRESS.maxDimension;

  if (width > max || height > max) {
    if (width > height) {
      image.resize({ w: max });
    } else {
      image.resize({ h: max });
    }
  }

  const buffered = await image.getBuffer('image/jpeg', { quality: COMPRESS.quality });
  return buffered.toString('base64');
};

const compressImagesTogether = async (buffer1, buffer2) => {
  const [img1, img2] = await Promise.all([Jimp.read(buffer1), Jimp.read(buffer2)]);
  const max = COMPRESS.maxDimension;

  const fit = (w, h) => {
    if (w <= max && h <= max) return { w, h };
    if (w > h) return { w: max, h: Math.round(h * max / w) };
    return { w: Math.round(w * max / h), h: max };
  };

  const d1 = fit(img1.width, img1.height);
  const d2 = fit(img2.width, img2.height);
  const targetW = Math.min(d1.w, d2.w);

  img1.resize({ w: targetW });
  img2.resize({ w: targetW });

  const [b1, b2] = await Promise.all([
    img1.getBuffer('image/jpeg', { quality: COMPRESS.quality }),
    img2.getBuffer('image/jpeg', { quality: COMPRESS.quality }),
  ]);
  return [b1.toString('base64'), b2.toString('base64')];
};

const loadImageAsBase64 = async (imagePath) => {
  const urlRegex = /^https?:\/\//i;
  if (urlRegex.test(imagePath)) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.timeout);
    try {
      const response = await fetch(imagePath, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: HTTP ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      return await compressImage(Buffer.from(buffer));
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  } else {
    const fs = await import('fs/promises');
    const buffer = await fs.readFile(imagePath);
    return await compressImage(buffer);
  }
};

const createClient = () => {
  const apiKey = CONFIG.apiKey;
  if (!apiKey) {
    throw new Error('VISION_API_KEY or OPENROUTER_API_KEY is not set');
  }
  const opts = {
    baseURL: CONFIG.apiUrl || undefined,
    apiKey: apiKey,
    timeout: CONFIG.timeout,
    maxRetries: 0,
  };
  if (CONFIG.proxyEnabled && CONFIG.proxyUrl) {
    const agent = new SocksProxyAgent(CONFIG.proxyUrl);
    opts.httpAgent = agent;
    opts.httpsAgent = agent;
  }
  return new OpenAI(opts);
};

const analyzeImage = async (imagePath, query = 'Describe this image in detail.') => {
  if (!imagePath) {
    throw new Error('imagePath is required');
  }
  const base64 = await loadImageAsBase64(imagePath);
  const client = createClient();

  await rateLimit();
  const response = await retryWithBackoff(async () => {
    const res = await client.chat.completions.create({
      model: CONFIG.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: query },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
    });
    const content = res.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content in API response');
    return res;
  }, CONFIG.maxRetries);

  const content = response.choices?.[0]?.message?.content;
  return typeof content === 'object' ? JSON.stringify(content) : content;
};

const loadBuffer = async (imagePath) => {
  const urlRegex = /^https?:\/\//i;
  if (urlRegex.test(imagePath)) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.timeout);
    try {
      const res = await fetch(imagePath, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`Failed to fetch image: HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      clearTimeout(timeout);
      throw e;
    }
  }
  const fs = await import('fs/promises');
  return await fs.readFile(imagePath);
};

const compareImages = async (image1, image2, query = 'Compare these two images and describe their differences.') => {
  if (!image1 || !image2) {
    throw new Error('image1 and image2 are both required');
  }

  const [buf1, buf2] = await Promise.all([loadBuffer(image1), loadBuffer(image2)]);
  const [b64_1, b64_2] = await compressImagesTogether(buf1, buf2);

  const client = createClient();
  await rateLimit();
  const response = await retryWithBackoff(async () => {
    const res = await client.chat.completions.create({
      model: CONFIG.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: query },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${b64_1}`, detail: 'high' },
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${b64_2}`, detail: 'high' },
            },
          ],
        },
      ],
    });
    return res;
  }, CONFIG.maxRetries);

  return response.choices?.[0]?.message?.content || 'No comparison result returned.';
};

const extractText = async (imagePath, prompt = 'Extract all text from this image.') => {
  if (!imagePath) {
    throw new Error('imagePath is required');
  }
  const base64 = await loadImageAsBase64(imagePath);
  const client = createClient();

  await rateLimit();
  const response = await retryWithBackoff(async () => {
    const res = await client.chat.completions.create({
      model: CONFIG.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
    });
    const content = res.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content in API response');
    return res;
  }, CONFIG.maxRetries);

  const content = response.choices?.[0]?.message?.content;
  return typeof content === 'object' ? JSON.stringify(content) : content;
};

const server = new McpServer({
  name: 'vision-mcp',
  version: '1.0.0',
});

server.registerTool(
  'analyze_image',
  {
    description: 'Analyze an image and describe its contents using AI vision. Supports both image URLs and local file paths.',
    inputSchema: z.object({
      imagePath: z.string().describe('URL or local file path of the image to analyze'),
      query: z.string().describe('Custom question about the image').optional().default('Describe this image in detail.'),
    }),
  },
  sequential(async ({ imagePath, query }) => {
    try {
      const result = await analyzeImage(imagePath, query);
      return { content: [{ type: 'text', text: String(result || 'No result returned') }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message || String(error)}` }], isError: true };
    }
  })
);

server.registerTool(
  'compare_images',
  {
    description: 'Compare two images and describe their differences using AI vision.',
    inputSchema: z.object({
      image1: z.string().describe('URL or local file path of the first image'),
      image2: z.string().describe('URL or local file path of the second image'),
      query: z.string().describe('Custom question for comparison').optional().default('Compare these two images and describe their differences.'),
    }),
  },
  sequential(async ({ image1, image2, query }) => {
    try {
      const result = await compareImages(image1, image2, query);
      return { content: [{ type: 'text', text: String(result || 'No result returned') }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message || String(error)}` }], isError: true };
    }
  })
);

server.registerTool(
  'extract_text',
  {
    description: 'Extract text from an image using OCR. Supports both image URLs and local file paths.',
    inputSchema: z.object({
      imagePath: z.string().describe('URL or local file path of the image to extract text from'),
      prompt: z.string().describe('Custom prompt for text extraction').optional().default('Extract all text from this image.'),
    }),
  },
  sequential(async ({ imagePath, prompt }) => {
    try {
      const result = await extractText(imagePath, prompt);
      return { content: [{ type: 'text', text: String(result || 'No result returned') }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message || String(error)}` }], isError: true };
    }
  })
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
