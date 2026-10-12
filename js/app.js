/**
 * app.js - 首页和分类页逻辑
 * 负责：
 *   1. 加载 catalog.json 数据
 *   2. 首页渲染一级分类
 *   3. 分类页渲染二级或三级分类
 *   4. 面包屑导航
 *   5. 同级分类快速切换
 */

// 全局数据缓存
var catalogData = null;

/**
 * 获取 URL 查询参数
 * @returns {Object} 参数对象
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
 * 对字符串进行简单编码，防止 XSS
 * @param {string} str
 * @returns {string}
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
 * @returns {Promise<Object>}
 */
function loadData() {
  if (catalogData) return Promise.resolve(catalogData);
  return fetch('data/catalog.json')
    .then(function (res) {
      if (!res.ok) throw new Error('加载失败：HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      catalogData = data;
      return data;
    });
}

/**
 * 填充站点标题和联系方式
 * @param {Object} data
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
  document.title = (data.site.title || '产品目录') + ' - 产品目录';
}

/**
 * 构建分类图标（用通用图标，无实际图片依赖）
 * @param {string} name 分类名称
 * @returns {string} 图标 emoji
 */
function getCategoryIcon(name) {
  var iconMap = {
    '摩托车配件': '🏍️',
    '制动系统': '🛑',
    '传动系统': '⚙️',
    '灯具电气': '💡',
    '悬挂系统': '🔧'
  };
  if (iconMap[name]) return iconMap[name];
  return '📦';
}

/**
 * 统计分类下产品总数
 * @param {Object} category 分类节点
 * @returns {number}
 */
function countProducts(category) {
  if (category.products && category.products.length > 0) {
    return category.products.length;
  }
  var total = 0;
  if (category.children) {
    for (var i = 0; i < category.children.length; i++) {
      total += countProducts(category.children[i]);
    }
  }
  return total;
}

/**
 * 构建面包屑导航
 * @param {Array} crumbs 面包屑数组 [{name, url}, ...]
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
 * 渲染同级分类切换链接
 * @param {Array} siblings 同级分类数组
 * @param {string} currentId 当前分类ID
 * @param {Function} urlBuilder 构建链接URL的函数
 */
function renderSiblingNav(siblings, currentId, urlBuilder) {
  var nav = document.getElementById('siblingNav');
  if (!nav || !siblings || siblings.length <= 1) return;
  var html = '';
  for (var i = 0; i < siblings.length; i++) {
    var s = siblings[i];
    var cls = s.id === currentId ? 'sibling-link active' : 'sibling-link';
    html += '<a class="' + cls + '" href="' + escapeHtml(urlBuilder(s)) + '">'
      + escapeHtml(s.name) + '</a>';
  }
  nav.innerHTML = html;
}

/* ========================================
   首页逻辑
   ======================================== */

/**
 * 渲染首页一级分类
 * @param {Object} data 完整数据
 */
function renderHomePage(data) {
  var grid = document.getElementById('categoryGrid');
  if (!grid) return;
  var cats = data.categories || [];
  if (cats.length === 0) {
    grid.innerHTML = '<div class="empty-hint">暂无分类数据</div>';
    return;
  }
  var html = '';
  for (var i = 0; i < cats.length; i++) {
    var cat = cats[i];
    var count = countProducts(cat);
    var url = 'category.html?level1=' + encodeURIComponent(cat.name);
    html += '<div class="category-card" onclick="window.location.href=\'' + url + '\'">'
      + '<div class="cat-icon">' + getCategoryIcon(cat.name) + '</div>'
      + '<div class="cat-name">' + escapeHtml(cat.name) + '</div>'
      + '<div class="cat-count">' + count + ' 个产品</div>'
      + '</div>';
  }
  grid.innerHTML = html;
}

/* ========================================
   分类页逻辑（category.html）
   ======================================== */

/**
 * 根据分类名称查找分类节点
 * @param {Array} categories 分类数组
 * @param {string} name 分类名称
 * @returns {Object|null}
 */
function findCategoryByName(categories, name) {
  if (!name || !categories) return null;
  for (var i = 0; i < categories.length; i++) {
    if (categories[i].name === name) return categories[i];
  }
  return null;
}

/**
 * 渲染二级分类列表页
 * 当只有 level1 参数时，显示该一级分类下的所有二级分类
 * @param {Object} data 完整数据
 * @param {Object} params URL参数
 */
function renderCategoryPage(data, params) {
  var grid = document.getElementById('categoryGrid');
  var titleEl = document.getElementById('pageTitle');
  if (!grid) return;

  // 查找一级分类
  var level1Cat = findCategoryByName(data.categories, params.level1);
  if (!level1Cat) {
    grid.innerHTML = '<div class="empty-hint">未找到分类：' + escapeHtml(params.level1 || '') + '</div>';
    renderBreadcrumb([{ name: '首页', url: 'index.html' }, { name: params.level1 || '未知分类' }]);
    return;
  }

  // 如果同时有 level2 参数，则显示该二级分类下的三级分类
  if (params.level2) {
    var level2Cat = findCategoryByName(level1Cat.children, params.level2);
    if (!level2Cat) {
      grid.innerHTML = '<div class="empty-hint">未找到分类：' + escapeHtml(params.level2) + '</div>';
      renderBreadcrumb([
        { name: '首页', url: 'index.html' },
        { name: level1Cat.name, url: 'category.html?level1=' + encodeURIComponent(level1Cat.name) },
        { name: params.level2 }
      ]);
      return;
    }
    renderLevel3List(data, level1Cat, level2Cat);
  } else {
    renderLevel2List(data, level1Cat);
  }
}

/**
 * 渲染二级分类列表
 * @param {Object} data 完整数据
 * @param {Object} level1Cat 一级分类节点
 */
function renderLevel2List(data, level1Cat) {
  var grid = document.getElementById('categoryGrid');
  var titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = level1Cat.name;

  // 面包屑
  renderBreadcrumb([
    { name: '首页', url: 'index.html' },
    { name: level1Cat.name }
  ]);

  // 同级一级分类切换
  renderSiblingNav(data.categories, level1Cat.id, function (s) {
    return 'category.html?level1=' + encodeURIComponent(s.name);
  });

  var children = level1Cat.children || [];
  if (children.length === 0) {
    grid.innerHTML = '<div class="empty-hint">该分类下暂无子分类</div>';
    return;
  }

  var html = '';
  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    var count = countProducts(child);
    // 如果二级分类有三级子分类，进入三级列表；否则直接进入产品列表
    var hasLevel3 = child.children && child.children.length > 0;
    var url;
    if (hasLevel3) {
      url = 'category.html?level1=' + encodeURIComponent(level1Cat.name)
        + '&level2=' + encodeURIComponent(child.name);
    } else {
      // 没有三级分类，直接到产品页（降级方案）
      url = 'products.html?level1=' + encodeURIComponent(level1Cat.name)
        + '&level2=' + encodeURIComponent(child.name);
    }
    html += '<div class="category-card" onclick="window.location.href=\'' + url + '\'">'
      + '<div class="cat-icon">' + getCategoryIcon(child.name) + '</div>'
      + '<div class="cat-name">' + escapeHtml(child.name) + '</div>'
      + '<div class="cat-count">' + count + ' 个产品</div>'
      + '</div>';
  }
  grid.innerHTML = html;
}

/**
 * 渲染三级分类列表
 * @param {Object} data 完整数据
 * @param {Object} level1Cat 一级分类节点
 * @param {Object} level2Cat 二级分类节点
 */
function renderLevel3List(data, level1Cat, level2Cat) {
  var grid = document.getElementById('categoryGrid');
  var titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = level2Cat.name;

  // 面包屑
  renderBreadcrumb([
    { name: '首页', url: 'index.html' },
    { name: level1Cat.name, url: 'category.html?level1=' + encodeURIComponent(level1Cat.name) },
    { name: level2Cat.name }
  ]);

  // 同级二级分类切换
  renderSiblingNav(level1Cat.children, level2Cat.id, function (s) {
    return 'category.html?level1=' + encodeURIComponent(level1Cat.name)
      + '&level2=' + encodeURIComponent(s.name);
  });

  var children = level2Cat.children || [];
  if (children.length === 0) {
    // 没有三级分类，显示提示并直接链接到产品页
    grid.innerHTML = '<div class="empty-hint">该分类下暂无三级分类</div>';
    return;
  }

  var html = '';
  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    var count = countProducts(child);
    var url = 'products.html?level1=' + encodeURIComponent(level1Cat.name)
      + '&level2=' + encodeURIComponent(level2Cat.name)
      + '&level3=' + encodeURIComponent(child.name);
    html += '<div class="category-card" onclick="window.location.href=\'' + url + '\'">'
      + '<div class="cat-icon">' + getCategoryIcon(child.name) + '</div>'
      + '<div class="cat-name">' + escapeHtml(child.name) + '</div>'
      + '<div class="cat-count">' + count + ' 个产品</div>'
      + '</div>';
  }
  grid.innerHTML = html;
}

/* ========================================
   页面初始化
   ======================================== */

document.addEventListener('DOMContentLoaded', function () {
  var params = getUrlParams();

  // 判断当前页面类型
  var path = window.location.pathname.toLowerCase();
  var pageType = 'index';
  if (path.indexOf('category.html') >= 0) pageType = 'category';
  if (path.indexOf('products.html') >= 0) pageType = 'products';

  loadData()
    .then(function (data) {
      applySiteInfo(data);

      if (pageType === 'index') {
        renderHomePage(data);
      } else if (pageType === 'category') {
        renderCategoryPage(data, params);
      }
      // products.html 由 products.js 处理
    })
    .catch(function (err) {
      console.error('加载失败:', err);
      var grid = document.getElementById('categoryGrid');
      if (grid) {
        grid.innerHTML = '<div class="empty-hint">数据加载失败，请确保通过 HTTP 服务访问页面。</div>';
      }
    });
});
