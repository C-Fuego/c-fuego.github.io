---
title: "把博客搬到一块 1GB 的板子上"
date: 2026-10-25T22:08:00+08:00
tags: ["部署", "架构"]
summary: "Orange Pi Zero 3、一串 Cloudflare 隧道、一个只会读文件的 Caddy。整套东西的内存占用比浏览器的标签页还低。"
---

板子是 Orange Pi Zero 3：4 核 H618，1GB 内存，8GB SD 卡。它现在要干的活是全天候对外提供一个博客。

## 为什么不用动态站

先列一遍试过的东西，省得以后又想回去。

| 方案 | 运行时 | 内存 | 结果 |
|---|---|---|---|
| Kite | Go 单二进制 | ~80MB | 后台配置保存有竞态，改不动配置 |
| Typecho | PHP + SQLite | ~40MB | PHP 近期漏洞太多，主动排除 |
| Ghost | Node | 500MB+ | 1GB 板子扛不住 |
| Hugo | 无 | 0 | 板上只有 `file_server` |

静态站的意思很直白：板上没有任何应用进程。所有 HTML 在电脑上生成好，同步过去，Caddy 只负责把文件读出来。

## 链路

```
访客 → Cloudflare 边缘 (TLS 终止)
     → QUIC 隧道（板子主动拨出，不需要公网 IP）
     → cloudflared
     → Caddy :8080
     → /var/www/blog
```

校园网只给出站连接，没有公网入口，所以隧道是必需的。板子每 3 分钟跑一次 Portal 保活脚本，断线自己接回来。

## Caddy 那一段

```caddyfile
:8080 {
	@apex host ignacio.dpdns.org
	redir @apex https://www.ignacio.dpdns.org{uri} 301

	root * /var/www/blog
	encode zstd gzip

	@assets path /css/* /js/* /fonts/* /favicon.svg
	header @assets Cache-Control "public, max-age=604800"

	try_files {path} {path}/ {path}.html =404
	file_server
}
```

`try_files` 那行是重点：Hugo 的干净 URL 是目录形式（`/posts/0001/index.html`），直接 `file_server` 也能命中目录索引，但补上 `.html` 兜底以后，手写的短链接也不会 404。

## 发布脚本

```bash
#!/bin/sh
set -eu
hugo --gc --minify --cleanDestinationDir
rsync -az --delete --chmod=D755,F644 public/ opi:/var/www/blog/
curl -4 -s -o /dev/null -w "%{http_code}\n" https://www.ignacio.dpdns.org/
```

`--delete` 是刻意的：文章改名后旧目录必须消失，否则会残留两份内容，搜索引擎会当成重复页。

## 代价

- 首字节 1–2.7 秒。板子在校网，隧道绕一圈，Cloudflare 对 HTML 默认不缓存。
- 想快就在 Cloudflare 加一条 Cache Rule 把 HTML 也缓存掉，静态站这么做是安全的。
- 没有后台。写作在本机，发一条命令上线。换来的是板上零攻击面。
