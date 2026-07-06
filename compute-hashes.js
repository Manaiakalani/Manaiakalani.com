// Compute SHA-256 hashes for all inline <script> blocks across all HTML pages
// This script normalizes CRLF → LF before hashing (HTML spec behavior)
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const htmlFiles = ['index.html', 'thoughts.html', 'projects.html', '404.html', 'uses.html'];
const dir = __dirname;

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
    console.log(`\n=== ${file} — NOT FOUND ===`);
    continue;
  }
  const html = fs.readFileSync(filePath, 'utf8');
  
  // Match all inline script blocks (type="importmap", type="application/ld+json", or plain)
  // Regex: <script ...> content </script> where content is non-empty
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  console.log(`\n=== ${file} ===`);
  
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
    
    console.log(`  type="${type}" → ${hash}`);
    console.log(`    first 60 chars: ${content.trim().substring(0, 60)}...`);
  }
}

console.log('\n=== ALL UNIQUE HASHES ===');
for (const h of allHashes) {
  console.log(h);
}
console.log(`\nTotal unique: ${allHashes.size}`);
