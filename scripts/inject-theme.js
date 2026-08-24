#!/usr/bin/env node
/**
 * inject-theme.js — 一次性工具：向所有 HTML 页面注入 theme.js 引用
 *
 * 用法：node scripts/inject-theme.js
 * 幂等：已包含 theme.js 引用的文件会被跳过。
 * 注入位置：</head> 之前（确保主题在首次渲染前生效，避免闪烁）。
 * 路径按文件深度自动计算（theme.js / ../theme.js / ../../theme.js）。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP = new Set(['index.html', '404.html']); // 这两个已手动引入

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

let injected = 0, skipped = 0, failed = 0;

for (const full of walk(ROOT).sort()) {
    const rel = path.relative(ROOT, full).replace(/\\/g, '/');
    if (SKIP.has(rel)) { skipped++; continue; }

    let html;
    try { html = fs.readFileSync(full, 'utf8'); }
    catch (e) { console.error('  读取失败: ' + rel); failed++; continue; }

    if (html.includes('theme.js')) { skipped++; continue; }

    const depth = rel.split('/').length - 1;
    const src = '../'.repeat(depth) + 'theme.js';
    const tag = '<script src="' + src + '"></script>';

    if (/<\/head>/i.test(html)) {
        html = html.replace(/<\/head>/i, '    ' + tag + '\n</head>');
    } else if (/<body[^>]*>/i.test(html)) {
        // 无 </head> 的异常页面：紧跟 <body> 之后注入
        html = html.replace(/(<body[^>]*>)/i, '$1\n' + tag);
    } else {
        console.error('  跳过（找不到 head/body）: ' + rel);
        failed++;
        continue;
    }

    fs.writeFileSync(full, html, 'utf8');
    injected++;
    console.log('  已注入: ' + rel);
}

console.log('\n[inject-theme] 注入 ' + injected + ' 个，跳过 ' + skipped + ' 个，失败 ' + failed + ' 个');
