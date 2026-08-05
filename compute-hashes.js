// Compute SHA-256 hashes for all inline <script> blocks across all HTML pages
// This script normalizes CRLF → LF before hashing (HTML spec behavior)
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const htmlFiles = ['index.html', 'thoughts.html', 'projects.html', '404.html', 'uses.html'];
const dir = __dirname;
const checkMode = process.argv.includes('--check');
const log = checkMode ? () => {} : console.log;

function hashContent(content) {
  // Normalize CRLF → LF (HTML spec normalizes line endings before hashing)
  const normalized = content.replace(/\r\n/g, '\n');
  const hash = crypto.createHash('sha256').update(normalized, 'utf8').digest('base64');
  return `'sha256-${hash}'`;
}

const allHashes = new Set();

for (const file of htmlFiles) {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) {
    log(`\n=== ${file} — NOT FOUND ===`);
    continue;
  }
  const html = fs.readFileSync(filePath, 'utf8');
  
  // Match all inline script blocks (type="importmap", type="application/ld+json", or plain)
  // Regex: <script ...> content </script> where content is non-empty
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  log(`\n=== ${file} ===`);
  
  while ((match = scriptRegex.exec(html)) !== null) {
    const attrs = match[1];
    const content = match[2];
    
    // Skip external scripts (those with src attribute)
    if (/\bsrc\s*=/i.test(attrs)) continue;
    
    // Only hash non-empty inline scripts
    if (!content.trim()) continue;
    
    const type = (attrs.match(/type\s*=\s*"([^"]+)"/i) || [])[1] || 'text/javascript';
    const hash = hashContent(content);
    allHashes.add(hash);
    
    log(`  type="${type}" → ${hash}`);
    log(`    first 60 chars: ${content.trim().substring(0, 60)}...`);
  }
}

log('\n=== ALL UNIQUE HASHES ===');
for (const h of allHashes) {
  log(h);
}
log(`\nTotal unique: ${allHashes.size}`);

if (checkMode) {
  const configPath = path.join(dir, 'staticwebapp.config.json');
  const headers = JSON.parse(fs.readFileSync(configPath, 'utf8')).globalHeaders || {};
  const csp = headers['Content-Security-Policy'];
  if (!csp) {
    console.error('ERROR: no Content-Security-Policy in staticwebapp.config.json globalHeaders.');
    process.exit(1);
  }
  const scriptSrc = (csp.split(';').find((d) => d.trim().startsWith('script-src')) || '').trim();
  const allowed = new Set(scriptSrc.match(/'sha256-[^']+'/g) || []);

  const missing = [...allHashes].filter((h) => !allowed.has(h));
  const stale = [...allowed].filter((h) => !allHashes.has(h));

  for (const h of missing) console.error(`MISSING from CSP script-src: ${h}`);
  for (const h of stale) console.error(`STALE in CSP script-src (no inline script matches): ${h}`);

  if (missing.length || stale.length) {
    console.error(`\nCSP hash check FAILED. Run \`node compute-hashes.js\` and sync staticwebapp.config.json.`);
    process.exit(1);
  }
  console.log(`CSP hash check passed — ${allHashes.size} inline script hashes match script-src.`);
}
