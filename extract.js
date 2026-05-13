#!/usr/bin/env node
/**
 * extract.js — Reverse of build.js.
 *
 * Reads index.html + contact.html and rebuilds content.json by finding every
 * element with a data-adlib-cms or data-adlib-each attribute and recovering
 * its value.
 *
 * Usage:
 *   node extract.js                  # reads index.html + contact.html -> writes content.json
 *   node extract.js some-page.html   # reads file -> stdout
 *
 * Per-array parsers live near the bottom (under "PER-ARRAY PARSERS"). One
 * `else if (arrayPath === ...)` block per repeating list in content.json.
 */

const fs = require('fs');

const inputFile = process.argv[2];
const writeToFile = !inputFile;

const html = inputFile
  ? fs.readFileSync(inputFile, 'utf8')
  : [fs.readFileSync('index.html', 'utf8'), fs.readFileSync('contact.html', 'utf8')].join('\n');

function setPath(obj, path, val) {
  const keys = path.split('.');
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = isNaN(keys[i]) ? keys[i] : parseInt(keys[i]);
    if (o[k] === undefined) {
      o[k] = isNaN(keys[i + 1]) ? {} : [];
    }
    o = o[k];
  }
  const last = isNaN(keys[keys.length - 1]) ? keys[keys.length - 1] : parseInt(keys[keys.length - 1]);
  o[last] = val;
}

function decode(s) {
  return decodeKeepSpaces(s).trim();
}

function decodeKeepSpaces(s) {
  return s
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&rsquo;/g, "'")
    .replace(/&mdash;/g, '--')
    .replace(/&middot;/g, '·')
    .replace(/&rarr;/g, '→')
    .replace(/&emsp;/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/ /g, ' ');
}

function textContent(s) {
  let text = s.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  return decode(text);
}

function richContent(s) {
  let text = s.replace(/<(?!\/?(?:em|strong|a)\b)[^>]+>/g, '');
  text = text.replace(/ rel="noopener"/g, '');
  const parts = text.split(/(<[^>]+>)/g);
  for (let i = 0; i < parts.length; i++) {
    if (!parts[i].startsWith('<')) {
      parts[i] = decodeKeepSpaces(parts[i]);
    }
  }
  return parts.join('').trim();
}

/* ── Extract <head> meta tags ─────────────────────────────────────── */

const metaFields = {};

const metaPatterns = [
  ['title', /<title[^>]*>([^<]*)<\/title>/],
  ['description', /<meta\s+name="description"\s+content="([^"]*)"/],
  ['ogTitle', /<meta\s+property="og:title"\s+content="([^"]*)"/],
  ['ogDescription', /<meta\s+property="og:description"\s+content="([^"]*)"/],
  ['ogImage', /<meta\s+property="og:image"\s+content="([^"]*)"/],
  ['twitterCard', /<meta\s+name="twitter:card"\s+content="([^"]*)"/],
  ['siteUrl', /<meta\s+property="og:url"\s+content="([^"]*)"/],
  ['siteName', /<meta\s+property="og:site_name"\s+content="([^"]*)"/],
];

for (const [key, regex] of metaPatterns) {
  const m = html.match(regex);
  if (m) metaFields[key] = decode(m[1]);
}

/* ── Extract data-adlib-cms elements ─────────────────────────────── */

const content = {};

const attrPattern = /data-adlib-cms="([^"]+)"/g;
const positions = [];
let match;
while ((match = attrPattern.exec(html)) !== null) {
  positions.push({ path: match[1], pos: match.index });
}

for (const { path, pos } of positions) {
  let tagStart = pos;
  while (tagStart > 0 && html[tagStart] !== '<') tagStart--;

  let tagEnd = pos;
  while (tagEnd < html.length && html[tagEnd] !== '>') tagEnd++;
  tagEnd++;

  const openingTag = html.slice(tagStart, tagEnd);
  const tagName = openingTag.match(/^<(\w+)/)?.[1]?.toLowerCase();
  const typeMatch = openingTag.match(/data-adlib-type="([^"]+)"/);
  const type = typeMatch ? typeMatch[1] : 'text';
  const targetMatch = openingTag.match(/data-target="([^"]+)"/);

  if (['img', 'source', 'input', 'br', 'hr', 'meta', 'link'].includes(tagName)) {
    if (type === 'image' || type === 'video') {
      const srcMatch = openingTag.match(/\bsrc="([^"]+)"/);
      if (srcMatch) {
        setPath(content, path, srcMatch[1]);
      } else {
        const contentMatch = openingTag.match(/\bcontent="([^"]+)"/);
        setPath(content, path, contentMatch ? contentMatch[1] : '');
      }
    } else if (tagName === 'meta') {
      const contentMatch = openingTag.match(/\bcontent="([^"]+)"/);
      setPath(content, path, contentMatch ? decode(contentMatch[1]) : '');
    }
    continue;
  }

  if (type === 'href') {
    const hrefMatch = openingTag.match(/\bhref="([^"]+)"/);
    setPath(content, path, hrefMatch ? hrefMatch[1] : '');
    continue;
  }

  if (type === 'number') {
    setPath(content, path, targetMatch ? Number(targetMatch[1]) : 0);
    continue;
  }

  let depth = 1;
  let cursor = tagEnd;
  const closeTag = `</${tagName}`;

  while (cursor < html.length && depth > 0) {
    const nextOpen = html.indexOf(`<${tagName}`, cursor);
    const nextClose = html.indexOf(closeTag, cursor);

    if (nextClose === -1) break;

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      cursor = nextOpen + 1;
    } else {
      depth--;
      if (depth === 0) {
        const innerHTML = html.slice(tagEnd, nextClose);
        if (type === 'richtext') {
          setPath(content, path, richContent(innerHTML));
        } else {
          setPath(content, path, textContent(innerHTML));
        }
      }
      cursor = nextClose + 1;
    }
  }
}

/* ── Extract data-adlib-each array items ──────────────────────────── */

const eachPattern = /data-adlib-each="([^"]+)"\s+data-adlib-index="(\d+)"/g;
const eachPositions = [];
while ((match = eachPattern.exec(html)) !== null) {
  eachPositions.push({ arrayPath: match[1], index: parseInt(match[2]), pos: match.index });
}

for (const { arrayPath, index, pos } of eachPositions) {
  let tagStart = pos;
  while (tagStart > 0 && html[tagStart] !== '<') tagStart--;

  let tagEnd = pos;
  while (tagEnd < html.length && html[tagEnd] !== '>') tagEnd++;
  tagEnd++;

  const openingTag = html.slice(tagStart, tagEnd);
  const tagName = openingTag.match(/^<(\w+)/)?.[1]?.toLowerCase();

  let depth = 1;
  let cursor = tagEnd;
  const closeTag = `</${tagName}`;
  let innerHTML = '';

  while (cursor < html.length && depth > 0) {
    const nextOpen = html.indexOf(`<${tagName}`, cursor);
    const nextClose = html.indexOf(closeTag, cursor);

    if (nextClose === -1) break;

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      cursor = nextOpen + 1;
    } else {
      depth--;
      if (depth === 0) {
        innerHTML = html.slice(tagEnd, nextClose);
      }
      cursor = nextClose + 1;
    }
  }

  const hrefMatch = openingTag.match(/\bhref="([^"]+)"/);

  /* ── PER-ARRAY PARSERS ────────────────────────────────────────── */

  if (arrayPath === 'films') {
    // <a class="card" href="films/SLUG.html" data-adlib-each="films" data-adlib-index="N" data-video="VIDEO">
    //   <div class="card-image-wrap"><img src="IMAGE" alt="TITLE"></div>
    //   <div class="card-title">TITLE</div>
    //   <span class="tag">#TAG</span>
    // </a>
    const href = hrefMatch ? hrefMatch[1] : '';
    const slugMatch = href.match(/films\/(.+)\.html$/);
    const slug = slugMatch ? slugMatch[1] : '';

    const videoMatch = openingTag.match(/\bdata-video="([^"]*)"/);
    const video = videoMatch ? videoMatch[1] : '';

    const imgMatch = innerHTML.match(/<img[^>]*\bsrc="([^"]+)"/);
    const image = imgMatch ? imgMatch[1] : '';

    const titleMatch = innerHTML.match(/<div[^>]*class="card-title"[^>]*>([\s\S]*?)<\/div>/);
    const title = titleMatch ? textContent(titleMatch[1]) : '';

    const tagMatch = innerHTML.match(/<span[^>]*class="tag"[^>]*>([\s\S]*?)<\/span>/);
    const tagRaw = tagMatch ? textContent(tagMatch[1]) : '';
    const tag = tagRaw.replace(/^#/, '');

    setPath(content, `films.${index}`, { title, tag, slug, image, video });
  }
}

/* ── Attach meta ───────────────────────────────────────────────────── */

if (Object.keys(metaFields).length > 0) {
  content.meta = {
    title: metaFields.title || '',
    description: metaFields.description || '',
    ogTitle: metaFields.ogTitle || '',
    ogDescription: metaFields.ogDescription || '',
    ogImage: metaFields.ogImage || '',
    twitterCard: metaFields.twitterCard || '',
    siteUrl: metaFields.siteUrl || '',
    siteName: metaFields.siteName || '',
  };
}

/* ── Output ───────────────────────────────────────────────────────── */

const ordered = {
  meta: content.meta || {},
  contact: content.contact || {},
  films: content.films || [],
};

const json = JSON.stringify(ordered, null, 2) + '\n';

if (writeToFile) {
  fs.writeFileSync('content.json', json);
  console.log(`Extracted content.json (${Object.keys(ordered).length} sections, ${ordered.films.length} films)`);
} else {
  process.stdout.write(json);
}
