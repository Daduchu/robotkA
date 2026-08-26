#!/usr/bin/env node
/**
 * inject-chat.js — 一次性工具：向所有 HTML 页面注入 chat.js（智能客服）引用
 *
 * 用法：node scripts/inject-chat.js
 * 幂等：已包含 chat.js 引用的文件会被跳过。
 * 注入位置：</body> 之前（客服属于界面组件，放在页面末尾加载即可，
 * 不阻塞首屏渲染；根路径由 chat.js 根据自身 src 自动推断）。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

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

    let html;
    try { html = fs.readFileSync(full, 'utf8'); }
    catch (e) { console.error('  读取失败: ' + rel); failed++; continue; }

    if (html.includes('chat.js')) { skipped++; continue; }

    const depth = rel.split('/').length - 1;
    const src = '../'.repeat(depth) + 'chat.js';
    const tag = '<script src="' + src + '"></script>';

    if (/<\/body>/i.test(html)) {
        html = html.replace(/<\/body>/i, '    ' + tag + '\n</body>');
    } else {
        console.error('  跳过（找不到 </body>）: ' + rel);
        failed++;
        continue;
    }

    fs.writeFileSync(full, html, 'utf8');
    injected++;
    console.log('  已注入: ' + rel);
}

console.log('\n完成：注入 ' + injected + ' 个页面，跳过 ' + skipped + ' 个，失败 ' + failed + ' 个。');
