/**
 * products.js - 产品列表页逻辑
 * 负责：
 *   1. 读取三级分类下的产品
 *   2. 渲染产品网格（图片 + 名称）
 *   3. 分页加载（每页20条）
 *   4. 图片懒加载
 *   5. 面包屑导航
 *   6. 同级分类切换
 *   7. 点击产品弹出大图（调用 modal.js）
 */

// 分页相关
var PAGE_SIZE = 20;
var currentPage = 1;
var currentProducts = [];
var currentLevel1 = null;
var currentLevel2 = null;
var currentLevel3 = null;

/**
 * 获取 URL 查询参数
 */
function getUrlParams() {
  var params = {};
  var search = window.location.search.substring(1);
  if (!search) return params;
  var pairs = search.split('&');
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i].split('=');
    var key = decodeURIComponent(pair[0]);
    var val = pair[1] ? decodeURIComponent(pair[1]) : '';
    params[key] = val;
  }
  return params;
}

/**
 * HTML 转义
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 加载 JSON 数据
 */
function loadData() {
  return fetch('data/catalog.json')
    .then(function (res) {
      if (!res.ok) throw new Error('加载失败：HTTP ' + res.status);
      return res.json();
    });
}

/**
 * 根据分类名称查找节点
 */
function findCategoryByName(categories, name) {
  if (!name || !categories) return null;
  for (var i = 0; i < categories.length; i++) {
    if (categories[i].name === name) return categories[i];
  }
  return null;
}

/**
 * 填充站点信息
 */
function applySiteInfo(data) {
  if (!data.site) return;
  var titleEl = document.getElementById('siteTitle');
  var subEl = document.getElementById('siteSubtitle');
  var contactEl = document.getElementById('contactInfo');
  if (data.site.title && titleEl) titleEl.textContent = data.site.title;
  if (data.site.subtitle && subEl) subEl.textContent = data.site.subtitle;
  if (data.site.contact && contactEl) {
    var c = data.site.contact;
    var parts = [];
    if (c.phone) parts.push('电话：' + c.phone);
    if (c.wechat) parts.push('微信：' + c.wechat);
    if (c.email) parts.push('邮箱：' + c.email);
    contactEl.textContent = parts.join(' | ');
  }
}

/**
 * 构建面包屑
 */
function renderBreadcrumb(crums) {
  var nav = document.getElementById('breadcrumb');
  if (!nav) return;
  var html = '';
  for (var i = 0; i < crums.length; i++) {
    if (i > 0) html += '<span class="separator">›</span>';
    if (crums[i].url) {
      html += '<a href="' + escapeHtml(crums[i].url) + '">' + escapeHtml(crums[i].name) + '</a>';
    } else {
      html += '<span>' + escapeHtml(crums[i].name) + '</span>';
    }
  }
  nav.innerHTML = html;
}

/**
 * 渲染同级分类切换
 */
function renderSiblingNav(siblings, currentName, urlBuilder) {
  var nav = document.getElementById('siblingNav');
  if (!nav || !siblings || siblings.length <= 1) return;
  var html = '';
  for (var i = 0; i < siblings.length; i++) {
    var s = siblings[i];
    var cls = s.name === currentName ? 'sibling-link active' : 'sibling-link';
    html += '<a class="' + cls + '" href="' + escapeHtml(urlBuilder(s)) + '">'
      + escapeHtml(s.name) + '</a>';
  }
  nav.innerHTML = html;
}

/**
 * 渲染一页产品
 */
function renderProductPage(products, page) {
  var grid = document.getElementById('productGrid');
  if (!grid) return;

  var start = (page - 1) * PAGE_SIZE;
  var end = start + PAGE_SIZE;
  var pageItems = products.slice(start, end);

  var html = '';
  for (var i = 0; i < pageItems.length; i++) {
    var product = pageItems[i];
    var imgSrc = escapeHtml(product.image);
    var name = escapeHtml(product.name);
    var idx = start + i;

    html += '<div class="product-item" data-image="' + imgSrc + '" data-name="' + name + '">'
      + '<div class="product-image-wrap">'
      + '<div class="product-image-placeholder" style="display:none;">📦</div>'
      + '<img class="lazy" data-src="' + imgSrc + '" alt="' + name + '">'
      + '</div>'
      + '<div class="product-name">' + name + '</div>'
      + '</div>';
  }

  // 如果是第一页，直接替换内容；否则追加
  if (page === 1) {
    grid.innerHTML = html;
  } else {
    grid.insertAdjacentHTML('beforeend', html);
  }

  // 绑定点击事件
  bindProductClicks();

  // 绑定图片加载失败事件
  bindImageErrorHandlers();

  // 懒加载当前页图片
  lazyLoadImages();
}

/**
 * 绑定产品点击事件（弹出大图）
 */
function bindProductClicks() {
  var items = document.querySelectorAll('.product-item');
  for (var i = 0; i < items.length; i++) {
    // 避免重复绑定，用标记
    if (items[i].getAttribute('data-bound') === 'true') continue;
    items[i].setAttribute('data-bound', 'true');
    items[i].addEventListener('click', function () {
      var img = this.querySelector('img');
      var imgSrc = this.getAttribute('data-image');
      var name = this.getAttribute('data-name');
      // 如果图片加载失败，用占位符图标
      var placeholder = this.querySelector('.product-image-placeholder');
      if (placeholder && placeholder.style.display !== 'none') {
        imgSrc = '';
      }
      if (typeof openModal === 'function') {
        openModal(imgSrc, name);
      }
    });
  }
}

/**
 * 绑定图片加载失败事件
 * 图片加载失败时显示占位符
 */
function bindImageErrorHandlers() {
  var images = document.querySelectorAll('.product-image-wrap img.lazy');
  for (var i = 0; i < images.length; i++) {
    if (images[i].getAttribute('data-error-bound') === 'true') continue;
    images[i].setAttribute('data-error-bound', 'true');
    images[i].addEventListener('error', function () {
      this.style.display = 'none';
      var placeholder = this.parentElement.querySelector('.product-image-placeholder');
      if (placeholder) {
        placeholder.style.display = 'flex';
      }
    });
  }
}

/**
 * 图片懒加载 - 使用 IntersectionObserver
 */
function lazyLoadImages() {
  var lazyImages = document.querySelectorAll('img.lazy[data-src]');
  if (!lazyImages.length) return;

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          var img = entries[i].target;
          var src = img.getAttribute('data-src');
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            img.classList.remove('lazy');
          }
          observer.unobserve(img);
        }
      }
    }, {
      rootMargin: '100px 0px',
      threshold: 0.01
    });

    for (var i = 0; i < lazyImages.length; i++) {
      var img = lazyImages[i];
      if (img.getAttribute('data-src')) {
        observer.observe(img);
      }
    }
  } else {
    // 不支持 IntersectionObserver 的浏览器，直接加载所有图片
    for (var j = 0; j < lazyImages.length; j++) {
      var img2 = lazyImages[j];
      var src2 = img2.getAttribute('data-src');
      if (src2) {
        img2.src = src2;
        img2.removeAttribute('data-src');
        img2.classList.remove('lazy');
      }
    }
  }
}

/**
 * 更新加载更多按钮
 */
function updateLoadMoreButton() {
  var wrap = document.getElementById('loadMoreWrap');
  var btn = document.getElementById('loadMoreBtn');
  if (!wrap || !btn) return;

  var totalPages = Math.ceil(currentProducts.length / PAGE_SIZE);
  if (currentPage >= totalPages) {
    wrap.style.display = 'none';
  } else {
    wrap.style.display = 'block';
    var remaining = currentProducts.length - currentPage * PAGE_SIZE;
    btn.textContent = '加载更多（剩余 ' + remaining + ' 个）';
  }
}

/* ========================================
   页面初始化
   ======================================== */

document.addEventListener('DOMContentLoaded', function () {
  var params = getUrlParams();

  loadData()
    .then(function (data) {
      applySiteInfo(data);

      // 检查必要参数
      if (!params.level1) {
        var grid = document.getElementById('productGrid');
        grid.innerHTML = '<div class="empty-hint">缺少分类参数，请从首页进入。</div>';
        return;
      }

      // 查找一级分类
      var level1Cat = findCategoryByName(data.categories, params.level1);
      if (!level1Cat) {
        var grid2 = document.getElementById('productGrid');
        grid2.innerHTML = '<div class="empty-hint">未找到分类：' + escapeHtml(params.level1) + '</div>';
        return;
      }

      // 如果没有 level2 参数
      if (!params.level2) {
        var grid3 = document.getElementById('productGrid');
        grid3.innerHTML = '<div class="empty-hint">请选择具体分类。</div>';
        renderBreadcrumb([{ name: '首页', url: 'index.html' }, { name: level1Cat.name }]);
        return;
      }

      // 查找二级分类
      var level2Cat = findCategoryByName(level1Cat.children, params.level2);
      if (!level2Cat) {
        var grid4 = document.getElementById('productGrid');
        grid4.innerHTML = '<div class="empty-hint">未找到分类：' + escapeHtml(params.level2) + '</div>';
        renderBreadcrumb([
          { name: '首页', url: 'index.html' },
          { name: level1Cat.name, url: 'category.html?level1=' + encodeURIComponent(level1Cat.name) }
        ]);
        return;
      }

      // 设置标题
      var titleEl = document.getElementById('pageTitle');

      // 面包屑
      var breadcrumbCrumbs = [
        { name: '首页', url: 'index.html' },
        { name: level1Cat.name, url: 'category.html?level1=' + encodeURIComponent(level1Cat.name) },
        { name: level2Cat.name, url: 'category.html?level1=' + encodeURIComponent(level1Cat.name) + '&level2=' + encodeURIComponent(level2Cat.name) }
      ];

      // 获取产品列表
      var products = [];
      var siblings = [];

      if (params.level3) {
        // 有三级分类，查找三级节点
        var level3Cat = findCategoryByName(level2Cat.children, params.level3);
        if (!level3Cat) {
          var grid5 = document.getElementById('productGrid');
          grid5.innerHTML = '<div class="empty-hint">未找到分类：' + escapeHtml(params.level3) + '</div>';
          renderBreadcrumb(breadcrumbCrumbs.concat([{ name: params.level3 }]));
          return;
        }

        products = level3Cat.products || [];
        siblings = level2Cat.children || [];
        currentLevel3 = level3Cat;
        if (titleEl) titleEl.textContent = level3Cat.name;

        // 完整面包屑
        breadcrumbCrumbs.push({ name: level3Cat.name });

        // 同级三级分类切换
        renderSiblingNav(siblings, level3Cat.name, function (s) {
          return 'products.html?level1=' + encodeURIComponent(level1Cat.name)
            + '&level2=' + encodeURIComponent(level2Cat.name)
            + '&level3=' + encodeURIComponent(s.name);
        });
      } else {
        // 没有三级分类，降级：直接显示二级分类下的所有产品
        // 如果二级分类有 children，则汇总所有三级分类下的产品
        if (level2Cat.children && level2Cat.children.length > 0) {
          for (var i = 0; i < level2Cat.children.length; i++) {
            var childProducts = level2Cat.children[i].products || [];
            for (var j = 0; j < childProducts.length; j++) {
              products.push(childProducts[j]);
            }
          }
          siblings = level2Cat.children;
        } else {
          // 二级分类直接挂产品
          products = level2Cat.products || [];
        }
        if (titleEl) titleEl.textContent = level2Cat.name;

        // 面包屑
        renderBreadcrumb(breadcrumbCrumbs);

        // 同级二级分类切换
        renderSiblingNav(level1Cat.children, level2Cat.name, function (s) {
          return 'products.html?level1=' + encodeURIComponent(level1Cat.name)
            + '&level2=' + encodeURIComponent(s.name);
        });
      }

      // 渲染面包屑
      renderBreadcrumb(breadcrumbCrumbs);

      // 保存全局状态
      currentProducts = products;
      currentPage = 1;
      currentLevel1 = level1Cat;
      currentLevel2 = level2Cat;

      // 渲染产品
      var grid = document.getElementById('productGrid');
      if (products.length === 0) {
        grid.innerHTML = '<div class="empty-hint">该分类下暂无产品</div>';
        document.getElementById('loadMoreWrap').style.display = 'none';
      } else {
        renderProductPage(products, 1);
        updateLoadMoreButton();
      }
    })
    .catch(function (err) {
      console.error('加载失败:', err);
      var grid = document.getElementById('productGrid');
      if (grid) {
        grid.innerHTML = '<div class="empty-hint">数据加载失败，请确保通过 HTTP 服务访问页面。</div>';
      }
    });

  // 加载更多按钮
  var loadBtn = document.getElementById('loadMoreBtn');
  if (loadBtn) {
    loadBtn.addEventListener('click', function () {
      currentPage++;
      renderProductPage(currentProducts, currentPage);
      updateLoadMoreButton();
    });
  }
});
