#!/usr/bin/env node
/**
 * build-index.js — 生成 search-index.json 与 sitemap.xml
 *
 * 用法：node scripts/build-index.js
 * 输出：
 *   - search-index.json : 全站 HTML 文档的标题/分类/正文摘要，供首页全文搜索使用
 *   - sitemap.xml       : 供搜索引擎收录
 *
 * 无任何第三方依赖，Node 14+ 可运行。
 * GitHub Actions 会在推送含 .html 变更时自动执行本脚本（见 .github/workflows/update-index.yml）。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE_URL = 'https://daduchu.github.io/robotkA/';
const SKIP_SEARCH = new Set(['index.html', '404.html']); // 相对于根目录
const SKIP_SITEMAP = new Set(['404.html']);

const CATEGORY_MAP = {
    '0': '知识库管理',
    '1': '基础概念与分类',
    '2': '核心技术',
    '3': '应用领域',
    '4': '发展历史与趋势',
    '5': '法律法规与伦理',
    '6': '公司与产品',
    '7': '教育与学习资源',
    '8': '技术标准与规范',
    '9': '产业生态',
    '10': '前沿技术与研究',
    '11': '科普与测评'
};

function walk(dir) {
    const out = [];
    for (const name of fs.readdirSync(dir)) {
        if (name === '.git' || name === 'scripts' || name === 'node_modules' || name.startsWith('.')) continue;
        const full = path.join(dir, name);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) out.push(...walk(full));
        else if (name.endsWith('.html')) out.push(full);
    }
    return out;
}

function decodeEntities(s) {
    return s
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&ldquo;|&rdquo;/g, '"')
        .replace(/&mdash;/g, '—');
}

function extractTitle(html) {
    const m = html.match(/<title>([\s\S]*?)<\/title>/i);
    if (!m) return '';
    let t = decodeEntities(m[1].trim());
    // "X | 机器人知识库" → "X"
    t = t.replace(/\s*[|｜]\s*机器人知识库\s*$/i, '');
    return t.trim();
}

function extractContent(html) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    let body = bodyMatch ? bodyMatch[1] : html;
    body = body
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<[^>]+>/g, ' ');
    body = decodeEntities(body).replace(/\s+/g, ' ').trim();
    return body.slice(0, 3000);
}

function categoryOf(relPath) {
    const first = relPath.split('/')[0];
    const m = first.match(/^(\d+)\./);
    return m ? (CATEGORY_MAP[m[1]] || first) : '';
}

const files = walk(ROOT).sort();
const docs = [];
const sitemapUrls = [];

for (const full of files) {
    const rel = path.relative(ROOT, full).replace(/\\/g, '/');
    const html = fs.readFileSync(full, 'utf8');
    const title = extractTitle(html);
    const encoded = encodeURI(rel);

    if (!SKIP_SITEMAP.has(rel)) {
        sitemapUrls.push(SITE_URL + encoded);
    }

    if (SKIP_SEARCH.has(rel) || !title) continue;

    docs.push({
        title: title,
        category: categoryOf(rel),
        url: encoded,
        content: extractContent(html)
    });
}

// ---- search-index.json ----
fs.writeFileSync(
    path.join(ROOT, 'search-index.json'),
    JSON.stringify(docs, null, 2),
    'utf8'
);

// ---- sitemap.xml ----
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    sitemapUrls.map(u => '    <url><loc>' + u + '</loc></url>').join('\n') +
    '\n</urlset>\n';
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf8');

console.log('[build-index] search-index.json: ' + docs.length + ' documents');
console.log('[build-index] sitemap.xml: ' + sitemapUrls.length + ' URLs');
