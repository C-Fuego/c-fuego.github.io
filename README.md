# c-fuego.github.io

个人日志。Hugo 静态站，推到 GitHub 后由 Actions 构建，发布到 GitHub Pages。

- 站点：`https://c-fuego.github.io/`
- 仓库：`https://github.com/C-Fuego/c-fuego.github.io`
- 视觉规范：`DESIGN.md`（深色工业风：`#0B0E0F` 底 / `#1A2126` 面板 / `#5FE3C0` 能量青唯一强调色）
- 内容规范：`SCHEMA.md`（单集合 posts，文件名即 slug）

## 结构

```
hugo.toml                     站点配置
content/posts/YYYY-MM-DD-slug.md   文章（文件名即 slug）
layouts/
  baseof.html                 外壳：装饰层 + 状态条 + main + 页脚
  index.html                  首屏 / 接缝带 / 关于 / 日志 / 项目
  _default/single.html        文章详情
  _default/list.html          LOG 页
  404.html
  partials/statusbar.html     固定状态条（站名 / 导航 / 时钟 / SYS.NOMINAL）
  partials/footer.html
static/css/tokens.css         设计令牌（色板、字体、间距、动效）
static/css/global.css         布局与组件
static/js/status.js           时钟 / UPTIME / 接缝带滚动
static/images/YYYY/MM/        图片
.github/workflows/pages.yml   构建并发布
bin/pub                       发布脚本
```

## 写文章

文件名 `YYYY-MM-DD-slug.md`：

```yaml
---
title: 标题
date: 2026-10-29
tags: [部署, hugo]
summary: 一句话摘要，选填
draft: false
---
```

正文从 `##` 开始，一级标题留给页面本身。图片放 `static/images/YYYY/MM/`，用标准 Markdown 引用。

## 发布

```bash
bin/pub "写了什么"
```

## 本地预览

```bash
hugo server --bind 127.0.0.1 --port 1313
```

## 规范要点（改样式前先读 DESIGN.md）

- 色值只允许 tokens.css 里那些，`global.css` 里不允许出现新的 `#hex`
- `border-radius` 恒为 0；不用 `box-shadow`；不用 `backdrop-filter`；不用渐变背景（接缝带斜纹除外）
- 断点只有 768px
- 动效 ≤ 200ms，`cubic-bezier(.2,0,0,1)`，reduced-motion 下全关
- 装饰（扫描线 / 网格 / 四角角标）只能放在唯一的 `.fx-layer` 里，`pointer-events: none`
- 强调青在单屏内不超过 3% 面积

## 已知偏离

`DESIGN.md` 要求数据面板显示 `LAT / LON / UPTIME / BUILD`。本站没有真实坐标可填，编造坐标违反"数字必须真实"，
因此改为 `BUILD / UPTIME / ENTRIES / TZ` 四项，全部是可验证的真实值。
