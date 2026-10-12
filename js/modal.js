/**
 * modal.js - 大图弹层逻辑
 * 功能：
 *   1. 点击产品弹出大图
 *   2. 点击空白区域关闭
 *   3. 手机端支持滑动关闭
 *   4. ESC 键关闭
 *   5. 大图下方显示产品名称
 */

/**
 * 打开大图弹层
 * @param {string} imageSrc 图片路径
 * @param {string} name 产品名称
 */
function openModal(imageSrc, name) {
  var overlay = document.getElementById('modalOverlay');
  var img = document.getElementById('modalImage');
  var nameEl = document.getElementById('modalName');
  if (!overlay || !img) return;

  // 设置图片
  if (imageSrc) {
    img.src = imageSrc;
    img.alt = name || '';
    img.style.display = '';
  } else {
    // 没有图片时显示占位
    img.style.display = 'none';
  }

  // 设置名称
  if (nameEl) {
    nameEl.textContent = name || '';
  }

  // 显示弹层
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/**
 * 关闭大图弹层
 */
function closeModal() {
  var overlay = document.getElementById('modalOverlay');
  var img = document.getElementById('modalImage');
  if (!overlay) return;

  overlay.classList.remove('active');
  document.body.style.overflow = '';

  // 延迟清除图片，避免关闭动画闪烁
  setTimeout(function () {
    if (img) {
      img.src = '';
    }
  }, 200);
}

/**
 * 初始化弹层事件
 */
function initModal() {
  var overlay = document.getElementById('modalOverlay');
  var closeBtn = document.getElementById('modalClose');
  if (!overlay) return;

  // 点击关闭按钮
  if (closeBtn) {
    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      closeModal();
    });
  }

  // 点击空白区域关闭
  overlay.addEventListener('click', function (e) {
    // 只有点击 overlay 本身（而非内部图片）才关闭
    if (e.target === overlay) {
      closeModal();
    }
  });

  // 点击弹层内容区域外的区域也关闭
  var content = overlay.querySelector('.modal-content');
  if (content) {
    content.addEventListener('click', function (e) {
      // 点击图片或名称不关闭，点击 content 空白区域关闭
      if (e.target === content) {
        closeModal();
      }
    });
  }

  // ESC 键关闭
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.keyCode === 27) {
      if (overlay.classList.contains('active')) {
        closeModal();
      }
    }
  });

  // 手机端滑动关闭
  var touchStartY = 0;
  var touchCurrentY = 0;

  overlay.addEventListener('touchstart', function (e) {
    if (!overlay.classList.contains('active')) return;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  overlay.addEventListener('touchmove', function (e) {
    if (!overlay.classList.contains('active')) return;
    touchCurrentY = e.touches[0].clientY;
    var diff = touchCurrentY - touchStartY;
    // 向下滑动超过 80px 关闭
    if (diff > 80 && touchStartY < window.innerHeight * 0.3) {
      closeModal();
      touchStartY = 0;
    }
  }, { passive: true });
}

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', function () {
  initModal();
});
