/**
 * voice-input.js — robotkA 语音输入组件（全站）
 *
 * 功能：给两处输入框附加麦克风按钮，支持语音转文字：
 *   1. 主页搜索框（#searchInput）
 *   2. 智能客服输入框（.rk-chat-foot input，chat.js 懒创建，用 MutationObserver 等待）
 *
 * 技术：浏览器原生 Web Speech API（SpeechRecognition），
 *       零服务器、零依赖、零成本；Chrome / Edge 支持最佳。
 * 降级：不支持的浏览器（如 Firefox）自动隐藏麦克风按钮，不影响原功能。
 *
 * 根路径由本文件自身的 <script src> 自动推断（与 chat.js 同机制），
 * 但本组件无外部请求，仅用于与 chat.js 保持一致的加载模式。
 */
(function () {
    'use strict';

    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return; /* 浏览器不支持，静默退出 */

    /* ---------- 样式 ---------- */
    var CSS = ''
        + '.rk-mic{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;'
        + 'border:1px solid var(--input-border,#dcdcdc);border-radius:50%;background:var(--surface,#fff);'
        + 'color:var(--text-secondary,#666);cursor:pointer;flex:none;padding:0;transition:all .2s;}'
        + '.rk-mic:hover{color:var(--accent,#0052d9);border-color:var(--accent,#0052d9);}'
        + '.rk-mic:focus-visible{outline:2px solid var(--accent,#0052d9);outline-offset:2px;}'
        + '.rk-mic svg{width:17px;height:17px;fill:currentColor;}'
        + '.rk-mic.rec{background:#e5494d;border-color:#e5494d;color:#fff;animation:rk-mic-pulse 1.2s infinite;}'
        + '@keyframes rk-mic-pulse{0%,100%{box-shadow:0 0 0 0 rgba(229,73,77,.45)}50%{box-shadow:0 0 0 7px rgba(229,73,77,0)}}'
        /* 搜索框内嵌式（绝对定位在输入框右内侧） */
        + '.rk-mic-inner{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:36px;height:36px;}'
        + '@media print{.rk-mic{display:none !important;}}';

    var MIC_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>';

    var styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    (document.head || document.documentElement).appendChild(styleEl);

    /* ---------- 识别器（全局单例，同时只允许一路录音） ---------- */
    var rec = null;
    var activeBtn = null;   /* 正在录音的按钮 */
    var activeInput = null; /* 对应的输入框 */
    var finalBase = '';     /* 开始录音时输入框已有的文字（追加模式） */

    function stopRec() {
        if (rec) { try { rec.stop(); } catch (e) { /* ignore */ } }
    }

    function setBtnState(btn, recording) {
        btn.classList.toggle('rec', recording);
        btn.setAttribute('aria-label', recording ? '停止语音输入' : '语音输入');
        btn.title = recording ? '正在录音，点击停止' : '点击语音输入';
    }

    function startRec(btn, input) {
        if (activeBtn === btn) { stopRec(); return; } /* 再点一次 = 停止 */
        if (activeBtn) stopRec(); /* 切换目标 */

        activeBtn = btn;
        activeInput = input;
        finalBase = input.value || '';
        input.placeholder = '正在聆听，请说话…';

        rec = new SR();
        rec.lang = 'zh-CN';
        rec.interimResults = true;   /* 实时回显中间结果 */
        rec.continuous = false;      /* 单句模式，说完自动结束 */

        rec.onresult = function (e) {
            var interim = '', final_ = '';
            for (var i = e.resultIndex; i < e.results.length; i++) {
                var r = e.results[i];
                if (r.isFinal) final_ += r[0].transcript;
                else interim += r[0].transcript;
            }
            activeInput.value = finalBase + final_ + interim;
            /* 触发 input 事件，让搜索/客服逻辑照常响应 */
            activeInput.dispatchEvent(new Event('input', { bubbles: true }));
        };

        rec.onend = function () {
            if (activeInput) {
                activeInput.placeholder = activeInput.dataset.ph || activeInput.placeholder;
                activeInput.focus();
                /* 结束后再触发一次 input，确保最终文本生效 */
                activeInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (activeBtn) { setBtnState(activeBtn, false); }
            rec = null; activeBtn = null; activeInput = null;
        };

        rec.onerror = function (e) {
            var msg = '语音识别出错，请重试';
            if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                msg = '麦克风权限被拒绝，请在浏览器地址栏允许麦克风后重试';
            } else if (e.error === 'no-speech') {
                msg = '没听到声音，请靠近麦克风再试';
            } else if (e.error === 'network') {
                msg = '网络异常，语音服务不可用';
            }
            if (activeInput) activeInput.placeholder = msg;
        };

        setBtnState(btn, true);
        try { rec.start(); } catch (e) { setBtnState(btn, false); rec = null; activeBtn = null; }
    }

    function makeMicBtn(mode) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'rk-mic' + (mode === 'inner' ? ' rk-mic-inner' : '');
        b.innerHTML = MIC_SVG;
        setBtnState(b, false);
        return b;
    }

    /* 给输入框附加麦克风。mode: 'inline'（flex 行内）/ 'inner'（绝对定位内嵌） */
    function attach(input, mode) {
        if (!input || input.dataset.rkMic) return; /* 幂等 */
        input.dataset.rkMic = '1';
        input.dataset.ph = input.placeholder || '';

        var btn = makeMicBtn(mode);
        btn.addEventListener('click', function () { startRec(btn, input); });

        if (mode === 'inner') {
            /* 输入框父容器需 position:relative（.search-box 已满足） */
            var host = input.parentElement;
            if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
            host.appendChild(btn);
            input.style.paddingRight = '52px'; /* 给按钮腾位 */
        } else {
            input.parentElement.insertBefore(btn, input); /* 插在输入框左侧 */
        }
    }

    /* ---------- 挂载点 1：主页搜索框 ---------- */
    function mountSearch() {
        var si = document.getElementById('searchInput');
        if (si && si.closest('.search-box')) attach(si, 'inner');
    }

    /* ---------- 挂载点 2：客服输入框（chat.js 懒创建，用 observer 等待） ---------- */
    function mountChat() {
        var foot = document.querySelector('.rk-chat-foot');
        if (foot) {
            var ci = foot.querySelector('input');
            if (ci) attach(ci, 'inline');
            return !!ci;
        }
        return false;
    }

    function boot() {
        mountSearch();
        if (!mountChat()) {
            var ob = new MutationObserver(function () {
                if (mountChat()) ob.disconnect();
            });
            ob.observe(document.body, { childList: true, subtree: true });
            /* 保险：30 秒后停止观察，避免常驻开销 */
            setTimeout(function () { ob.disconnect(); }, 30000);
        }
        /* 页面卸载时停止录音 */
        window.addEventListener('beforeunload', stopRec);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
