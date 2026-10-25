# blog

个人博客源码。Hugo 静态站，构建产物同步到 Orange Pi，由板上的 Caddy 托管，
公网入口 `https://www.ignacio.dpdns.org/`（Cloudflare Tunnel，板子主动拨出）。

## 结构

```
hugo.toml              站点配置（标题、世界观名、菜单、taxonomy）
content/
  _index.md            首页导语（渲染进 hero 正文）
  about.md             身份档案（带 id-card 表格）
  posts/_index.md      ARCHIVE 列表页导语
  posts/NNNN-*.md      文章，文件名前缀就是条目序号
layouts/
  baseof.html          外壳：canvas + 扫描线 + 顶栏 + 页脚
  index.html           首页：hero / 统计面板 / 最新条目 / 档案摘要
  _default/list.html   列表页（ARCHIVE、标签）
  _default/single.html 文章页（正文 + 右侧 sticky 目录）
  _default/terms.html  标签总览
  404.html             404 页
  partials/            head / nav / foot / row
static/
  css/main.css         全部样式（约 1000 行，无框架）
  js/binary.js         二进制雨 canvas + 时钟 + 载入 glitch
  fonts/               Saira / Saira Condensed（latin 子集，各 ~14KB）
  favicon.svg
deploy/Caddyfile       板上 Caddy 配置源（改这里，别改板上的）
bin/deploy.sh          构建 + rsync + 可选推 Caddyfile
```

## 视觉系统

Phigros 语汇 + 二进制世界，四条硬规则：

1. 纯黑底 `#000`，面板 `#08080A`，不出现渐变背景
2. 只用直角与斜切，零圆角；菱形是 note，三角形是层级标记
3. 文字走窄体大写 + 大字距（Saira Condensed），中文用系统黑体栈
4. 强调色只有两个：`--data #35E0FF`（数据/青）、`--hit #FFD35C`（判定/金）

判定线出现在 hero 和文章页头，`judge-note` 会沿线的位置漂移。

字体说明：Phigros 中文界面是思源黑体，英文 HUD 是 Saira 系（社区重制版称
"Saira Hybrid"）。这里自托管 Saira/Saira Condensed 的 latin 子集，中文走系统栈
（Noto Sans SC / 思源黑体 / 苹方 / 微软雅黑），避免搬 5MB 的 CJK 字体上板子。

## 已实现的功能

写文/阅读侧：

- 站内搜索：`/index.json` 全站索引（标题+摘要+正文），顶栏按钮或按 `/` 打开，纯前端匹配，无依赖
- 阅读进度：文章页顶部一条判定线形态的进度条，菱形 note 跟着走
- 目录跟随：右侧 TOC 用 IntersectionObserver 高亮当前章节
- 代码块：Chroma 高亮（`static/css/chroma.css`，四色对齐全站），hover 出现 COPY 按钮
- 图片：自动包 `figure` + 图注，点击开灯箱，ESC 关闭
- 标题锚点：hover 出现 `#`，可复制小节链接
- 外链：自动加 `↗` 标记和 `rel="noopener noreferrer"`
- 相关文章：按共享标签取最多 4 篇
- 分页：每页 12 条，序号用文件名前缀（永久编号，不回收）

站点侧：

- 首页：hero + 统计面板（条目数/字数/最后同步/信号）+ 最新 6 条 + 标签矩阵 + 档案摘要
- 标签页：`/tags/` 总览 + 单标签页显示 `TAG` 标记和条目数
- 404：自定义页，带回程入口
- SEO：canonical / OG / Twitter Card / JSON-LD（BlogPosting）/ sitemap / RSS / robots
- 可访问性：跳到正文链接、focus-visible 描边、`prefers-reduced-motion` 全量降级
- 打印：白底黑字，隐藏所有装饰层
- 页面过渡：View Transitions API（不支持的浏览器自动忽略）

## 部署前检查

`bin/deploy.sh` 第 2 步会扫一遍 `public/` 里所有内部链接，URL 解码后按
`文件 / 目录index.html / .html` 三种形式匹配，有死链会列出来但不阻断部署
（`--dry` 只跑构建和检查）。

## 写文章

```bash
cd ~/Projects/blog
hugo new content posts/0002-标题.md
# 或者直接复制一篇改 front matter
```

front matter 必填 `title` / `date`，可选 `tags` / `summary`：

```yaml
---
title: "标题"
date: 2026-10-26T12:00:00+08:00
tags: ["标签"]
summary: "列表页显示的一句话"
---
```

序号规则：文件名前缀 `0001-`、`0002-`…，删掉的号不回收。

## 发布

```bash
bin/deploy.sh            # 构建 + 同步（只改内容时用这个）
bin/deploy.sh --caddy    # 顺带推送 deploy/Caddyfile 并 reload caddy
bin/deploy.sh --dry      # 只看要同步什么
```

本地预览：

```bash
hugo server --bind 127.0.0.1 --port 1313
```

## 板上事实

```
站点根目录   /var/www/blog        属主 orangepi，755，Caddy 以 caddy 用户读取
Caddy 配置   /etc/caddy/Caddyfile  源在 deploy/Caddyfile
监听         :8080                唯一入口，裸域 301 到 www
日志         /var/log/caddy/access.log（5MiB 轮转，留 2 份）
```

裸域 301 由板上 Caddy 和 Cloudflare Redirect Rule 双保险，两边都做了。

## 待办 / 可选项

- Cloudflare 对 HTML 是 `cf-cache-status: DYNAMIC`，首字节 1–2.7s。
  要更快可在 CF 加 Cache Rule（Cache Everything + Edge TTL），纯静态站可安全缓存。
- `hugo.toml` 里 `worldName = "0x00"` 是占位，改这里 + `content/_index.md` 即可换名。
- 标签目前用中文，URL 会带百分号编码；想干净可改成英文 slug。
