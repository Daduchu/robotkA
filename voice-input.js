/**
 * voice-input.js — robotkA 语音输入组件（全站）v2
 *
 * 功能：给两处输入框附加麦克风按钮，支持语音转文字：
 *   1. 主页搜索框（#searchInput）
 *   2. 智能客服输入框（.rk-chat-foot input，chat.js 懒创建，用 MutationObserver 等待）
 *
 * v2 升级：
 *   - 中/英双语识别，麦克风旁的语言按钮一键切换（localStorage 记忆），录音中切换即时生效
 *   - 连续识别模式：可以一直说，说完点麦克风（此时是停止按钮）手动结束
 *   - 录音中按钮红色脉动 + 白色弧线转圈 + 停止图标，placeholder 实时提示状态
 *
 * 技术：浏览器原生 Web Speech API（SpeechRecognition），
 *       零服务器、零依赖、零成本；Chrome / Edge 支持最佳。
 * 降级：不支持的浏览器（如 Firefox）自动隐藏麦克风按钮，不影响原功能。
 */
(function () {
    'use strict';

    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return; /* 浏览器不支持，静默退出 */

    /* ---------- 样式 ---------- */
    var CSS = ''
        + '.rk-mic{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;'
        + 'border:1px solid var(--input-border,#dcdcdc);border-radius:50%;background:var(--surface,#fff);'
        + 'color:var(--text-secondary,#666);cursor:pointer;flex:none;padding:0;transition:all .2s;position:relative;}'
        + '.rk-mic:hover{color:var(--accent,#0052d9);border-color:var(--accent,#0052d9);}'
        + '.rk-mic:focus-visible{outline:2px solid var(--accent,#0052d9);outline-offset:2px;}'
        + '.rk-mic svg{width:17px;height:17px;fill:currentColor;}'
        + '.rk-mic.rec{background:#e5494d;border-color:#e5494d;color:#fff;animation:rk-mic-pulse 1.2s infinite;}'
        + '@keyframes rk-mic-pulse{0%,100%{box-shadow:0 0 0 0 rgba(229,73,77,.45)}50%{box-shadow:0 0 0 7px rgba(229,73,77,0)}}'
        /* 录音中：白色弧线转圈（叠加在按钮外缘） */
        + '.rk-mic.rec::before{content:"";position:absolute;inset:-4px;border-radius:50%;'
        + 'border:2px solid transparent;border-top-color:#e5494d;border-right-color:rgba(229,73,77,.35);'
        + 'animation:rk-spin .9s linear infinite;pointer-events:none;}'
        + '@keyframes rk-spin{to{transform:rotate(360deg)}}'
        /* 语言切换按钮（麦克风旁小角标） */
        + '.rk-mic-lang{display:inline-flex;align-items:center;justify-content:center;height:34px;min-width:34px;'
        + 'padding:0 8px;border:1px solid var(--input-border,#dcdcdc);border-radius:17px;'
        + 'background:var(--surface,#fff);color:var(--text-secondary,#666);cursor:pointer;flex:none;'
        + 'font-size:12px;font-weight:600;transition:all .2s;user-select:none;}'
        + '.rk-mic-lang:hover{color:var(--accent,#0052d9);border-color:var(--accent,#0052d9);}'
        + '.rk-mic-lang:focus-visible{outline:2px solid var(--accent,#0052d9);outline-offset:2px;}'
        + '.rk-mic-lang.on{background:var(--accent,#0052d9);border-color:var(--accent,#0052d9);color:#fff;}'
        /* 搜索框内嵌式（绝对定位在输入框右内侧） */
        + '.rk-mic-inner{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:36px;height:36px;}'
        + '.rk-mic-lang-inner{position:absolute;right:50px;top:50%;transform:translateY(-50%);height:28px;min-width:30px;'
        + 'padding:0 7px;font-size:11px;border-radius:14px;}'
        + '@media print{.rk-mic,.rk-mic-lang{display:none !important;}}';

    var MIC_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>';
    var STOP_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';

    var styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    (document.head || document.documentElement).appendChild(styleEl);

    /* ---------- 语言状态 ---------- */
    var LANGS = { 'zh-CN': '中', 'en-US': 'EN' };
    var lang = 'zh-CN';
    try { var saved = localStorage.getItem('rk-mic-lang'); if (LANGS[saved]) lang = saved; } catch (e) { /* ignore */ }
    var langBtns = []; /* 所有语言按钮，切换时同步 UI */

    function setLang(l, restart) {
        lang = l;
        try { localStorage.setItem('rk-mic-lang', l); } catch (e) { /* ignore */ }
        for (var i = 0; i < langBtns.length; i++) {
            langBtns[i].textContent = LANGS[l];
            langBtns[i].classList.toggle('on', true); /* 录音中高亮当前语言 */
            langBtns[i].setAttribute('aria-label', '切换语音识别语言，当前：' + (l === 'zh-CN' ? '中文' : 'English'));
        }
        /* 录音中切换：以新语言立即重启识别（已识别文字保留） */
        if (restart && activeInput) {
            finalBase = activeInput.value || '';
            sessionFinal = '';
            userStopped = false;
            langSwitching = true;
            if (rec) { try { rec.stop(); } catch (e) { /* ignore */ } }
        }
    }

    function makeLangBtn(mode) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'rk-mic-lang' + (mode === 'inner' ? ' rk-mic-lang-inner' : '');
        b.textContent = LANGS[lang];
        b.setAttribute('aria-label', '切换语音识别语言，当前：' + (lang === 'zh-CN' ? '中文' : 'English'));
        b.title = '切换识别语言（中文 / English）';
        b.addEventListener('click', function (e) {
            e.stopPropagation();
            var next = lang === 'zh-CN' ? 'en-US' : 'zh-CN';
            var wasRecording = !!rec;
            setLang(next, wasRecording);
        });
        langBtns.push(b);
        return b;
    }

    /* ---------- 识别器（全局单例，同时只允许一路录音） ---------- */
    var rec = null;
    var activeBtn = null;     /* 正在录音的按钮 */
    var activeInput = null;   /* 对应的输入框 */
    var finalBase = '';       /* 已确认文字（追加模式） */
    var sessionFinal = '';    /* 本次会话累计的最终结果 */
    var userStopped = false;  /* 用户主动停止（否则静音断线自动重启） */
    var langSwitching = false;/* 语言切换中（停止后立即以新语言重启） */
    var restartTimer = null;

    function stopRec() {
        userStopped = true;
        if (rec) { try { rec.stop(); } catch (e) { /* ignore */ } }
    }

    function setBtnState(btn, recording) {
        btn.classList.toggle('rec', recording);
        btn.innerHTML = recording ? STOP_SVG : MIC_SVG;
        btn.setAttribute('aria-label', recording ? '停止语音输入' : '语音输入');
        btn.title = recording ? '正在录音，点击停止' : '点击语音输入';
    }

    function clearUI() {
        if (activeInput) {
            activeInput.placeholder = activeInput.dataset.ph || activeInput.placeholder;
            activeInput.focus();
            activeInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (activeBtn) setBtnState(activeBtn, false);
        for (var i = 0; i < langBtns.length; i++) langBtns[i].classList.remove('on');
        rec = null; activeBtn = null; activeInput = null; sessionFinal = '';
        if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
    }

    function startRec(btn, input) {
        if (!langSwitching) { /* 语言切换重启时跳过停止判断 */
            if (activeBtn === btn) { stopRec(); return; } /* 录音中再点一次 = 停止 */
            if (activeBtn) stopRec(); /* 切换目标输入框 */
        }

        activeBtn = btn;
        activeInput = input;
        finalBase = input.value || '';
        sessionFinal = '';
        userStopped = false;

        var langName = lang === 'zh-CN' ? '中文' : 'English';
        input.placeholder = '正在聆听（' + langName + '）· 说完点红色按钮结束';

        rec = new SR();
        rec.lang = lang;
        rec.interimResults = true;  /* 实时回显中间结果 */
        rec.continuous = true;      /* 连续模式：可以一直说，手动停止 */
        rec.maxAlternatives = 1;

        rec.onresult = function (e) {
            var interim = '', fin = '';
            for (var i = e.resultIndex; i < e.results.length; i++) {
                var r = e.results[i];
                if (r.isFinal) fin += r[0].transcript;
                else interim += r[0].transcript;
            }
            if (fin) sessionFinal += fin;
            activeInput.value = finalBase + sessionFinal + interim;
            /* 触发 input 事件，让搜索/客服逻辑照常响应 */
            activeInput.dispatchEvent(new Event('input', { bubbles: true }));
        };

        rec.onerror = function (e) {
            var msg = '语音识别出错，请重试';
            if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                msg = '麦克风权限被拒绝，请在浏览器地址栏允许麦克风后重试';
                userStopped = true; /* 权限问题不重启 */
            } else if (e.error === 'no-speech') {
                return; /* 静音不算错误，交给 onend 自动重启 */
            } else if (e.error === 'network') {
                msg = '网络异常，语音服务不可用';
                userStopped = true;
            } else if (e.error === 'aborted') {
                return; /* 语言切换/切换目标时的正常中断 */
            }
            if (activeInput && userStopped) activeInput.placeholder = msg;
        };

        rec.onend = function () {
            if (!activeInput) return; /* 已清理 */
            if (langSwitching) {
                /* 语言切换：立即以新语言重启，录音状态保持 */
                langSwitching = false;
                var sBtn = activeBtn, sInput = activeInput;
                setTimeout(function () {
                    if (activeBtn === sBtn && activeInput === sInput) startRec(sBtn, sInput);
                }, 100);
                return;
            }
            if (!userStopped) {
                /* 连续模式：静音断线后短暂自动重启，保持录音状态 */
                var cur = activeBtn, curInput = activeInput;
                restartTimer = setTimeout(function () {
                    if (activeBtn === cur && activeInput === curInput) startRecInner(cur, curInput);
                }, 300);
                return;
            }
            /* 用户主动停止：落盘最终文本 */
            activeInput.value = finalBase + sessionFinal;
            clearUI();
        };

        startRecInner(btn, input);
    }

    function startRecInner(btn, input) {
        setBtnState(btn, true);
        for (var i = 0; i < langBtns.length; i++) {
            langBtns[i].classList.toggle('on', true);
            langBtns[i].textContent = LANGS[lang];
        }
        input.placeholder = '正在聆听（' + (lang === 'zh-CN' ? '中文' : 'English') + '）· 说完点红色按钮结束';
        try { rec.start(); } catch (e) { clearUI(); }
    }

    function makeMicBtn(mode) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'rk-mic' + (mode === 'inner' ? ' rk-mic-inner' : '');
        b.innerHTML = MIC_SVG;
        setBtnState(b, false);
        return b;
    }

    /* 给输入框附加麦克风 + 语言按钮。mode: 'inline'（flex 行内）/ 'inner'（绝对定位内嵌） */
    function attach(input, mode) {
        if (!input || input.dataset.rkMic) return; /* 幂等 */
        input.dataset.rkMic = '1';
        input.dataset.ph = input.placeholder || '';

        var btn = makeMicBtn(mode);
        var langBtn = makeLangBtn(mode);
        btn.addEventListener('click', function () { startRec(btn, input); });

        if (mode === 'inner') {
            /* 输入框父容器需 position:relative（.search-box 已满足） */
            var host = input.parentElement;
            if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
            host.appendChild(langBtn);
            host.appendChild(btn);
            input.style.paddingRight = '94px'; /* 给两个按钮腾位 */
        } else {
            var foot = input.parentElement;
            foot.insertBefore(langBtn, input); /* 插在输入框左侧 */
            foot.insertBefore(btn, input);
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
        window.addEventListener('beforeunload', function () { userStopped = true; stopRec(); });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
