#!/usr/bin/env node
/**
 * inject-voice.js — 一次性工具：向所有 HTML 页面注入 voice-input.js（语音输入）引用
 *
 * 用法：node scripts/inject-voice.js
 * 幂等：已包含 voice-input.js 引用的文件会被跳过。
 * 注入位置：紧挨在 chat.js 引用之后（客服输入框也挂麦克风，需在 chat.js 后加载）；
 *           没有 chat.js 的页面则注入到 </body> 之前。
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

    if (html.includes('voice-input.js')) { skipped++; continue; }

    const depth = rel.split('/').length - 1;
    const src = '../'.repeat(depth) + 'voice-input.js';
    const tag = '<script src="' + src + '"></script>';

    /* 优先插在 chat.js 之后，保证客服输入框挂载时机正确 */
    const chatTag = /([ \t]*)<script src="[^"]*chat\.js"><\/script>\n?/;
    if (chatTag.test(html)) {
        html = html.replace(chatTag, (m, indent) => m.trimEnd() + '\n' + indent + tag + '\n');
    } else if (/<\/body>/i.test(html)) {
        html = html.replace(/<\/body>/i, '    ' + tag + '\n</body>');
    } else {
        console.error('  跳过（找不到插入点）: ' + rel);
        failed++;
        continue;
    }

    fs.writeFileSync(full, html, 'utf8');
    injected++;
    console.log('  已注入: ' + rel);
}

console.log('\n完成：注入 ' + injected + ' 个页面，跳过 ' + skipped + ' 个，失败 ' + failed + ' 个。');
