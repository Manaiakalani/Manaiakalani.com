// Compute SHA-256 hashes for all executable inline <script> blocks across all HTML pages
// (classic scripts and import maps). JSON-LD data blocks are never executed, so CSP does
// not govern them and they are not hashed.
// This script normalizes CRLF → LF before hashing (HTML spec behavior)
//
//   node compute-hashes.js           # print hashes per page
//   node compute-hashes.js --write   # sync script-src hashes in staticwebapp.config.json
//   node compute-hashes.js --check   # CI: fail if script-src is out of sync
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const dir = __dirname;
const thoughtPages = fs.existsSync(path.join(dir, 'thoughts'))
  ? fs.readdirSync(path.join(dir, 'thoughts')).filter((f) => f.endsWith('.html')).sort().map((f) => 'thoughts/' + f)
  : [];
const htmlFiles = ['index.html', 'thoughts.html', 'projects.html', '404.html', 'uses.html', 'colophon.html', 'guestbook.html', 'now.html', ...thoughtPages];
const checkMode = process.argv.includes('--check');
const writeMode = process.argv.includes('--write');
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
    log(`\n=== ${file} - NOT FOUND ===`);
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
    
    // Skip external scripts (those with a real src attribute). The leading
    // boundary keeps `data-src` and similar from matching, which would silently
    // drop a genuinely inline script from the check.
    if (/(^|\s)src\s*=/i.test(attrs)) continue;
    
    // Only hash non-empty inline scripts
    if (!content.trim()) continue;
    
    const type = (attrs.match(/type\s*=\s*"([^"]+)"/i) || [])[1] || 'text/javascript';
    if (/^application\/ld\+json$/i.test(type)) continue;
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

if (writeMode) {
  const configPath = path.join(dir, 'staticwebapp.config.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  const next = raw.replace(/(script-src )([^;"]*)/, (m, head, body) => {
    const kept = body.split(/\s+/).filter((t) => t && !/^'sha256-/.test(t));
    return head + [...kept, ...allHashes].join(' ');
  });
  if (next !== raw) {
    fs.writeFileSync(configPath, next);
    console.log(`Synced ${allHashes.size} script-src hashes into staticwebapp.config.json.`);
  } else {
    console.log('script-src hashes already in sync.');
  }
}

if (checkMode) {
  const configPath = path.join(dir, 'staticwebapp.config.json');
  const headers = JSON.parse(fs.readFileSync(configPath, 'utf8')).globalHeaders || {};
  const csp = headers['Content-Security-Policy'];
  if (!csp) {
    console.error('ERROR: no Content-Security-Policy in staticwebapp.config.json globalHeaders.');
    process.exit(1);
  }
  // Match the directive token exactly so `script-src-elem` / `script-src-attr`
  // can never be picked up in place of `script-src`.
  const scriptSrc = (csp.split(';').find((d) => /^script-src(\s|$)/i.test(d.trim())) || '').trim();
  const allowed = new Set(scriptSrc.match(/'sha256-[^']+'/g) || []);

  const missing = [...allHashes].filter((h) => !allowed.has(h));
  const stale = [...allowed].filter((h) => !allHashes.has(h));

  for (const h of missing) console.error(`MISSING from CSP script-src: ${h}`);
  for (const h of stale) console.error(`STALE in CSP script-src (no inline script matches): ${h}`);

  if (missing.length || stale.length) {
    console.error(`\nCSP hash check FAILED. Run \`node compute-hashes.js --write\`.`);
    process.exit(1);
  }
  console.log(`CSP hash check passed - ${allHashes.size} inline script hashes match script-src.`);
}
