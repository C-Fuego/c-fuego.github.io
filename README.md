# blog

个人博客源码。Hugo 静态站，推到 GitHub 后由 Actions 构建，发布到 GitHub Pages。

- 站点：`https://c-fuego.github.io/blog/`
- 仓库：`https://github.com/C-Fuego/blog`
- 视觉体系：`endfield-ui`（终末地工业风）——纸面 `#F4F4F2`、墨 `#161616`、强调色 `#FFFA00` 只做填充、切角表示可点击、零圆角。

## 结构

```
hugo.toml                  站点配置（baseURL、菜单、taxonomy、输出 JSON 索引）
content/
  _index.md                首页导语
  about.md                 关于页
  posts/_index.md          归档页导语
  posts/NNNN-*.md          文章，文件名前缀 = 永久编号
layouts/
  baseof.html              外壳：三色条 + 顶栏 + main + 页脚 + 搜索层
  index.html               首页（展示型：大字标、空心编号、最新记录）
  _default/single.html     文章页（阅读型：正文 + 侧栏目录）
  _default/list.html       归档 / 标签列表
  _default/terms.html      标签总览
  index.json               站内搜索索引
  partials/                head / nav / foot / record / row / pager / search
  _default/_markup/        render-image / render-link / render-heading
static/
  ef/                      endfield.css 部件库 + fx.js + variant.js + 等高线
  css/main.css             站点层：字体、版式、搜索层、灯箱、代码复制
  css/chroma.css           代码高亮
  fonts/                   Saira 可变字体（woff2）+ OFL 许可证
  js/ui.js                 搜索 / 进度 / 目录跟随 / 灯箱 / 复制
  favicon.svg
.github/workflows/pages.yml 构建并发布到 GitHub Pages
bin/pub                    发布脚本
```

## 发布

首次：仓库 Settings → Pages → Source 选 **GitHub Actions**，之后不用再动。

日常：

```bash
bin/pub "写了什么"
```

脚本先本地构建一遍（构建失败就不推），再 commit、push，Actions 约 30–60 秒后上线。
也可以直接 `git add -A && git commit && git push`，脚本只是省事。

构建记录：https://github.com/C-Fuego/blog/actions

## 写文章

```bash
hugo new content posts/0005-标题.md
```

front matter：

```yaml
---
title: "标题"
date: 2026-10-29T12:00:00+08:00
tags: ["标签"]
summary: "列表页和搜索结果里显示的一句话"
---
```

- 文件名前缀 `0001-`、`0002-`… 是永久编号，删掉的号不回收。
- `date` 不能写未来时间，Hugo 默认不构建未来日期的文章。
- `summary` 可选，不写就取正文前段。

## 本地预览

```bash
hugo server --bind 127.0.0.1 --port 1313
```

`fx.js` / `variant.js` 是 ES module，必须走 `http://`，不能用 `file://` 直接打开。

## 注意

- 模板里的内部链接写 `{{ "posts/" | relURL }}`，**不要带前导斜杠**。带斜杠时 Hugo 忽略 baseURL 的路径部分，部署在子路径（`/blog/`）下导航会指到站点根。
- `layouts/index.json` 是 Go 模板不是合法 JSON，别拿 JSON 校验器过它。
- 高亮样式用 `github` 浅色主题，配浅色纸。
