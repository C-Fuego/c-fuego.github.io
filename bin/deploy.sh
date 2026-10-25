#!/bin/sh
# 构建 + 部署到 Orange Pi 的 Caddy 站点根目录
# 用法:
#   bin/deploy.sh            构建、查死链、同步静态文件
#   bin/deploy.sh --caddy    同上 + 推送 deploy/Caddyfile 并 reload
#   bin/deploy.sh --dry      只显示将要同步的内容
set -eu

APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
HOST=${HOST:-opi}
REMOTE_DIR=${REMOTE_DIR:-/var/www/blog}
SITE=${SITE:-https://www.ignacio.dpdns.org/}

cd "$APP_DIR"

echo "== 1/5 构建 =="
hugo --gc --minify --cleanDestinationDir
du -sh public | sed 's/^/   /'
test -f public/index.html || { echo "!! 构建产物缺失"; exit 1; }

echo "== 2/5 内部链接检查 =="
LINKS=$(mktemp)
trap 'rm -f "$LINKS"' EXIT INT TERM
grep -rhoE 'href="/[^"#?]*"' public --include='*.html' \
  | sed 's/^href="//; s/"$//' | sort -u > "$LINKS"
BAD=0
while IFS= read -r p; do
  [ -n "$p" ] || continue
  case "$p" in
    *.xml|*.svg|*.css|*.js|*.woff2|*.png|*.jpg|*.webp|*.ico|*.txt|*.json) ;;
  esac
  dec=$(printf '%b' "$(printf '%s' "$p" | sed 's/%/\\x/g')")
  f="public${dec}"
  [ -f "$f" ] && continue
  [ -f "${f%/}/index.html" ] && continue
  [ -f "${f}.html" ] && continue
  echo "   !! 死链 $p"
  BAD=$((BAD+1))
done < "$LINKS"
echo "   检查 $(wc -l < "$LINKS" | tr -d ' ') 个内部链接，死链 $BAD 个"

if [ "${1:-}" = "--dry" ]; then
  echo "== dry run：只显示将要同步的内容 =="
  rsync -an --delete --itemize-changes public/ "$HOST:$REMOTE_DIR/"
  exit 0
fi

[ "$BAD" -eq 0 ] || echo "   (存在死链，仍继续部署)"

echo "== 3/5 同步静态文件 =="
ssh "$HOST" 'sudo mkdir -p '"$REMOTE_DIR"' && sudo chown "$(id -un):$(id -gn)" /var/www '"$REMOTE_DIR"' && chmod 755 /var/www '"$REMOTE_DIR"''
rsync -az --delete --chmod=D755,F644 --info=stats1 public/ "$HOST:$REMOTE_DIR/"

echo "== 4/5 配置 =="
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

echo "== 5/5 验证 =="
curl -4 -s -o /dev/null -m 20 -w "   %{http_code}  %{size_download}B  %{time_total}s  /\n" "$SITE"
curl -4 -s -o /dev/null -m 20 -w "   %{http_code}  %{size_download}B  %{time_total}s  /posts/\n" "${SITE}posts/"
curl -4 -s -o /dev/null -m 20 -w "   %{http_code}  %{size_download}B  %{time_total}s  /index.json\n" "${SITE}index.json"
curl -4 -s -o /dev/null -m 20 -w "   %{http_code}  %{size_download}B  %{time_total}s  /nope\n" "${SITE}nope"
