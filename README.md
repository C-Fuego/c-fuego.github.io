# blog

个人博客框架。Hugo 静态站，推到 GitHub 后由 Actions 构建，发布到 GitHub Pages。

- 站点：`https://c-fuego.github.io/blog/`
- 仓库：`https://github.com/C-Fuego/blog`
- 视觉：`endfield-ui`（终末地工业风）——纸 `#F4F4F2` / 墨 `#161616` / 单一强调色 `#FFFA00` 只做填充、切角表示可点击、零圆角、细线分区、真实数字。

内容还没写。骨架、样式、搜索、部署链都是通的。

## 结构

```
hugo.toml                    站点配置（baseURL、菜单、taxonomy、JSON 索引输出）
content/
  about.md                   关于页正文
  posts/_index.md            文章列表页导语
  posts/NNNN-slug.md         文章，文件名前缀 = 永久编号
layouts/
  baseof.html                外壳：命令栏 + 三色条 + main + 页脚 + 搜索层
  index.html                 首页（展示型：字段行 + 大字标 + 三块看板 + 最近写入）
  _default/single.html       文章页（阅读型：白纸正文 + 右侧目录/数据）
  _default/list.html         文章列表（按年份分组）
  _default/terms.html        标签总览
  404.html
  index.json                 站内搜索索引（Go 模板，不是合法 JSON）
  partials/                  head / cmdbar / foot / record / search
  _default/_markup/          render-heading / render-link / render-image
static/
  ef/                        endfield.css 部件库 + fx.js + variant.js + 等高线
  css/main.css               站点层：字体、版式、搜索层、页脚
  css/chroma.css             代码高亮（github 浅色档）
  fonts/                     Saira 可变字体 woff2 + OFL 许可证
  js/site.js                 搜索 / 代码复制 / 目录跟随
.github/workflows/pages.yml  构建并发布
bin/pub                      发布脚本
```

## 写文章

```bash
hugo new content posts/0001-slug.md
```

```yaml
---
title: "标题"
date: 2026-10-29T12:00:00+08:00
tags: ["标签"]
summary: "列表和搜索结果里显示的一句话"
---
```

- 文件名前缀 `0001-`、`0002-`… 只在有编号时用于显示 `No.001`；去掉前缀也能正常发布。
- `date` 不能写未来时间，Hugo 默认跳过未来文章。
- `summary` 可选，不写就取正文前段。
- 首页、列表页、搜索索引全部从文章自动生成，加文件就行，不用改模板。

## 发布

首次：仓库 Settings → Pages → Source 选 **GitHub Actions**。

日常：

```bash
bin/pub "写了什么"
```

先本地构建校验（失败就不推），再 commit、push，Actions 约 30–60 秒上线。
构建记录：https://github.com/C-Fuego/blog/actions

## 本地预览

```bash
hugo server --bind 127.0.0.1 --port 1313
```

`fx.js` / `variant.js` 是 ES module，必须走 `http://`，不能 `file://` 打开。

## 改样式时的坑

- 内部链接写 `{{ "posts/" | relURL }}`，**不要带前导斜杠**：Hugo 会忽略 baseURL 的路径部分，部署在 `/blog/` 下导航会跳到站点根。
- `layouts/index.json` 是 Go 模板，用 JSON 校验器过它会报错，正常。
- `static/css/main.css` 里的 `.ef .ef-tag { color: var(--ef-tag-fg) }` 是必要的兜底：不写这条，标签的 `color` 在本站结构下被压成墨色，墨底墨字看不见。
- `endfield` 的部件库动手改之前先看 `~/.hermes/skills/endfield-ui/`，那是上游。
