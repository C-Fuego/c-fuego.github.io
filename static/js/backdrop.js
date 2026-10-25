/* 背景：穹顶三角网（对照 Phigros 启动界面 TriGrid 实机）
   等边三角网格 → sin 映射压缩；RGB 三通道分离叠加出边缘色散。
   滚动 = 屏幕坐标刚性平移，绝不重算映射（重算会让每行伸缩，看起来在扭）。 */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvas = document.getElementById("backdrop");
  if (!canvas) return;

  var ctx = canvas.getContext("2d", { alpha: false });

  var BG = "#121218";
  var CELL = 148;        /* 三角形列宽：越大越稀 */
  var WARP = 1.08;       /* sin 映射强度 */
  var EXTRA = 1100;      /* 上下各多生成的高度，给滚动留余量 */
  var SCROLL_K = 0.28;   /* 背景滚动速度（相对页面） */

  var W = 0, H = 0, dpr = 1;
  var verts = [], edges = [];
  var cx = 0, cy = 0;
  var t = 0, last = 0;
  var FRAME = 1000 / 30;
  var SINW = Math.sin(WARP);

  /* 分段映射：|n|<=1 走 sin 压缩，超出部分按边缘斜率线性延伸。
     纯 sin 在 |n| > π/(2*WARP) 后会回折，滚动余量里的行会翻到屏幕另一侧成乱线。 */
  var EDGE_SLOPE = WARP * Math.cos(WARP) / SINW;   /* 边缘斜率 ≈ 0.58 */
  function warp(n) {
    if (n > 1) return 1 + (n - 1) * EDGE_SLOPE;
    if (n < -1) return -1 + (n + 1) * EDGE_SLOPE;
    return Math.sin(n * WARP) / SINW;
  }

  function build() {
    cx = W * 0.5;
    cy = H * 0.5;

    var rowH = CELL * 0.866;
    var cols = Math.ceil(W / CELL) + 2;
    var rows = Math.ceil((H + EXTRA * 2) / rowH) + 2;

    verts = [];
    edges = [];

    for (var r = 0; r < rows; r++) {
      var row = [];
      for (var c = 0; c < cols; c++) {
        var px = (c + (r % 2) * 0.5) * CELL - CELL;
        var py = r * rowH - rowH - EXTRA;
        var nx = (px - cx) / (W * 0.5);
        var ny = (py - cy) / (H * 0.5);
        row.push({
          bx: cx + warp(nx) * (W * 0.5) * 1.04,
          by: cy + warp(ny) * (H * 0.5) * 1.04,
          ph: Math.random() * Math.PI * 2,
          sp: 0.5 + Math.random() * 0.8,
          x: 0, y: 0
        });
      }
      if (r > 0) {
        var base = (r - 1) * cols;
        for (var k = 0; k < cols; k++) {
          var a = verts[base + k], b = row[k];
          var bl = row[k - 1];
          var an = verts[base + k + 1];
          if (a && b) edges.push([a, b]);          /* 斜向右下 */
          if (a && bl) edges.push([a, bl]);        /* 斜向左下 */
          if (a && an) edges.push([a, an]);        /* 水平 */
        }
      }
      for (var q = 0; q < row.length; q++) verts.push(row[q]);
    }
  }

  function compute() {
    /* 刚性平移：所有点减同一个屏幕位移，形状不变 */
    var shift = window.scrollY * SCROLL_K;
    for (var i = 0; i < verts.length; i++) {
      var n = verts[i];
      var wob = Math.sin(t * 0.00020 * n.sp + n.ph) * 1.6
              + Math.cos(t * 0.00010 + n.ph) * 0.9;
      n.x = n.bx + wob;
      n.y = n.by + wob * 0.7 - shift;
    }
  }

  function drawBackground() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    var R = Math.max(W, H);

    var g0 = ctx.createRadialGradient(cx, cy * 0.90, 0, cx, cy * 0.90, R * 0.50);
    g0.addColorStop(0, "rgba(154,162,190,0.16)");
    g0.addColorStop(0.34, "rgba(120,126,152,0.08)");
    g0.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g0;
    ctx.fillRect(0, 0, W, H);

    var g1 = ctx.createRadialGradient(W * 0.74, H * 0.10, 0, W * 0.74, H * 0.10, R * 0.52);
    g1.addColorStop(0, "rgba(140,145,172,0.10)");
    g1.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    var g2 = ctx.createRadialGradient(W * 0.10, H * 0.44, 0, W * 0.10, H * 0.44, R * 0.48);
    g2.addColorStop(0, "rgba(112,117,146,0.08)");
    g2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);

    var g3 = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.30, cx, cy, R * 0.92);
    g3.addColorStop(0, "rgba(10,10,14,0)");
    g3.addColorStop(0.65, "rgba(10,10,14,0.28)");
    g3.addColorStop(1, "rgba(10,10,14,0.70)");
    ctx.fillStyle = g3;
    ctx.fillRect(0, 0, W, H);
  }

  function strokeChannel(scale, style, width) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    ctx.beginPath();
    for (var i = 0; i < edges.length; i++) {
      var e = edges[i];
      /* 屏幕外的边直接跳过，省一半绘制 */
      if (e[0].y < -80 && e[1].y < -80) continue;
      if (e[0].y > H + 80 && e[1].y > H + 80) continue;
      ctx.moveTo(e[0].x, e[0].y);
      ctx.lineTo(e[1].x, e[1].y);
    }
    ctx.lineWidth = width;
    ctx.strokeStyle = style;
    ctx.stroke();
    ctx.restore();
  }

  function render() {
    drawBackground();

    /* 色散幅度收小：偏移过大三条线会分成三根，看着像重叠 */
    strokeChannel(1.0032, "rgba(255,52,66,0.50)", 1.1);
    strokeChannel(1.0000, "rgba(52,255,126,0.42)", 1.1);
    strokeChannel(0.9968, "rgba(58,112,255,0.50)", 1.1);
  }

  function draw(now) {
    requestAnimationFrame(draw);
    if (now - last < FRAME) return;
    t += last ? Math.min(now - last, 90) : 16;
    last = now;
    compute();
    render();
  }

  function still() {
    t = 9000;
    compute();
    render();
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.ceil(window.innerWidth);
    H = Math.ceil(window.innerHeight);
    canvas.width = Math.ceil(W * dpr);
    canvas.height = Math.ceil(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () { resize(); still(); if (!reduce) last = 0; }, 180);
  });

  resize();
  still();

  if (reduce) {
    var st;
    window.addEventListener("scroll", function () {
      clearTimeout(st);
      st = setTimeout(function () { compute(); render(); }, 60);
    }, { passive: true });
  } else {
    requestAnimationFrame(draw);
  }
})();
