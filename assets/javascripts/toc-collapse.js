/* 右侧目录（TOC）点击折叠/展开
 * - 有下级标题的条目默认收起，点击标题文字折叠/展开
 * - 页面滚动时自动展开当前激活条目所在的层级
 */
(function () {
  "use strict";

  function initTocCollapse() {
    var toc = document.querySelector(".md-sidebar--secondary");
    if (!toc) return;

    /* 给含下级标题的条目加上折叠类与点击事件 */
    toc.querySelectorAll(".md-nav__item").forEach(function (item) {
      if (item.dataset.tocCollapse) return; /* 已初始化，跳过 */

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
      if (link) {
        link.addEventListener("click", function (event) {
          event.preventDefault();
          event.stopPropagation();
          item.classList.toggle("md-nav__item--open");
        });
      }
    });

    /* 监听高亮项变化（toc.follow 滚动联动），自动展开其所在层级 */
    if (toc.dataset.tocObserved) return;
    toc.dataset.tocObserved = "1";

    var observer = new MutationObserver(function (mutations) {
      var activeChanged = mutations.some(function (mutation) {
        return mutation.type === "attributes" &&
          mutation.attributeName === "class" &&
          mutation.target.classList.contains("md-nav__link--active");
      });
      if (!activeChanged) return;

      var active = toc.querySelector(".md-nav__link--active");
      var li = active ? active.closest("li") : null;
      while (li) {
        li.classList.add("md-nav__item--open");
        li = li.parentElement ? li.parentElement.closest("li") : null;
      }
    });
    observer.observe(toc, { attributes: true, attributeFilter: ["class"], subtree: true });
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
