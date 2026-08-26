/* ============================================================
   robotkA 全站智能客服
   - 右下角悬浮按钮 + 对话面板（与主题切换/返回顶部按钮同列堆叠）
   - 知识来源两层：
     1) 内置 FAQ 知识库（关键词匹配，重点：机器人 DIY 初学者路线）
     2) search-index.json 全站文档搜索兜底
   - 复用 style.css 的 CSS 变量，自动适配亮/暗双主题
   - 页面引入方式：<script src="chat.js"></script>（放在 </body> 前）
     根目录相对路径由脚本自身的 src 自动推断，无需手动配置
   ============================================================ */
(function () {
    'use strict';

    /* ---------- 根路径推断：以本脚本 src 为准，兼容任意部署子路径 ---------- */
    var ROOT = '';
    (function () {
        var scripts = document.getElementsByTagName('script');
        for (var i = scripts.length - 1; i >= 0; i--) {
            var m = /(^|[\/])chat\.js$/.exec(scripts[i].src || '');
            if (m) { ROOT = (scripts[i].src || '').replace(/chat\.js$/, ''); break; }
        }
    })();
    var url = function (p) { return ROOT + encodeURI(p); };

    /* ---------- 站点主要入口（FAQ 与兜底链接使用） ---------- */
    var LINKS = {
        home: 'index.html',
        diy: '11. Science Education and Assessments/robot-diy/index.html',
        diyCh1: '11. Science Education and Assessments/robot-diy/chapter1-mechanics.html',
        diyCh2: '11. Science Education and Assessments/robot-diy/chapter2-electronics.html',
        diyCh3: '11. Science Education and Assessments/robot-diy/chapter3-software.html',
        diyCh4: '11. Science Education and Assessments/robot-diy/chapter4-projects.html',
        examKinder: '11. Science Education and Assessments/exam-kinder.html',
        examPrimary: '11. Science Education and Assessments/exam-primary.html',
        examMiddle: '11. Science Education and Assessments/exam-middle.html',
        examHigh: '11. Science Education and Assessments/exam-high.html',
        examUniversity: '11. Science Education and Assessments/exam-university.html'
    };

    /* ---------- 内置 FAQ 知识库 ---------- */
    var FAQ = [
        {
            keys: ['机器人diy', 'diy', '做机器人', '造机器人', '自制机器人', '做一个机器人', '做个机器人',
                   '零基础', '初学机器人', '机器人入门', '怎么入门', '新手', '初学者', '入门路线',
                   '怎么学机器人', '如何入门', '动手做', '自己动手'],
            answer: function () {
                return '<p>零基础做机器人，建议按「机器人 DIY」专栏的四步路线循序渐进：</p>' +
                    '<ol class="rk-steps">' +
                    '<li><a href="' + url(LINKS.diyCh1) + '" target="_blank"><b>① 机械基础</b>：机构学原理与机械设计，先让机器人"动起来"</a></li>' +
                    '<li><a href="' + url(LINKS.diyCh2) + '" target="_blank"><b>② 电子系统</b>：传感器、电机驱动与控制电路，让机器人"感觉得到"</a></li>' +
                    '<li><a href="' + url(LINKS.diyCh3) + '" target="_blank"><b>③ 软件大脑</b>：从机械到智能，坐标系、控制与编程</a></li>' +
                    '<li><a href="' + url(LINKS.diyCh4) + '" target="_blank"><b>④ 实战项目</b>：3 个难度等级的完整项目，边做边学</a></li>' +
                    '</ol>' +
                    '<p>每章都有学习重点和练习，完整路线与时间规划见<a href="' + url(LINKS.diy) + '" target="_blank">机器人 DIY 专栏首页</a>。点击链接即可开始学习 🚀</p>';
            }
        },
        {
            keys: ['机械', '结构设计', '机构', '底盘', '连杆', '齿轮', '传动', '自由度', '舵机选型', '结构怎么'],
            answer: function () {
                return '<p>机器人的"身体"——机械部分，推荐从<a href="' + url(LINKS.diyCh1) + '" target="_blank"><b>《第一章：机械基础》</b></a>开始：</p>' +
                    '<ul><li>机构学原理与机械设计基础</li><li>坐标系与空间变换</li><li>常见传动结构与选型思路</li></ul>' +
                    '<p>学完可以直接进入第二章的电子系统。</p>';
            }
        },
        {
            keys: ['电路', '传感器', '电机驱动', '接线', '电池', '电源', '单片机', '主控', 'arduino', 'arduion',
                   '电子', '控制电路', '马达', '原理图'],
            answer: function () {
                return '<p>机器人的"感官与肌肉"——电子部分，见<a href="' + url(LINKS.diyCh2) + '" target="_blank"><b>《第二章：传感器、电机驱动与控制电路》</b></a>：</p>' +
                    '<ul><li>2.1 传感器原理与选型</li><li>电机驱动与电源管理</li><li>控制电路搭建</li></ul>' +
                    '<p>想先了解整体路线？问我「零基础怎么做机器人」即可。</p>';
            }
        },
        {
            keys: ['编程', '写代码', '软件开发', 'ros', '固件', '算法', '控制算法', '软件', '代码', '大脑', '视觉识别'],
            answer: function () {
                return '<p>机器人的"大脑"——软件部分，见<a href="' + url(LINKS.diyCh3) + '" target="_blank"><b>《第三章：从机械到智能——软件是大脑》</b></a>：</p>' +
                    '<ul><li>从机械到智能的整体框架</li><li>坐标系与空间变换</li><li>控制与感知程序设计</li></ul>' +
                    '<p>学完前三章就可以进入实战项目了。</p>';
            }
        },
        {
            keys: ['实战项目', '项目', '避障小车', '循迹', '做辆小车', '比赛', '毕业设计', '课程设计', '练手'],
            answer: function () {
                return '<p>推荐<a href="' + url(LINKS.diyCh4) + '" target="_blank"><b>《第四章：三个实战项目，三个难度等级》</b></a>：</p>' +
                    '<ul><li>入门级：适合刚完成前三章的读者</li><li>进阶级：综合运用机械、电子、软件</li><li>挑战级：接近真实产品/竞赛水准</li></ul>' +
                    '<p>每个项目都有完整的方案说明，可以直接照着做。</p>';
            }
        },
        {
            keys: ['考试', '测评', '试卷', '考级', '机器人等级', '能力测评', '题目', '测验'],
            answer: function () {
                return '<p>本站「科普教育与测评」栏目提供五个学段的机器人能力测评卷：</p>' +
                    '<ul>' +
                    '<li><a href="' + url(LINKS.examKinder) + '" target="_blank">幼儿园测评</a></li>' +
                    '<li><a href="' + url(LINKS.examPrimary) + '" target="_blank">小学测评</a></li>' +
                    '<li><a href="' + url(LINKS.examMiddle) + '" target="_blank">初中测评</a></li>' +
                    '<li><a href="' + url(LINKS.examHigh) + '" target="_blank">高中测评</a></li>' +
                    '<li><a href="' + url(LINKS.examUniversity) + '" target="_blank">大学测评</a></li>' +
                    '</ul>';
            }
        },
        {
            keys: ['搜索', '查找', '怎么找', '找资料', '怎么用这个网站', '网站怎么用', '检索'],
            answer: function () {
                return '<p>两种方式查找内容：</p>' +
                    '<ul><li><b>站内搜索</b>：回到<a href="' + url(LINKS.home) + '" target="_blank">首页</a>，顶部搜索框输入关键词即可全文检索全部 54 篇文档</li>' +
                    '<li><b>问我</b>：直接把问题打在这里，我会帮你找到相关文档 🤖</li></ul>';
            }
        },
        {
            keys: ['关于', '这是什么网站', 'robotka是什么', '知识库是什么', '网站介绍', '你是谁'],
            answer: function () {
                return '<p>这里是 <b>robotkA 机器人知识库</b>——覆盖机器人基础概念、核心技术、应用领域、发展历史、法律法规、公司产品、教育资源、技术标准、产业生态、前沿研究共 11 大类的中文知识网站。</p>' +
                    '<p>我是站内智能客服，可以帮你定位资料、解答学习路线问题。试试问我「零基础怎么做机器人」？</p>';
            }
        }
    ];

    /* ---------- 中文检索：查询词切成 二元组 + 英文单词 ---------- */
    function tokenize(q) {
        var tokens = [], m, i;
        var latin = q.toLowerCase().match(/[a-z][a-z0-9]{1,}/g) || [];
        tokens = tokens.concat(latin);
        var cjk = q.replace(/[^\u4e00-\u9fff]/g, '');
        for (i = 0; i < cjk.length - 1; i++) tokens.push(cjk.substr(i, 2));
        return tokens;
    }

    /* ---------- 全站搜索兜底 ---------- */
    var searchIndex = null;
    function loadIndex(cb) {
        if (searchIndex) { cb(searchIndex); return; }
        fetch(ROOT + 'search-index.json').then(function (r) { return r.json(); })
            .then(function (d) { searchIndex = d; cb(d); })
            .catch(function () { cb(null); });
    }

    function searchSite(query) {
        var tokens = tokenize(query);
        if (!tokens.length) return [];
        return loadIndexPromise().then(function (docs) {
            if (!docs) return null;
            var scored = [];
            docs.forEach(function (d) {
                var title = (d.title || '').toLowerCase();
                var content = (d.content || '').toLowerCase();
                var score = 0;
                tokens.forEach(function (t) {
                    if (title.indexOf(t) >= 0) score += 5;
                    else if (content.indexOf(t) >= 0) score += 1;
                });
                if (score > 0) scored.push({ doc: d, score: score });
            });
            scored.sort(function (a, b) { return b.score - a.score; });
            return scored.slice(0, 4).map(function (s) { return s.doc; });
        });
    }

    var indexPromise = null;
    function loadIndexPromise() {
        if (!indexPromise) {
            indexPromise = fetch(ROOT + 'search-index.json').then(function (r) { return r.json(); }).catch(function () { return null; });
        }
        return indexPromise;
    }

    /* ---------- 样式（复用全站 CSS 变量，随 data-theme 自动切换） ---------- */
    var CSS = ''
        + '.rk-chat-toggle{position:fixed;right:24px;bottom:136px;z-index:90;width:46px;height:46px;border-radius:50%;'
        + 'background:var(--accent);color:#fff;border:none;font-size:20px;line-height:1;cursor:pointer;'
        + 'display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.25);'
        + 'transition:transform .2s;}'
        + '.rk-chat-toggle:hover{transform:scale(1.08);}'
        + '.rk-chat-panel{position:fixed;right:24px;bottom:136px;z-index:120;width:360px;max-width:calc(100vw - 32px);'
        + 'height:min(540px,calc(100vh - 160px));display:none;flex-direction:column;border-radius:14px;overflow:hidden;'
        + 'background:var(--surface);border:1px solid var(--card-border);box-shadow:0 12px 40px rgba(0,0,0,.3);}'
        + '.rk-chat-panel.open{display:flex;}'
        + '.rk-chat-head{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--accent);color:#fff;flex:none;}'
        + '.rk-chat-head .avatar{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:16px;}'
        + '.rk-chat-head .info{flex:1;min-width:0;}'
        + '.rk-chat-head .name{font-size:14px;font-weight:600;}'
        + '.rk-chat-head .status{font-size:11px;opacity:.85;}'
        + '.rk-chat-head .close{background:none;border:none;color:#fff;font-size:18px;cursor:pointer;padding:4px 8px;border-radius:6px;}'
        + '.rk-chat-head .close:hover{background:rgba(255,255,255,.15);}'
        + '.rk-chat-body{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;}'
        + '.rk-msg{max-width:86%;padding:9px 12px;border-radius:12px;font-size:13.5px;line-height:1.65;word-break:break-word;}'
        + '.rk-msg.bot{align-self:flex-start;background:var(--surface-soft);border:1px solid var(--card-border);border-bottom-left-radius:4px;color:var(--content-text,var(--text-color,#eee));}'
        + '.rk-msg.user{align-self:flex-end;background:var(--accent);color:#fff;border-bottom-right-radius:4px;}'
        + '.rk-msg a{color:var(--accent);text-decoration:underline;}'
        + '.rk-msg.user a{color:#fff;}'
        + '.rk-msg ul,.rk-msg ol{margin:6px 0 2px;padding-left:18px;}'
        + '.rk-msg li{margin:3px 0;}'
        + '.rk-msg .rk-steps li{margin:6px 0;}'
        + '.rk-chips{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px 2px;flex:none;}'
        + '.rk-chip{border:1px solid var(--card-border);background:var(--surface-soft);color:var(--content-text,var(--text-color,#eee));'
        + 'border-radius:14px;padding:4px 10px;font-size:12px;cursor:pointer;transition:all .15s;}'
        + '.rk-chip:hover{border-color:var(--accent);color:var(--accent);}'
        + '.rk-chat-foot{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--card-border);flex:none;background:var(--surface);}'
        + '.rk-chat-foot input{flex:1;background:var(--input-bg);border:1px solid var(--input-border);border-radius:8px;'
        + 'padding:8px 10px;font-size:13px;color:inherit;outline:none;min-width:0;}'
        + '.rk-chat-foot input:focus{border-color:var(--accent);}'
        + '.rk-chat-foot .send{background:var(--accent);color:#fff;border:none;border-radius:8px;padding:0 14px;font-size:13px;cursor:pointer;}'
        + '.rk-chat-foot .send:hover{opacity:.88;}'
        + '.rk-typing{align-self:flex-start;display:flex;gap:4px;padding:10px 12px;}'
        + '.rk-typing span{width:6px;height:6px;border-radius:50%;background:var(--content-text,var(--text-color,#999));opacity:.5;animation:rkblink 1.2s infinite;}'
        + '.rk-typing span:nth-child(2){animation-delay:.2s}.rk-typing span:nth-child(3){animation-delay:.4s}'
        + '@keyframes rkblink{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}'
        + '@media (max-width:640px){'
        + '.rk-chat-toggle{right:16px;bottom:120px;width:42px;height:42px;}'
        + '.rk-chat-panel{right:16px;bottom:120px;}'
        + '}'
        + '@media print{.rk-chat-toggle,.rk-chat-panel{display:none !important;}}';

    /* ---------- DOM 构建 ---------- */
    var panel, body, input, greeted = false;

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function addMsg(html, who) {
        var div = document.createElement('div');
        div.className = 'rk-msg ' + who;
        div.innerHTML = html;
        body.appendChild(div);
        body.scrollTop = body.scrollHeight;
    }

    function typing(cb) {
        var t = document.createElement('div');
        t.className = 'rk-typing';
        t.innerHTML = '<span></span><span></span><span></span>';
        body.appendChild(t);
        body.scrollTop = body.scrollHeight;
        setTimeout(function () {
            t.remove();
            cb();
        }, 420 + Math.random() * 300);
    }

    var CHIPS = ['零基础怎么做机器人？', '机器人 DIY 学习路线', '传感器怎么选？', '有实战项目吗？', '测评试卷在哪？'];

    function addChips() {
        var wrap = panel.querySelector('.rk-chips');
        wrap.innerHTML = '';
        CHIPS.forEach(function (text) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'rk-chip';
            b.textContent = text;
            b.addEventListener('click', function () { send(text); });
            wrap.appendChild(b);
        });
    }

    /* ---------- 匹配与应答 ---------- */
    function matchFaq(q) {
        var lower = q.toLowerCase();
        var best = null, bestHits = 0;
        FAQ.forEach(function (item) {
            var hits = 0;
            item.keys.forEach(function (k) { if (lower.indexOf(k) >= 0) hits += k.length; });
            if (hits > bestHits) { bestHits = hits; best = item; }
        });
        return bestHits >= 2 ? best : null;   // 命中长度阈值，避免误触发
    }

    function answer(query) {
        var faq = matchFaq(query);
        if (faq) { addMsg(faq.answer(), 'bot'); return; }

        searchSite(query).then(function (docs) {
            if (docs && docs.length) {
                var html = '<p>没有直接命中 FAQ，但我在知识库里找到这些相关文档：</p><ul>';
                docs.forEach(function (d) {
                    html += '<li><a href="' + url(d.url) + '" target="_blank">' + escapeHtml(d.title) + '</a>'
                          + '<br><small style="opacity:.7">' + escapeHtml(d.category) + '</small></li>';
                });
                html += '</ul><p>也可以换个说法再问我，或回到<a href="' + url(LINKS.home) + '" target="_blank">首页</a>用搜索框全文检索。</p>';
                addMsg(html, 'bot');
            } else {
                addMsg('<p>这个问题我暂时没找到对应资料 😥 你可以：换个关键词再问、回<a href="' + url(LINKS.home)
                    + '" target="_blank">首页</a>用搜索框检索，或者试试「零基础怎么做机器人」。</p>', 'bot');
            }
        });
    }

    function send(text) {
        text = (text || input.value).trim();
        if (!text) return;
        input.value = '';
        addChipsVisible(false);
        addMsg(escapeHtml(text), 'user');
        typing(function () { answer(text); });
    }

    function addChipsVisible(show) {
        panel.querySelector('.rk-chips').style.display = show ? 'flex' : 'none';
    }

    function greet() {
        if (greeted) return;
        greeted = true;
        addMsg('<p>你好！我是 robotkA 智能客服 🤖<br>我可以帮你：</p>'
            + '<ul><li>规划<b>机器人 DIY 学习路线</b>（机械 → 电子 → 软件 → 实战）</li>'
            + '<li>查找知识库里的任何资料</li><li>定位各学段的测评试卷</li></ul>'
            + '<p>请问有什么可以帮你？</p>', 'bot');
        addChips();
        addChipsVisible(true);
    }

    function buildUI() {
        var style = document.createElement('style');
        style.textContent = CSS;
        document.head.appendChild(style);

        /* 悬浮按钮 */
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'rk-chat-toggle';
        btn.setAttribute('aria-label', '打开智能客服');
        btn.title = '智能客服';
        btn.innerHTML = '&#129302;';

        /* 对话面板 */
        panel = document.createElement('div');
        panel.className = 'rk-chat-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'robotkA 智能客服');
        panel.innerHTML = ''
            + '<div class="rk-chat-head">'
            + '  <div class="avatar">&#129302;</div>'
            + '  <div class="info"><div class="name">robotkA 智能客服</div><div class="status">● 在线 · 机器人知识向导</div></div>'
            + '  <button type="button" class="close" aria-label="关闭客服面板">&times;</button>'
            + '</div>'
            + '<div class="rk-chat-body" aria-live="polite"></div>'
            + '<div class="rk-chips"></div>'
            + '<div class="rk-chat-foot">'
            + '  <input type="text" placeholder="输入问题，如：零基础怎么做机器人" aria-label="输入问题" maxlength="200">'
            + '  <button type="button" class="send">发送</button>'
            + '</div>';

        document.body.appendChild(btn);
        document.body.appendChild(panel);

        body = panel.querySelector('.rk-chat-body');
        input = panel.querySelector('input');

        function toggle(open) {
            var isOpen = open !== undefined ? open : !panel.classList.contains('open');
            panel.classList.toggle('open', isOpen);
            if (isOpen) { greet(); setTimeout(function () { input.focus(); }, 50); }
        }

        btn.addEventListener('click', function () { toggle(); });
        panel.querySelector('.close').addEventListener('click', function () { toggle(false); });
        panel.querySelector('.send').addEventListener('click', function () { send(); });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); send(); }
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && panel.classList.contains('open')) toggle(false);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildUI);
    } else {
        buildUI();
    }
})();
