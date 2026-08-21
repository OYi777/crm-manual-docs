/* 批注（本文路径）点击跳转
 * - 扫描正文中的“注释见本文路径：/见本路径：/文档路径：/配置路径：”等批注
 * - 按正文标题层级解析路径，兼容：缺分隔符（如“...提现设置）3.Aipay配置”）、
 *   跳过中间层级（如“第三章首页\2.普通用户视角\2.1.1推荐码”）、
 *   前后缀编号差异（如“二、配置参数”对应标题“配置参数”）、全半角引号差异等写法
 * - 命中则整段批注变成可点击链接，点击平滑滚动到目标标题并高亮闪烁
 * - 未命中时退而链接批注中 [某章某节] 形式的引用，仍未命中则保持纯文字
 */
(function () {
  "use strict";

  /* 批注标记正则（长模式在前，避免被短模式截断） */
  var MARKER_RE = /(?:配置路径见本文|注释见(?:本文|本)路径|见(?:本文|本)路径|(?:开关配置)?文档路径|配置路径)\s*[:：]/g;

  /* 标题树：按 h2-h6 层级构建 */
  function buildHeadingTree(article) {
    var root = { level: 0, children: [] };
    var stack = [root];
    article.querySelectorAll("h2, h3, h4, h5, h6").forEach(function (el) {
      var level = parseInt(el.tagName.charAt(1), 10);
      var node = { el: el, title: el.textContent, level: level, children: [] };
      while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    });
    return root.children;
  }

  /* 规范化标题/路径片段：小写、去空白标点、去前缀编号（“第X章”保留） */
  function normalize(s) {
    return s
      .toLowerCase()
      .replace(/[\s　【】「」\[\]（）()、，,；;：:。．.·•\-—–_\/\\]+/g, "")
      .replace(/^[0-9零一二三四五六七八九十百千]+/, "");
  }

  /* 按标题树解析路径：逐层消费前缀，支持跳过中间层级；返回最深命中节点 */
  function resolvePath(text, chapters) {
    var remaining = normalize(text);
    var frontier = chapters;
    var node = null;
    while (frontier.length) {
      var best = null;
      /* 广度优先搜索当前候选池的全部后代，取最长前缀命中 */
      var queue = frontier.slice();
      while (queue.length) {
        var cand = queue.shift();
        var t = normalize(cand.title);
        if (t && remaining.indexOf(t) === 0 && (!best || t.length > best.t.length)) {
          best = { cand: cand, t: t };
        }
        Array.prototype.push.apply(queue, cand.children);
      }
      if (!best) break;
      node = best.cand;
      /* 消费命中部分，并去掉余下片段开头的编号（如缺失分隔符的“3.”） */
      remaining = remaining.slice(best.t.length)
        .replace(/^[0-9零一二三四五六七八九十百千]+/, "");
      frontier = best.cand.children;
    }
    return node;
  }

  /* 批注内容结束位置：括号配对扫描，遇句末标点/换行停止，最长 220 字符 */
  function findSpanEnd(text, from) {
    var depth = 0;
    var i = from;
    var limit = Math.min(text.length, from + 220);
    while (i < limit) {
      var ch = text.charAt(i);
      if (ch === "（" || ch === "(") {
        depth++;
      } else if (ch === "）" || ch === ")") {
        depth--;
        if (depth < 0) break;
      } else if (depth === 0 && (ch === "。" || ch === "；" || ch === ";" || ch === "\n")) {
        break;
      }
      i++;
    }
    return i;
  }

  function makeLink(node, text) {
    var a = document.createElement("a");
    a.className = "doc-path-link";
    a.href = "#" + node.el.id;
    a.textContent = text;
    return a;
  }

  /* 未整体命中时，链接批注中 [某章某节] 形式的引用 */
  function linkifyBracketRefs(chapters, text) {
    var re = /\[([^\[\]]+)\]/g;
    var m;
    var parts = [];
    var last = 0;
    while ((m = re.exec(text))) {
      var node = resolvePath(m[1], chapters);
      if (!node) continue;
      parts.push(document.createTextNode(text.slice(last, m.index + 1)));
      parts.push(makeLink(node, m[1]));
      parts.push(document.createTextNode("]"));
      last = m.index + m[0].length;
    }
    if (!parts.length) return document.createTextNode(text);
    var span = document.createElement("span");
    parts.push(document.createTextNode(text.slice(last)));
    parts.forEach(function (n) { span.appendChild(n); });
    return span;
  }

  /* 处理单个文本节点：单遍重建，命中段落包成链接 */
  function processTextNode(textNode, chapters) {
    var text = textNode.data;
    MARKER_RE.lastIndex = 0;
    var m;
    var spans = [];
    while ((m = MARKER_RE.exec(text))) {
      var end = findSpanEnd(text, MARKER_RE.lastIndex);
      spans.push({ start: m.index, end: end });
      MARKER_RE.lastIndex = Math.max(end, m.index + 1); /* 防止重叠/死循环 */
    }
    if (!spans.length) return;

    var frag = document.createDocumentFragment();
    var pos = 0;
    spans.forEach(function (s) {
      if (pos < s.start) {
        frag.appendChild(document.createTextNode(text.slice(pos, s.start)));
      }
      var spanText = text.slice(s.start, s.end);
      var colon = spanText.search(/[:：]/);
      var content = colon >= 0 ? spanText.slice(colon + 1) : spanText;
      var node = resolvePath(content, chapters);
      frag.appendChild(node ? makeLink(node, spanText) : linkifyBracketRefs(chapters, spanText));
      pos = s.end;
    });
    if (pos < text.length) {
      frag.appendChild(document.createTextNode(text.slice(pos)));
    }
    textNode.parentNode.replaceChild(frag, textNode);
  }

  /* 扫描正文，链接化所有可解析的批注路径 */
  function scan() {
    var article = document.querySelector(".md-content__inner");
    if (!article) return;
    var chapters = buildHeadingTree(article);
    if (!chapters.length) return;

    var walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
    var textNodes = [];
    var n;
    while ((n = walker.nextNode())) {
      /* 跳过已链接的批注，避免重复处理产生嵌套链接 */
      if (n.parentElement && n.parentElement.closest("a.doc-path-link")) continue;
      textNodes.push(n);
    }
    textNodes.forEach(function (tn) { processTextNode(tn, chapters); });
  }

  function init() {
    if (document.documentElement.dataset.pathLinksInit) return;
    document.documentElement.dataset.pathLinksInit = "1";

    var flashTimer = null;

    /* 点击批注链接：平滑滚动到目标标题并高亮闪烁 */
    document.addEventListener("click", function (event) {
      if (!event.target || !event.target.closest) return;
      var link = event.target.closest("a.doc-path-link");
      if (!link) return;
      var target = document.getElementById(link.getAttribute("href").slice(1));
      if (!target) return;
      event.preventDefault();

      var header = document.querySelector(".md-header");
      var offset = (header ? header.offsetHeight : 0) + 12;
      var y = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: y, behavior: "smooth" });

      target.classList.remove("doc-path-flash");
      void target.offsetWidth; /* 重新触发闪烁动画 */
      target.classList.add("doc-path-flash");
      if (flashTimer) window.clearTimeout(flashTimer);
      flashTimer = window.setTimeout(function () {
        target.classList.remove("doc-path-flash");
      }, 2300);
    }, false);

    scan();

    /* Material instant navigation 切换页面后重新扫描 */
    if (typeof window.document$ !== "undefined") {
      window.document$.subscribe(scan);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
