/* ============================================================
   robotkA 全站脚本：主题切换 + 返回顶部
   - 读取 localStorage 中的主题偏好（默认暗色）
   - 在所有页面注入右下角浮动按钮（主题切换 / 返回顶部）
   - 页面引入方式：<script src="theme.js"></script>（放在 <head> 中，
     以便在首次渲染前应用主题，避免闪烁）
   ============================================================ */
(function () {
    'use strict';

    var THEME_KEY = 'robotkA-theme';
    var theme = 'dark';

    try {
        var saved = localStorage.getItem(THEME_KEY);
        if (saved === 'light' || saved === 'dark') theme = saved;
    } catch (e) { /* 隐私模式下 localStorage 不可用，忽略 */ }

    document.documentElement.setAttribute('data-theme', theme);

    function onReady(fn) {
        if (document.readyState !== 'loading') { fn(); }
        else { document.addEventListener('DOMContentLoaded', fn); }
    }

    onReady(function () {
        /* ---------- 主题切换按钮 ---------- */
        var themeBtn = document.createElement('button');
        themeBtn.type = 'button';
        themeBtn.className = 'rk-fab rk-theme-toggle';
        themeBtn.setAttribute('aria-label', '切换亮色/暗色主题');
        themeBtn.title = '切换亮色/暗色主题';
        themeBtn.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀' : '☾';

        themeBtn.addEventListener('click', function () {
            var current = document.documentElement.getAttribute('data-theme');
            var next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
            themeBtn.textContent = next === 'dark' ? '☀' : '☾';
        });

        /* ---------- 返回顶部按钮 ---------- */
        var topBtn = document.createElement('button');
        topBtn.type = 'button';
        topBtn.className = 'rk-fab rk-back-top';
        topBtn.setAttribute('aria-label', '返回顶部');
        topBtn.title = '返回顶部';
        topBtn.textContent = '↑';

        topBtn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        var onScroll = function () {
            topBtn.classList.toggle('show', (window.scrollY || document.documentElement.scrollTop) > 300);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        document.body.appendChild(topBtn);
        document.body.appendChild(themeBtn);
    });
})();
