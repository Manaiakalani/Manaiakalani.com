#!/usr/bin/env node
/*
 * Thoughts: one source of truth (thoughts.json), every output generated.
 *
 *   thoughts.html        the list (#thoughts-list) and the Blog JSON-LD
 *   thoughts/<slug>.html one page per thought, built from the thoughts.html shell
 *   feed.xml             Atom feed (entry ids stay the old #anchor ids so readers
 *                        don't see re-posts)
 *   sitemap.xml          every page + every thought; lastmod from the thought date,
 *                        or the page's last git commit for the other pages
 *   staticwebapp.config.json  /thoughts/<slug> rewrites + .html redirects
 *
 *   node build-thoughts.js          # write everything
 *   node build-thoughts.js --check  # CI: fail if anything is stale
 *
 * Order after editing content: build-thoughts -> build-chrome -> stamp-assets ->
 * build-thoughts (pages inherit the stamped shell) -> compute-hashes --write ->
 * build-search-index. `npm run build` does exactly that.
 *
 * Social cards (og/thoughts/<slug>.jpg) come from scripts/build-og-thoughts.mjs;
 * --check fails if one is missing.
 *
 * Dev-only: rewritten to /404.html in staticwebapp.config.json.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const SITE = 'https://manaiakalani.com';
const checkMode = process.argv.includes('--check');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const stale = [];

function emit(file, content) {
  const p = path.join(ROOT, file);
  const current = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  if (current === content) return;
  if (checkMode) { stale.push(file); return; }
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
  console.log('wrote ' + file);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');
const dotted = (d) => d.replace(/-/g, '.');
const minutes = (t) => Math.max(1, Math.round(t.trim().split(/\s+/).length / 200));
const isExternal = (u) => /^https?:\/\//.test(u);
const permalink = (t) => '/thoughts/' + t.slug;

function summary(body, max = 155) {
  if (body.length <= max) return body;
  const cut = body.slice(0, max);
  const sentence = cut.lastIndexOf('. ');
  if (sentence > 80) return cut.slice(0, sentence + 1);
  return cut.slice(0, cut.lastIndexOf(' ')) + '…';
}

// ---- load + validate ------------------------------------------------------
const thoughts = JSON.parse(read('thoughts.json'));
const seen = new Set();
thoughts.forEach((t, i) => {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t.slug)) throw new Error('bad slug: ' + t.slug);
  if (seen.has(t.slug)) throw new Error('duplicate slug: ' + t.slug);
  seen.add(t.slug);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t.date)) throw new Error(t.slug + ': date must be YYYY-MM-DD');
  if (!t.title || !t.body) throw new Error(t.slug + ': title and body are required');
  if (i && thoughts[i - 1].date < t.date) throw new Error('thoughts.json must be newest first (' + t.slug + ')');
});
const newest = thoughts[0].date;

function relatedHTML(t, indent) {
  if (!t.related || !t.related.length) return '';
  const links = t.related.map((r) => isExternal(r.url)
    ? '<a href="' + attr(r.url) + '" target="_blank" rel="noopener noreferrer">' + esc(r.name) + '<span class="visually-hidden"> (opens in a new tab)</span><span aria-hidden="true"> ↗</span></a>'
    : '<a href="' + attr(r.url) + '">' + esc(r.name) + '</a>');
  return indent + '<p class="thought-related"><span class="thought-related__label">Related</span> ' + links.join('<span aria-hidden="true"> · </span>') + '</p>\n';
}

// ---- thoughts.html: list + Blog JSON-LD -------------------------------------
let listPage = read('thoughts.html');
const items = thoughts.map((t) => {
  const i = '                ';
  return i + '<li>\n' +
    i + '    <div class="thought-entry" id="' + t.slug + '" data-permalink="' + permalink(t) + '">\n' +
    i + '        <div class="thought-date">' + dotted(t.date) + '</div>\n' +
    i + '        <h2 class="thought-title"><a href="#' + t.slug + '" class="thought-anchor">' + esc(t.title) + '</a></h2>\n' +
    i + '        <p class="thought-excerpt">' + esc(t.body) + '</p>\n' +
    i + '        <div class="thought-meta">\n' +
    relatedHTML(t, i + '            ') +
    i + '            <p class="thought-permalink"><a href="' + permalink(t) + '">Permalink<span class="visually-hidden">: ' + esc(t.title) + '</span> <span aria-hidden="true">→</span></a></p>\n' +
    i + '        </div>\n' +
    i + '    </div>\n' +
    i + '</li>\n';
}).join('');
listPage = listPage.replace(
  /(<ul class="thoughts-list" id="thoughts-list">\n)[\s\S]*?(\n?[ \t]*<\/ul>)/,
  (m, open, close) => open + items.replace(/\n$/, '') + close
);
const blogPosts = thoughts.map((t) => '          {\n' +
  '            "@type": "BlogPosting",\n' +
  '            "headline": ' + JSON.stringify(t.title) + ',\n' +
  '            "datePublished": "' + t.date + '",\n' +
  '            "url": "' + SITE + permalink(t) + '",\n' +
  '            "author": { "@type": "Person", "name": "Maximilian Stein" }\n' +
  '          }').join(',\n');
listPage = listPage.replace(/("blogPost": \[\n)[\s\S]*?(\n\s*\])/, (m, open, close) => open + blogPosts + close);
emit('thoughts.html', listPage);

// ---- thoughts/<slug>.html -------------------------------------------------
// Built from the (already chromed + stamped) thoughts.html so header, footer,
// scripts and cache-busting stay identical. Relative URLs become root-absolute.
const shell = listPage.replace(/(\s(?:src|href))="(?!\/|#|[a-z]+:)([^"]+)"/g, '$1="/$2"');

function pageFor(t, idx) {
  const url = SITE + permalink(t);
  const desc = summary(t.body);
  const og = SITE + '/og/thoughts/' + t.slug + '.jpg';
  const title = t.title + ' | Maximilian Stein';
  const newer = thoughts[idx - 1];
  const older = thoughts[idx + 1];
  const ld = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: t.title,
    description: desc,
    datePublished: t.date,
    url,
    image: og,
    mainEntityOfPage: url,
    isPartOf: { '@type': 'Blog', name: 'Thoughts | Maximilian Stein', url: SITE + '/thoughts' },
    author: { '@type': 'Person', name: 'Maximilian Stein', url: SITE }
  }, null, 2).replace(/\n/g, '\n    ');

  let page = shell
    .replace(/<title>[^<]*<\/title>/, '<title>' + esc(title) + '</title>')
    .replace(/(<meta name="description" content=")[^"]*"/, '$1' + attr(desc) + '"')
    .replace(/(<meta property="og:type" content=")[^"]*">/, '$1article">\n    <meta property="article:published_time" content="' + t.date + '">')
    .replace(/(<meta property="og:url" content=")[^"]*"/, '$1' + url + '"')
    .replace(/(<meta property="og:title" content=")[^"]*"/, '$1' + attr(t.title) + '"')
    .replace(/(<meta property="og:description" content=")[^"]*"/, '$1' + attr(desc) + '"')
    .replace(/(<meta property="og:image" content=")[^"]*"/, '$1' + og + '"')
    .replace(/(<meta property="og:image:alt" content=")[^"]*"/, '$1' + attr(t.title + ', a thought by Maximilian Stein') + '"')
    .replace(/(<meta property="twitter:title" content=")[^"]*"/, '$1' + attr(t.title) + '"')
    .replace(/(<meta property="twitter:description" content=")[^"]*"/, '$1' + attr(desc) + '"')
    .replace(/(<meta property="twitter:image" content=")[^"]*"/, '$1' + og + '"')
    .replace(/(<meta property="twitter:image:alt" content=")[^"]*"/, '$1' + attr(t.title + ', a thought by Maximilian Stein') + '"')
    .replace(/(<link rel="canonical" href=")[^"]*"/, '$1' + url + '"')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '<script type="application/ld+json">\n    ' + ld + '\n    </script>');

  const pager = (newer || older)
    ? '            <nav class="thought-pager" aria-label="More thoughts">\n' +
      (newer ? '                <a class="thought-pager__newer" href="' + permalink(newer) + '" rel="prev"><span class="thought-pager__label">Newer</span> ' + esc(newer.title) + '</a>\n' : '') +
      (older ? '                <a class="thought-pager__older" href="' + permalink(older) + '" rel="next"><span class="thought-pager__label">Older</span> ' + esc(older.title) + '</a>\n' : '') +
      '            </nav>\n'
    : '';
  const main =
    '<main id="main" tabindex="-1">\n' +
    '        <article class="container thought-single" aria-labelledby="thought-title">\n' +
    '            <p class="thought-back"><a href="/thoughts"><span aria-hidden="true">←</span> All thoughts</a></p>\n' +
    '            <div class="thought-date"><time datetime="' + t.date + '">' + dotted(t.date) + '</time> · ' + minutes(t.body) + ' min read</div>\n' +
    '            <h1 class="thought-single__title" id="thought-title">' + esc(t.title) + '</h1>\n' +
    '            <p class="thought-single__body">' + esc(t.body) + '</p>\n' +
    relatedHTML(t, '            ') +
    pager +
    '        </article>\n' +
    '    </main>';
  page = page.replace(/<main id="main" tabindex="-1">[\s\S]*?<\/main>/, main);
  return page;
}

const wanted = new Set();
thoughts.forEach((t, i) => {
  const file = 'thoughts/' + t.slug + '.html';
  wanted.add(t.slug + '.html');
  emit(file, pageFor(t, i));
  if (!fs.existsSync(path.join(ROOT, 'og/thoughts/' + t.slug + '.jpg'))) {
    stale.push('og/thoughts/' + t.slug + '.jpg (run: node scripts/build-og-thoughts.mjs)');
  }
});
if (fs.existsSync(path.join(ROOT, 'thoughts'))) {
  for (const f of fs.readdirSync(path.join(ROOT, 'thoughts'))) {
    if (f.endsWith('.html') && !wanted.has(f)) {
      if (checkMode) stale.push('thoughts/' + f + ' (orphan)');
      else { fs.unlinkSync(path.join(ROOT, 'thoughts', f)); console.log('removed thoughts/' + f); }
    }
  }
}

// ---- feed.xml -------------------------------------------------------------
const feedTime = (t) => t.published || (t.date + 'T09:00:00Z');
const feed = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<feed xmlns="http://www.w3.org/2005/Atom">\n' +
  '  <title>Thoughts | Maximilian Stein</title>\n' +
  '  <subtitle>Reflections on community building, the tech industry, side projects, and everything in between.</subtitle>\n' +
  '  <link href="' + SITE + '/feed.xml" rel="self" />\n' +
  '  <link href="' + SITE + '/thoughts" />\n' +
  '  <id>' + SITE + '/feed.xml</id>\n' +
  '  <updated>' + thoughts.map(feedTime).sort().pop() + '</updated>\n' +
  '  <author>\n    <name>Maximilian Stein</name>\n  </author>\n' +
  thoughts.map((t) => '  <entry>\n' +
    '    <title>' + esc(t.title) + '</title>\n' +
    '    <link href="' + SITE + permalink(t) + '" />\n' +
    // Ids predate permalinks; changing them would re-post every entry in readers.
    '    <id>' + SITE + '/thoughts.html#' + t.slug + '</id>\n' +
    '    <updated>' + feedTime(t) + '</updated>\n' +
    '    <summary>' + esc(t.body) + '</summary>\n' +
    '  </entry>\n').join('') +
  '</feed>\n';
emit('feed.xml', feed);

// ---- sitemap.xml ----------------------------------------------------------
const PAGES = [
  ['/', 'index.html', 'weekly', '1.0'],
  ['/thoughts', null, 'weekly', '0.8'],
  ['/projects', 'projects.html', 'weekly', '0.8'],
  ['/uses', 'uses.html', 'monthly', '0.6'],
  ['/colophon', 'colophon.html', 'monthly', '0.4'],
  ['/now', 'now.html', 'weekly', '0.6'],
  ['/guestbook', 'guestbook.html', 'weekly', '0.5'],
  ['/feed.xml', null, 'weekly', '0.5']
];
const oldSitemap = fs.existsSync(path.join(ROOT, 'sitemap.xml')) ? read('sitemap.xml') : '';
function previousLastmod(loc) {
  const m = oldSitemap.match(new RegExp('<loc>' + loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</loc>\\s*<lastmod>([^<]+)</lastmod>'));
  return m && m[1];
}
function gitDate(file) {
  try {
    const dirty = execFileSync('git', ['status', '--porcelain', '--', file], { cwd: ROOT, encoding: 'utf8' }).trim();
    if (dirty) {
      const d = new Date();
      return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
    }
    return execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { cwd: ROOT, encoding: 'utf8' }).trim() || null;
  } catch (e) {
    return null;
  }
}
// CI checkouts are shallow, so --check keeps the recorded dates for plain pages
// and only verifies the URL set and the thought-derived dates.
function lastmodFor(loc, file) {
  if (!file) return newest;
  if (checkMode) return previousLastmod(SITE + loc) || newest;
  return gitDate(file) || previousLastmod(SITE + loc) || newest;
}
const urls = PAGES.map(([loc, file, freq, prio]) => [SITE + loc, lastmodFor(loc, file), freq, prio])
  .concat(thoughts.map((t) => [SITE + permalink(t), t.date, 'yearly', '0.5']));
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map(([loc, mod, freq, prio]) => '  <url>\n' +
    '    <loc>' + loc + '</loc>\n' +
    '    <lastmod>' + mod + '</lastmod>\n' +
    '    <changefreq>' + freq + '</changefreq>\n' +
    '    <priority>' + prio + '</priority>\n' +
    '  </url>\n').join('') +
  '</urlset>\n';
emit('sitemap.xml', sitemap);

// ---- staticwebapp.config.json routes --------------------------------------
const cfg = read('staticwebapp.config.json');
const lines = cfg.split('\n').filter((l) => !/"route": "\/thoughts\//.test(l));
const anchor = lines.findIndex((l) => l.includes('"route": "/now", "rewrite": "/now.html"'));
if (anchor < 0) throw new Error('staticwebapp.config.json: /now rewrite not found');
const routeLines = thoughts.flatMap((t) => [
  '    { "route": "' + permalink(t) + '.html", "redirect": "' + permalink(t) + '", "statusCode": 301 },',
  '    { "route": "' + permalink(t) + '", "rewrite": "' + permalink(t) + '.html" },'
]);
lines.splice(anchor + 1, 0, ...routeLines);
const nextCfg = lines.join('\n');
JSON.parse(nextCfg);
emit('staticwebapp.config.json', nextCfg);

if (checkMode) {
  if (stale.length) {
    stale.forEach((f) => console.error('STALE: ' + f));
    console.error('\nThoughts outputs are out of date. Run `npm run build`.');
    process.exit(1);
  }
  console.log('Thoughts outputs are current - ' + thoughts.length + ' thoughts.');
}
