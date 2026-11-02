/* 集成目录（TOC）交互
 * - 目录面板锁定展开：点击「目录」标题不再切换显隐
 * - 手动折叠：点击条目左侧箭头区域折叠/展开子项，点击文字正常跳转锚点
 * - 已关闭 toc.follow，不再监听滚动/激活项变化，目录不跟随正文定位
 * - 兼容 Material instant navigation（document$.subscribe 重新初始化）
 */
(function () {
  "use strict";

  function initTocCollapse() {
    /* ---------- 1) 目录锁定展开 ---------- */
    var tocToggle = document.getElementById("__toc");
    if (tocToggle) tocToggle.checked = true;

    /* 拦截所有 label[for="__toc"] 的点击（「目录」标题 + 顶部文件标签）：
       集成的 TOC 往往有多个同类 label，用 querySelectorAll 全部处理。 */
    document.querySelectorAll('.md-sidebar label[for="__toc"]').forEach(function (label) {
      if (label.dataset.tocLocked) return;
      label.dataset.tocLocked = "1";
      label.addEventListener("click", function (e) {
        e.preventDefault();                        // 阻止 label 切 checkbox
        e.stopPropagation();
        if (tocToggle) tocToggle.checked = true;   // 强制保持展开
      });
    });

    var toc = document.querySelector(".md-sidebar .md-nav--secondary");
    if (!toc) return;

    /* ---------- 2) 手动折叠/展开子项 ---------- */
    toc.querySelectorAll(".md-nav__item").forEach(function (item) {
      if (item.dataset.tocCollapse) return;        /* 已初始化，跳过 */

      var subNav = Array.prototype.find.call(
        item.children,
        function (el) { return el.tagName === "NAV" && el.classList.contains("md-nav"); }
      );
      if (!subNav) return;

      item.dataset.tocCollapse = "1";
      item.classList.add("md-nav__item--nested");

      var link = Array.prototype.find.call(
        item.children,
        function (el) { return el.classList.contains("md-nav__link"); }
      );
      if (!link) return;

      link.addEventListener("click", function (event) {
        /* 相对 link 自身的横坐标：左侧 24px 为箭头折叠区 */
        var clickX = event.clientX - link.getBoundingClientRect().left;
        if (clickX <= 24) {
          event.preventDefault();
          event.stopPropagation();
          item.classList.toggle("md-nav__item--open");
        }
        /* 点击文字区域：不拦截，走原生锚点跳转 */
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTocCollapse);
  } else {
    initTocCollapse();
  }

  /* Material instant navigation 切换页面后重新初始化 */
  if (typeof window.document$ !== "undefined") {
    window.document$.subscribe(initTocCollapse);
  }
})();
