# 摩托车配件电子产品目录

这是一个轻量级的产品电子目录网站，专为摩托车配件供应商设计。客户通过微信收到链接后可以直接浏览产品，无需登录，打开速度快。

## 特点

- 纯 HTML/CSS/原生 JavaScript，无任何框架依赖
- 支持三级分类结构（一级 → 二级 → 三级 → 产品列表）
- 响应式设计，同时兼容手机和电脑
- 图片懒加载，分页加载，性能优秀
- 大图弹层查看，手机端滑动关闭
- 通过 Excel 维护产品数据，一键转换为 JSON
- 可直接部署到 GitHub Pages

---

## 目录结构

```
catalog/
├─ index.html              首页（一级分类展示）
├─ category.html           分类页（二级/三级分类列表）
├─ products.html           产品列表页
├─ css/
│  └─ style.css           所有样式
├─ js/
│  ├─ app.js              首页和分类页逻辑
│  ├─ products.js         产品列表页逻辑
│  └─ modal.js            大图弹层逻辑
├─ data/
│  └─ catalog.json        转换后的产品数据
├─ images/                 产品图片放这里
├─ excel/
│  ├─ products.xlsx        产品数据 Excel 文件
│  └─ convert.py          数据转换脚本
└─ README.md
```

---

## 1. 安装脚本依赖

转换脚本需要 Python 3 和以下库：

```bash
pip install pandas openpyxl
```

如果你还没有安装 Python，请前往 [python.org](https://www.python.org/downloads/) 下载安装。

---

## 2. 如何准备 Excel

打开 `excel/products.xlsx`，按以下列名填写数据：

| 一级分类 | 二级分类 | 三级分类 | 产品名称 | 图片文件名 |
|---------|---------|---------|---------|-----------|
| 摩托车配件 | 制动系统 | 刹车片 | 陶瓷刹车片前轮 | brake-pad-front-01.jpg |
| 摩托车配件 | 制动系统 | 刹车片 | 陶瓷刹车片后轮 | brake-pad-rear-01.jpg |
| 摩托车配件 | 制动系统 | 刹车盘 | 前刹车盘 | brake-disc-front-01.jpg |

### 注意事项

- **列名必须完全匹配**：一级分类、二级分类、三级分类、产品名称、图片文件名
- **三级分类可为空**：如果某产品没有三级分类，三级分类列留空，产品会直接挂到二级分类下（降级方案）
- **分类名和产品名称不要有多余空格**：脚本会自动去除两端空格，但建议在 Excel 中就注意
- **产品名称不能为空**：空的行会被跳过并提示
- **图片文件名不能为空**：空的行会被跳过并提示
- **图片文件名只是文件名**：不要写完整路径，只写文件名，如 `brake-pad-front-01.jpg`
- **一行一个产品**：每个产品占一行

---

## 3. 如何放置产品图片

将所有产品图片放在 `catalog/images/` 目录下。

图片文件名必须与 Excel 中"图片文件名"列的值完全一致（区分大小写）。

例如 Excel 中填写 `brake-pad-front-01.jpg`，则在 `images/` 目录下放置同名文件：

```
catalog/images/brake-pad-front-01.jpg
```

### 图片尺寸和格式推荐

| 项目 | 推荐 |
|-----|------|
| 缩略图尺寸 | 600×600 像素左右（正方形最佳） |
| 大图尺寸 | 1200×1200 像素左右 |
| 格式 | JPG（照片）或 PNG（透明背景） |
| 单张大小 | 不超过 500KB（建议） |
| 文件命名 | 英文+数字+连字符，如 `brake-pad-front-01.jpg` |

> 建议使用 [TinyPNG](https://tinypng.com/) 等工具压缩图片后再放入目录。

---

## 4. 如何运行转换脚本

在 `catalog` 目录下执行：

```bash
python excel/convert.py
```

脚本会：
1. 读取 `excel/products.xlsx`
2. 校验数据（去除空格、检查空值）
3. 校验图片文件是否存在
4. 生成 `data/catalog.json`

运行结束后会显示统计信息，包括有效行数、跳过行数、图片缺失数等。

---

## 5. 如何新增产品

1. 在 `excel/products.xlsx` 中添加新行，填写分类和产品信息
2. 将对应的产品图片放入 `catalog/images/` 目录
3. 运行 `python excel/convert.py` 重新生成数据
4. 刷新网页即可看到新产品

---

## 6. 如何新增分类

分类是通过 Excel 数据自动生成的，不需要单独操作。只要在 Excel 中填写新的分类名称，脚本会自动识别并创建对应层级。

### 新增一级分类

在 Excel 中"一级分类"列填入新名称即可，如"通用配件"。

### 新增二级分类

在已有的一级分类下，"二级分类"列填入新名称即可。

### 新增三级分类

在已有的二级分类下，"三级分类"列填入新名称即可。

运行 `python excel/convert.py` 后，新分类会自动出现在网页中。

---

## 7. 如何修改目录标题和联系方式

编辑 `excel/convert.py` 文件，找到 `site_info` 部分：

```python
site_info = {
    'title': '广州博雅诺汽摩配件 - 产品目录',
    'subtitle': '专业摩托车配件供应商',
    'contact': {
        'phone': '138-0000-0000',
        'wechat': 'boyanuo-parts',
        'email': 'info@boyanuo.com'
    }
}
```

修改后重新运行 `python excel/convert.py` 即可更新。

> 如果已经运行过一次，脚本会保留 `catalog.json` 中已有的站点信息。如需修改，请直接编辑 `data/catalog.json` 中的 `site` 部分，或先删除 `data/catalog.json` 再重新运行脚本。

---

## 8. 如何本地预览

**不要直接双击 index.html 打开**（原因见下方常见问题）。

在 `catalog` 目录下运行 Python 自带的 HTTP 服务器：

```bash
cd catalog
python -m http.server 8000
```

然后在浏览器中打开： http://localhost:8000

---

## 9. 如何部署到 GitHub Pages

### 步骤

1. 在 GitHub 上创建一个新仓库，如 `motorcycle-parts-catalog`
2. 将 `catalog` 目录下的所有文件上传到仓库根目录
3. 进入仓库的 Settings → Pages
4. 在 "Source" 下选择 "Deploy from a branch"
5. 选择分支 `main`，文件夹选 `/ (root)`
6. 点击 Save
7. 等待几分钟后，你的目录会上线到：
   `https://你的用户名.github.io/motorcycle-parts-catalog/`

### 如果目录结构在子文件夹

如果你的仓库根目录不是 `catalog`，而是仓库根目录下有 `catalog` 文件夹，则需要：
- Source 选择 main 分支
- 文件夹选 `/docs` 或自定义（GitHub Pages 默认只支持 root 和 docs）
- 或者直接将 `catalog` 目录内的文件放到仓库根目录

### 更新内容

修改 Excel 后，运行 `python excel/convert.py`，提交更新的 `data/catalog.json`，GitHub Pages 会自动更新。

---

## 10. 图片尺寸和格式推荐设置

| 使用场景 | 推荐尺寸 | 格式 | 最大大小 |
|---------|---------|------|---------|
| 产品缩略图 | 600×600 px | JPG | 200KB |
| 产品大图 | 1200×1200 px | JPG | 500KB |
| 分类图标 | 系统自带图标，无需图片 | - | - |

### 图片处理建议

- 保持所有产品图片比例一致（推荐 1:1 正方形）
- 如果原图不是正方形，建议裁切或用白色背景填充
- 使用 JPG 格式减少文件体积
- 文件名用英文和数字，避免中文和特殊字符
- 多张图片批量压缩后再放入目录

---

## 11. 常见问题

### 为什么双击 index.html 看不到数据？

网页使用 `fetch` 读取 `data/catalog.json`，这是一种 AJAX 请求。浏览器出于安全限制，`file://` 协议不允许 AJAX 请求本地文件。

**解决方法**：用 HTTP 服务器预览：

```bash
cd catalog
python -m http.server 8000
```

然后访问 `http://localhost:8000`。

### 运行 convert.py 提示找不到 pandas？

运行以下命令安装：

```bash
pip install pandas openpyxl
```

如果安装缓慢，可以使用国内镜像：

```bash
pip install pandas openpyxl -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### 图片显示不出来？

检查以下几点：
1. 图片文件是否在 `catalog/images/` 目录下
2. Excel 中的文件名是否与实际文件名完全一致（区分大小写）
3. 运行 `python excel/convert.py` 查看是否有图片缺失提示
4. 确认浏览器中没有报错（按 F12 打开开发者工具查看 Console）

### 手机上分类菜单溢出怎么办？

已做响应式处理。如果仍有问题，检查是否修改过 CSS，确保 viewport meta 标签存在。

### 如何修改每页显示的产品数量？

编辑 `js/products.js`，找到 `PAGE_SIZE = 20`，修改数字即可。

---

## 技术说明

- 纯 HTML/CSS/原生 JavaScript，不依赖任何框架
- 图片懒加载使用 IntersectionObserver
- 分页加载每页 20 条
- 大图弹层支持点击关闭、ESC 关闭、手机滑动关闭
- 所有页面通过 URL 参数传递分类信息
- 数据文件 catalog.json 按分类层级组织
