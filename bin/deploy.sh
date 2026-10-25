#!/bin/sh
# 构建 + 部署到 Orange Pi 的 Caddy 站点根目录
# 用法:
#   bin/deploy.sh            构建并同步静态文件
#   bin/deploy.sh --caddy    同步静态 + 推送 deploy/Caddyfile 并 reload
#   bin/deploy.sh --dry      只显示将要同步的内容
set -eu

APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
HOST=${HOST:-opi}
REMOTE_DIR=${REMOTE_DIR:-/var/www/blog}
SITE=${SITE:-https://www.ignacio.dpdns.org/}

cd "$APP_DIR"

echo "== 1/4 构建 =="
hugo --gc --minify --cleanDestinationDir
du -sh public | sed 's/^/   /'
test -f public/index.html || { echo "!! 构建产物缺失"; exit 1; }

if [ "${1:-}" = "--dry" ]; then
  echo "== dry run：只显示将要同步的内容 =="
  rsync -an --delete --itemize-changes public/ "$HOST:$REMOTE_DIR/"
  exit 0
fi

echo "== 2/4 同步静态文件 =="
ssh "$HOST" 'sudo mkdir -p '"$REMOTE_DIR"' && sudo chown "$(id -un):$(id -gn)" /var/www '"$REMOTE_DIR"' && chmod 755 /var/www '"$REMOTE_DIR"''
rsync -az --delete --chmod=D755,F644 --info=stats1 public/ "$HOST:$REMOTE_DIR/"

echo "== 3/4 配置 =="
if [ "${1:-}" = "--caddy" ]; then
  LOCAL_MD5=$(md5sum deploy/Caddyfile | cut -d' ' -f1)
  scp -q deploy/Caddyfile "$HOST:/tmp/Caddyfile.new"
  REMOTE_MD5=$(ssh "$HOST" "md5sum /tmp/Caddyfile.new | cut -d' ' -f1")
  echo "   md5 local=$LOCAL_MD5 remote=$REMOTE_MD5"
  [ "$LOCAL_MD5" = "$REMOTE_MD5" ] || { echo "!! 传输校验失败"; exit 1; }
  ssh "$HOST" "sudo caddy validate --config /tmp/Caddyfile.new >/dev/null && sudo install -m 644 /tmp/Caddyfile.new /etc/caddy/Caddyfile && rm -f /tmp/Caddyfile.new && sudo systemctl reload caddy && echo '   caddy reloaded'"
else
  ssh "$HOST" "caddy validate --config /etc/caddy/Caddyfile >/dev/null 2>&1 && echo '   现有 caddy 配置有效' || echo '   !! caddy 配置有问题'"
fi

echo "== 4/4 验证 =="
curl -4 -s -o /dev/null -m 20 -w "   %{http_code}  %{size_download}B  %{time_total}s  /\n" "$SITE"
curl -4 -s -o /dev/null -m 20 -w "   %{http_code}  %{size_download}B  %{time_total}s  /posts/\n" "${SITE}posts/"
curl -4 -s -o /dev/null -m 20 -w "   %{http_code}  %{size_download}B  %{time_total}s  /nope\n" "${SITE}nope"
