#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Excel 转 JSON 转换脚本
功能：
  1. 读取 products.xlsx
  2. 自动按三级分类层级分组
  3. 生成 catalog.json
  4. 校验图片文件是否存在
  5. 数据清洗与错误提示

使用方法：
  python excel/convert.py

依赖：pandas, openpyxl
安装：pip install pandas openpyxl
"""

import os
import sys
import json
import hashlib

# 第三方库
try:
    import pandas as pd
except ImportError:
    print("错误：未安装 pandas，请运行 pip install pandas openpyxl")
    sys.exit(1)

try:
    import openpyxl  # noqa: F401
except ImportError:
    print("错误：未安装 openpyxl，请运行 pip install openpyxl")
    sys.exit(1)


# ==============================
# 路径配置
# ==============================
# 脚本所在目录
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# catalog 根目录
CATALOG_DIR = os.path.dirname(SCRIPT_DIR)
# Excel 文件路径
EXCEL_PATH = os.path.join(SCRIPT_DIR, 'products.xlsx')
# 图片目录
IMAGES_DIR = os.path.join(CATALOG_DIR, 'images')
# JSON 输出路径
JSON_PATH = os.path.join(CATALOG_DIR, 'data', 'catalog.json')

# 列名映射（Excel 列名 → 内部字段）
COLUMN_MAP = {
    '一级分类': 'level1',
    '二级分类': 'level2',
    '三级分类': 'level3',
    '产品名称': 'name',
    '图片文件名': 'image',
}


def generate_id(*parts):
    """根据分类名称生成稳定的分类ID"""
    raw = '-'.join(str(p).strip() for p in parts)
    h = hashlib.md5(raw.encode('utf-8')).hexdigest()[:8]
    return 'cat-' + h


def strip_name(name):
    """去除分类名称两端的空格"""
    if name is None:
        return ''
    return str(name).strip()


def load_excel():
    """读取 Excel 文件"""
    if not os.path.exists(EXCEL_PATH):
        print('错误：找不到 Excel 文件：' + EXCEL_PATH)
        print('请创建 excel/products.xlsx 文件并按格式填入数据。')
        sys.exit(1)

    df = pd.read_excel(EXCEL_PATH, dtype=str)
    # 去除列名两端空格
    df.columns = [c.strip() for c in df.columns]

    # 检查必需列
    required = list(COLUMN_MAP.keys())
    missing = [c for c in required if c not in df.columns]
    if missing:
        print('错误：Excel 缺少以下列：' + '、'.join(missing))
        print('必需列：' + '、'.join(required))
        sys.exit(1)

    # 重命名列
    df = df.rename(columns=COLUMN_MAP)
    return df


def validate_and_clean(df):
    """
    校验数据并清洗
    返回：(有效行列表, 跳过行汇总)
    """
    valid_rows = []
    skipped = []
    skipped_count = 0

    for idx, row in df.iterrows():
        line_num = idx + 2  # Excel 行号（第1行是表头）
        issues = []

        level1 = strip_name(row.get('level1', ''))
        level2 = strip_name(row.get('level2', ''))
        level3 = strip_name(row.get('level3', ''))
        name = strip_name(row.get('name', ''))
        image = strip_name(row.get('image', ''))

        # 检查一级分类
        if not level1:
            issues.append('一级分类为空')

        # 检查二级分类
        if not level2:
            issues.append('二级分类为空')

        # 检查三级分类（可选，如果为空则产品挂到二级分类下）
        has_level3 = bool(level3)

        # 检查产品名称
        if not name:
            issues.append('产品名称为空')

        # 检查图片文件名
        if not image:
            issues.append('图片文件名为空')

        # 检查分类名是否有多余空格（与原始值比较）
        original_level1 = str(row.get('level1', ''))
        if original_level1 != original_level1.strip():
            print('提示：第 %d 行 一级分类名有多余空格，已自动去除' % line_num)

        original_level2 = str(row.get('level2', ''))
        if original_level2 != original_level2.strip():
            print('提示：第 %d 行 二级分类名有多余空格，已自动去除' % line_num)

        original_level3 = str(row.get('level3', ''))
        if original_level3 and original_level3 != original_level3.strip():
            print('提示：第 %d 行 三级分类名有多余空格，已自动去除' % line_num)

        original_name = str(row.get('name', ''))
        if original_name and original_name != original_name.strip():
            print('提示：第 %d 行 产品名称有多余空格，已自动去除' % line_num)

        if issues:
            skipped_count += 1
            reason = '、'.join(issues)
            skipped.append('第 %d 行：%s' % (line_num, reason))
            print('跳过：第 %d 行 — %s' % (line_num, reason))
            continue

        # 图片路径
        image_path = 'images/' + image

        valid_rows.append({
            'level1': level1,
            'level2': level2,
            'level3': level3,
            'name': name,
            'image': image_path,
            'image_filename': image,
            'line_num': line_num,
        })

    return valid_rows, skipped, skipped_count


def check_images(valid_rows):
    """
    校验图片文件是否存在
    不中断生成，只提示
    """
    if not os.path.exists(IMAGES_DIR):
        print('警告：图片目录不存在：%s' % IMAGES_DIR)
        print('请创建 images/ 目录并放入产品图片。')
        return

    missing_count = 0
    existing_files = set(os.listdir(IMAGES_DIR))

    for row in valid_rows:
        filename = row['image_filename']
        if filename not in existing_files:
            missing_count += 1
            print('警告：第 %d 行 图片文件不存在：%s' % (row['line_num'], filename))

    if missing_count > 0:
        print('\n共 %d 张图片缺失，请将对应图片放入 images/ 目录。' % missing_count)
    else:
        print('图片校验通过，所有图片文件均存在。')


def build_catalog(valid_rows):
    """
    按三级分类层级组织数据
    返回 catalog 字典
    """
    # 使用有序结构
    level1_map = {}  # level1_name -> {id, name, children: level2_map}
    level1_order = []

    for row in valid_rows:
        l1_name = row['level1']
        l2_name = row['level2']
        l3_name = row['level3']

        # 一级分类
        if l1_name not in level1_map:
            l1_id = generate_id(l1_name)
            level1_map[l1_name] = {
                'id': l1_id,
                'name': l1_name,
                'children': {},
                'children_order': [],
            }
            level1_order.append(l1_name)

        l1_node = level1_map[l1_name]

        # 二级分类
        if l2_name not in l1_node['children']:
            l2_id = generate_id(l1_name, l2_name)
            l1_node['children'][l2_name] = {
                'id': l2_id,
                'name': l2_name,
                'children': {},
                'children_order': [],
            }
            l1_node['children_order'].append(l2_name)

        l2_node = l1_node['children'][l2_name]

        # 产品
        product = {
            'name': row['name'],
            'image': row['image'],
        }

        if l3_name:
            # 有三级分类
            if l3_name not in l2_node['children']:
                l3_id = generate_id(l1_name, l2_name, l3_name)
                l2_node['children'][l3_name] = {
                    'id': l3_id,
                    'name': l3_name,
                    'products': [],
                }
                l2_node['children_order'].append(l3_name)

            l2_node['children'][l3_name]['products'].append(product)
        else:
            # 没有三级分类，产品挂到二级分类下（降级方案）
            if 'products' not in l2_node:
                l2_node['products'] = []
            l2_node['products'].append(product)

    # 构建最终结构
    categories = []
    for l1_name in level1_order:
        l1_node = level1_map[l1_name]
        l1_children = []
        for l2_name in l1_node['children_order']:
            l2_node = l1_node['children'][l2_name]
            l2_children = []
            for l3_name in l2_node['children_order']:
                l3_node = l2_node['children'][l3_name]
                l2_children.append({
                    'id': l3_node['id'],
                    'name': l3_node['name'],
                    'products': l3_node.get('products', []),
                })

            l2_entry = {
                'id': l2_node['id'],
                'name': l2_node['name'],
            }
            # 如果有三级分类
            if l2_children:
                l2_entry['children'] = l2_children
            # 如果有直接挂在二级下的产品（降级）
            if 'products' in l2_node:
                l2_entry['products'] = l2_node['products']

            l1_children.append(l2_entry)

        l1_entry = {
            'id': l1_node['id'],
            'name': l1_node['name'],
            'children': l1_children,
        }
        categories.append(l1_entry)

    # 站点信息（读取现有 catalog.json 中的 site 配置，如存在）
    site_info = {
        'title': '广州博雅诺汽摩配件 - 产品目录',
        'subtitle': '专业摩托车配件供应商',
        'contact': {
            'phone': '138-0000-0000',
            'wechat': 'boyanuo-parts',
            'email': 'info@boyanuo.com'
        }
    }

    # 如果已有 catalog.json，尝试保留 site 配置
    if os.path.exists(JSON_PATH):
        try:
            with open(JSON_PATH, 'r', encoding='utf-8') as f:
                old_data = json.load(f)
            if 'site' in old_data:
                site_info = old_data['site']
        except Exception:
            pass

    catalog = {
        'site': site_info,
        'categories': categories,
    }

    return catalog


def main():
    print('=' * 50)
    print('产品目录数据转换工具')
    print('=' * 50)

    # 1. 读取 Excel
    print('\n[1/5] 读取 Excel 文件...')
    df = load_excel()
    print('  读取成功，共 %d 行数据' % len(df))

    # 2. 校验与清洗
    print('\n[2/5] 校验与清洗数据...')
    valid_rows, skipped, skipped_count = validate_and_clean(df)
    print('  有效行：%d' % len(valid_rows))
    print('  跳过行：%d' % skipped_count)
    if skipped:
        print('  跳过的行：')
        for s in skipped:
            print('    %s' % s)

    # 3. 校验图片
    print('\n[3/5] 校验图片文件...')
    check_images(valid_rows)

    # 4. 构建 JSON
    print('\n[4/5] 生成分类数据...')
    catalog = build_catalog(valid_rows)

    # 统计
    total_l1 = len(catalog['categories'])
    total_l2 = sum(len(c.get('children', [])) for c in catalog['categories'])
    total_l3 = 0
    total_products = 0
    for l1 in catalog['categories']:
        for l2 in l1.get('children', []):
            total_l3 += len(l2.get('children', []))
            # 三级分类下的产品
            for l3 in l2.get('children', []):
                total_products += len(l3.get('products', []))
            # 降级挂在二级下的产品
            total_products += len(l2.get('products', []))

    print('  一级分类：%d 个' % total_l1)
    print('  二级分类：%d 个' % total_l2)
    print('  三级分类：%d 个' % total_l3)
    print('  产品总数：%d 个' % total_products)

    # 5. 写入 JSON
    print('\n[5/5] 写入 JSON 文件...')
    # 确保 data 目录存在
    data_dir = os.path.dirname(JSON_PATH)
    os.makedirs(data_dir, exist_ok=True)

    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)

    print('  已写入：%s' % JSON_PATH)

    print('\n' + '=' * 50)
    print('转换完成！')
    print('=' * 50)
    print('\n下一步：')
    print('  1. 本地预览：在 catalog 目录下运行 python -m http.server 8000')
    print('  2. 浏览器打开：http://localhost:8000')
    print('  3. 部署到 GitHub Pages：将 catalog 目录推送到 GitHub 仓库')


if __name__ == '__main__':
    main()
