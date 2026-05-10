import { spawn } from 'child_process';

const requestType = process.argv[2] || 'compare';

const proc = spawn('node', ['index.js'], {
  cwd: 'E:\\AI\\VisionMCP',
  env: {
    ...process.env,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
    OPENROUTER_MODEL: 'nvidia/nemotron-nano-12b-v2-vl:free',
    OPENROUTER_API_URL: 'https://openrouter.ai/api/v1',
    OPENROUTER_RATE_LIMIT_RPM: '20',
    OPENROUTER_IMAGE_MAX_DIM: '768',
    OPENROUTER_IMAGE_QUALITY: '70',
    OPENROUTER_PROXY_URL: 'socks5://127.0.0.1:10888'
  },
  stdio: ['pipe', 'pipe', 'pipe']
});

let buffer = '';
proc.stdout.on('data', (data) => {
  buffer += data.toString();
  processMessages();
});

proc.stderr.on('data', (data) => {
  console.error('STDERR:', data.toString());
});

let pendingId = null;

function processMessages() {
  const parts = buffer.split('\n');
  if (parts.length < 2 && !buffer.includes('\n')) return;
  buffer = parts.pop();
  for (const line of parts) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const msg = JSON.parse(trimmed);
      if (msg.id === 'init') {
        console.log('Initialized:', msg.result?.serverInfo);
        if (requestType === 'analyze') {
          sendRequest('work', 'tools/call', {
            name: 'analyze_image',
            arguments: { imagePath: 'E:\\AI\\image\\html_page_0.png' }
          });
        } else {
          sendRequest('work', 'tools/call', {
            name: 'compare_images',
            arguments: {
              image1: 'E:\\AI\\image\\html_page_0.png',
              image2: 'E:\\AI\\image\\pdf_page_0.png',
              query: 'Compare these two images and describe their differences in detail.'
            }
          });
        }
      } else if (msg.id === 'work') {
        console.log('\n=== RESULT ===');
        const text = msg.result?.content?.[0]?.text || msg.error?.message || JSON.stringify(msg);
        console.log(text);
        process.exit(0);
      }
    } catch (e) {
      // partial JSON, wait for more
    }
  }
}

function sendRequest(id, method, params) {
  const req = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
  proc.stdin.write(req);
}

sendRequest('init', 'initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: { name: 'test', version: '1.0.0' }
});

setTimeout(() => {
  proc.kill();
  process.exit(1);
}, 180000);
