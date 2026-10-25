/* 噪点层：随机刷新的胶片颗粒
   预生成 6 张 tile，每次刷新换一张并随机平移。
   每帧只有一次 fillRect，CPU 成本接近零。 */
(function () {
  "use strict";

  var canvas = document.getElementById("noise");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var TILE = 128;
  var COUNT = 6;
  var tiles = [];
  var pats = [];
  var cur = 0, ox = 0, oy = 0;
  var W = 0, H = 0, dpr = 1;

  function makeTile() {
    var c = document.createElement("canvas");
    c.width = c.height = TILE;
    var g = c.getContext("2d");
    var img = g.createImageData(TILE, TILE);
    var d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      d[i] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
      d[i + 3] = (Math.random() * 255) | 0;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  function build() {
    tiles = [];
    pats = [];
    for (var i = 0; i < COUNT; i++) {
      var t = makeTile();
      tiles.push(t);
      pats.push(ctx.createPattern(t, "repeat"));
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.ceil(window.innerWidth);
    H = Math.ceil(window.innerHeight);
    canvas.width = Math.ceil(W * dpr);
    canvas.height = Math.ceil(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    build();
  }

  function paint() {
    cur = (Math.random() * COUNT) | 0;
    ox = (Math.random() * TILE) | 0;
    oy = (Math.random() * TILE) | 0;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(-ox, -oy);
    ctx.fillStyle = pats[cur];
    ctx.fillRect(0, 0, W + TILE, H + TILE);
    ctx.restore();
  }

  var last = 0;
  var FRAME = 1000 / 15;

  function loop(now) {
    requestAnimationFrame(loop);
    if (now - last < FRAME) return;
    last = now;
    paint();
  }

  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () { resize(); paint(); }, 180);
  });

  resize();
  paint();

  if (reduce) return;
  requestAnimationFrame(loop);
})();
