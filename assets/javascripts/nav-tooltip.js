/**
 * 侧边导航条目 tooltip 补充
 * 为 .md-nav__link 自动注入原生 title 属性，使鼠标悬浮时弹出完整标题
 * （mkdocs 默认不会自动给 nav link 加 title）
 */
document.addEventListener('DOMContentLoaded', function () {
  var links = document.querySelectorAll('.md-nav__link');
  links.forEach(function (link) {
    if (!link.hasAttribute('title')) {
      // 取可见文本（span 内的实际标题，忽略 ::before/::after 伪元素）
      var text = (link.textContent || '').trim();
      if (text) {
        link.setAttribute('title', text);
      }
    }
  });
});
