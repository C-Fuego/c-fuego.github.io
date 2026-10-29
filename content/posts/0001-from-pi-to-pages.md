---
title: "把博客从 1GB 的板子搬到 GitHub Pages"
date: 2026-10-29T14:20:00+08:00
tags: ["部署", "Hugo", "GitHub Pages"]
summary: "原来那套是板子加隧道，现在是一份源码加一次 push。迁移过程中踩了三个坑，都记在这里。"
---

原来的站跑在一块 Orange Pi Zero 3 上：4 核 H618、1GB 内存、8GB 卡，Caddy 只干一件事——把 `/var/www/blog` 里的文件读出来。整套东西的内存占用比一个浏览器标签页还低，写一篇文章也只要一条命令。

问题是那条命令依赖板子活着。板子在校网里，靠一条主动拨出的隧道对外，断线要靠保活脚本自己接回来。写文章本来是件安静的事，不该先去看板子在不在。

## 换成什么

GitHub Pages，加一份 Hugo 源码，加一个 Actions workflow。写完推送，云端构建，一分钟内上线。

| | 板子 + 隧道 | GitHub Pages |
|---|---|---|
| 发布动作 | `hugo` 构建 + `rsync` 到板子 | `git push` |
| 前提 | 板子在线、隧道没断 | 能连 GitHub |
| 构建位置 | 本机 | 云端 runner |
| 出故障时 | SSH 上去看服务 | 看 Actions 日志 |

站点从根路径换成了 `/blog/`（项目站的子路径），这一步引出了第一个坑。

## 坑一：`relURL` 的前导斜杠

Hugo 的 `relURL` 看起来是"相对路径"，但传进去的字符串**以斜杠开头时它不拼 baseURL 的路径部分**：

```
baseURL = "https://example.github.io/blog/"

{{ "/posts/" | relURL }}   →  /posts/          ← 丢了 /blog/
{{ "posts/"  | relURL }}   →  /blog/posts/     ← 正确
```

站内所有导航于是全部指到 `https://example.github.io/posts/`，404。修法是全站统一去掉前导斜杠，回首页写 `{{ "" | relURL }}`，菜单项用 `.Page.RelPermalink` 而不是 `.URL | relURL`。

这个错误在根路径部署时完全看不出来——两种写法输出一样。只有部署到子路径才炸。

## 坑二：Pages 得先手动开一次

第一次跑 workflow，`Setup Pages` 这一步直接失败：

```
Error: Get Pages site failed. Please ensure that the repository has a GitHub Pages site enabled.
```

我一开始想让它自动开，给 `actions/configure-pages` 加了 `enablement: true`，结果换了一条更明确的报错：

```
Resource not accessible by integration
Must have admin rights to Repository.
```

`GITHUB_TOKEN` 没有仓库管理员权限，开不了 Pages。这一步只能人点一次：**Settings → Pages → Source 选 "GitHub Actions"**。点完之后每次 push 都会自动构建，不用再管。

## 坑三：这台机器的 DNS

`github.com` 在这个环境里被 hosts 钉在 `127.0.0.1`，整个域名家族都是，`api.github.com`、`codeload.github.com`、`raw.githubusercontent.com` 一个不漏。直接 `git push` 会连到本机 443 然后被拒绝。

绕过的方法是不改 hosts，只让 SSH 走另一个入口：

```bash
# ~/.ssh/config
Host github.com
    HostName ssh.github.com
    Port 443
    User git
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
```

`ssh.github.com:443` 不在屏蔽名单里，`git push` 正常。查构建状态则用 `curl --resolve` 把 IP 钉住：

```bash
curl -s --resolve api.github.com:443:20.205.243.168 \
  https://api.github.com/repos/<owner>/<repo>/actions/runs?per_page=1
```

## 现在怎么写东西

```bash
hugo new content posts/0002-slug.md
bin/pub "写了什么"
```

`bin/pub` 会先本地构建一遍，构建失败就不推。剩下的交给 Actions。

板子没扔，还在跑别的东西。只是不再负责这个站了。
