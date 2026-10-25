/* 背景：穹顶三角网（对齐 Phigros 第九章 TriGrid 实机画面）
   平面等边三角网格 → sin 映射（中心拉伸、边缘压缩）
   线条 RGB 三通道分离绘制，lighter 叠加：中心白线、边缘彩虹 */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvas = document.getElementById("backdrop");
  if (!canvas) return;

  var ctx = canvas.getContext("2d", { alpha: false });

  var BG = "#0A0C10";
  var CELL = 104;      /* 三角形列宽 */
  var WARP = 1.10;     /* sin 映射强度：越大中心越鼓、边缘越压 */

  var W = 0, H = 0, dpr = 1;
  var verts = [], edges = [];
  var cx = 0, cy = 0;
  var t = 0, last = 0;
  var FRAME = 1000 / 30;

  var SINW = Math.sin(WARP);
  var ROWH = 0;

  /* 归一化 [-1,1] → [-1,1]，中心斜率 >1、边缘 <1 */
  function warp(n) {
    /* clamp：超过 π/2 区 sin 会回折，网格边缘会被压成椭圆 */
    var v = n * WARP;
    if (v > 1.52) v = 1.52;
    if (v < -1.52) v = -1.52;
    return Math.sin(v) / SINW;
  }

  function build() {
    cx = W * 0.5;
    cy = H * 0.5;

    var rowH = CELL * 0.866;
    ROWH = rowH;
    var cols = Math.ceil(W / CELL) + 3;
    var rows = Math.ceil(H / rowH) + 3;

    verts = [];
    edges = [];

    for (var r = 0; r < rows; r++) {
      var row = [];
      for (var c = 0; c < cols; c++) {
        var px = (c + (r % 2) * 0.5) * CELL - CELL;
        var py = r * rowH - rowH;
        var nx = (px - W * 0.5) / (W * 0.5);
        var ny = (py - H * 0.5) / (H * 0.5);
        row.push({
          px: px, py: py,
          bx: cx + warp(nx) * (W * 0.5) * 1.02,
          by: cy + warp(ny) * (H * 0.5) * 1.02,
          nx: nx, ny: ny,
          ph: Math.random() * Math.PI * 2,
          sp: 0.5 + Math.random() * 0.8,
          x: 0, y: 0
        });
      }
      if (r > 0) {
        var base = (r - 1) * cols;
        for (var k = 0; k < cols; k++) {
          var a = verts[base + k], b = row[k];
          if (a && b) edges.push([a, b]);
          if (a && row[k + 1]) edges.push([a, row[k + 1]]);
          var an = verts[base + k + 1];
          if (an && b) edges.push([an, b]);
        }
      }
      for (var q = 0; q < row.length; q++) verts.push(row[q]);
    }
  }

  function compute() {
    /* 滚动量按三角网的行高取模：平移整数行图案完全重合，所以不会露缝 */
    var vOff = ROWH ? (window.scrollY * 0.42) % ROWH : 0;
    var halfH = H * 0.5;

    for (var i = 0; i < verts.length; i++) {
      var n = verts[i];
      if (vOff) {
        var ny2 = (n.py - vOff - halfH) / halfH;
        n.by = cy + warp(ny2) * halfH * 1.02;
      }
      var wob = Math.sin(t * 0.00026 * n.sp + n.ph) * 1.8
              + Math.cos(t * 0.00012 + n.ph) * 1.0;
      n.x = n.bx + wob;
      n.y = n.by + wob * 0.8;
    }
  }

  function drawBackground() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    var R = Math.max(W, H);
    /* 右上暖光团 */
    var g1 = ctx.createRadialGradient(W * 0.75, H * 0.15, 0, W * 0.75, H * 0.15, R * 0.52);
    g1.addColorStop(0, "rgba(255,152,96,0.32)");
    g1.addColorStop(0.28, "rgba(200,96,76,0.13)");
    g1.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    /* 左上冷光 */
    var g2 = ctx.createRadialGradient(W * 0.18, H * 0.10, 0, W * 0.18, H * 0.10, R * 0.75);
    g2.addColorStop(0, "rgba(112,148,184,0.12)");
    g2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);

    /* 中心压暗，四周留亮 */
    var g3 = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.06, cx, cy, R * 0.75);
    g3.addColorStop(0, "rgba(0,0,0,0.36)");
    g3.addColorStop(0.55, "rgba(0,0,0,0.18)");
    g3.addColorStop(1, "rgba(0,0,0,0.40)");
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

    strokeChannel(1.0055, "rgba(255,45,60,0.52)", 1.1);
    strokeChannel(1.0000, "rgba(45,255,120,0.45)", 1.1);
    strokeChannel(0.9945, "rgba(55,110,255,0.52)", 1.1);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.beginPath();
    for (var i = 0; i < edges.length; i++) {
      ctx.moveTo(edges[i][0].x, edges[i][0].y);
      ctx.lineTo(edges[i][1].x, edges[i][1].y);
    }
    ctx.lineWidth = 3.4;
    ctx.strokeStyle = "rgba(130,160,200,0.035)";
    ctx.stroke();
    ctx.restore();
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
    /* 降级模式不做动画，但滚动跟随仍要有 */
    var st;
    window.addEventListener("scroll", function () {
      clearTimeout(st);
      st = setTimeout(function () { compute(); render(); }, 60);
    }, { passive: true });
  } else {
    requestAnimationFrame(draw);
  }
})();
