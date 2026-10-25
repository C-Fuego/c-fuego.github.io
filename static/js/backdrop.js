/* 背景：三角形编织网（Phigros 启动界面语汇）
   规则三角网格 + 顶点缓动 + 沿对角线扫过的光带
   深蓝黑底，网格本身发光 */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvas = document.getElementById("backdrop");
  if (!canvas) return;

  var ctx = canvas.getContext("2d", { alpha: false });

  var CELL = 88;              /* 网格边长（逻辑像素） */
  var BG = "#05070B";          /* 底色：近黑偏蓝 */
  var LINE = "53,224,255";     /* 网格线基色 */
  var SWEEP_W = 250;           /* 光带半宽 */

  var W = 0, H = 0, cols = 0, rows = 0, dpr = 1;
  var pts = [];                /* 原始网格点 */
  var co = [];                 /* 每帧算好的坐标 */
  var t = 0, last = 0;
  var FRAME = 1000 / 30;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.ceil(window.innerWidth);
    H = Math.ceil(window.innerHeight);
    canvas.width = Math.ceil(W * dpr);
    canvas.height = Math.ceil(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cols = Math.ceil(W / CELL) + 3;
    rows = Math.ceil(H / CELL) + 3;
    pts = [];
    co = [];
    for (var j = 0; j < rows; j++) {
      var rp = [], rc = [];
      for (var i = 0; i < cols; i++) {
        rp.push({
          x: (i - 1) * CELL,
          y: (j - 1) * CELL,
          ph: Math.random() * Math.PI * 2,
          sp: 0.6 + Math.random() * 0.9
        });
        rc.push({ x: 0, y: 0 });
      }
      pts.push(rp);
      co.push(rc);
    }
  }

  function compute() {
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var p = pts[j][i], c = co[j][i];
        c.x = p.x + Math.sin(t * 0.00040 * p.sp + p.ph) * 15 + Math.cos(t * 0.00017 + p.ph) * 8;
        c.y = p.y + Math.cos(t * 0.00048 * p.sp + p.ph * 1.7) * 13;
      }
    }
  }

  function render(sweepX) {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 1;

    for (var j = 0; j < rows - 1; j++) {
      for (var i = 0; i < cols - 1; i++) {
        var a = co[j][i], b = co[j][i + 1], c = co[j + 1][i], d = co[j + 1][i + 1];
        var mx = (a.x + d.x) * 0.5;
        var glow = 1 - Math.abs(mx - sweepX) / SWEEP_W;
        if (glow < 0) glow = 0;
        var alpha = 0.052 + glow * 0.20;

        /* 靠近光带的三角形填一层很淡的青 */
        if (glow > 0.18) {
          ctx.fillStyle = "rgba(" + LINE + "," + (glow * 0.05).toFixed(3) + ")";
          if ((i + j) % 2 === 0) {
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(d.x, d.y); ctx.lineTo(c.x, c.y); ctx.closePath(); ctx.fill();
          } else {
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(d.x, d.y); ctx.lineTo(c.x, c.y); ctx.closePath(); ctx.fill();
          }
        }

        ctx.strokeStyle = "rgba(" + LINE + "," + alpha.toFixed(3) + ")";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.lineTo(d.x, d.y); ctx.lineTo(c.x, c.y);
        ctx.lineTo(a.x, a.y);
        if ((i + j) % 2 === 0) { ctx.moveTo(a.x, a.y); ctx.lineTo(d.x, d.y); }
        else { ctx.moveTo(b.x, b.y); ctx.lineTo(c.x, c.y); }
        ctx.stroke();

        /* 光带上的边再描一层亮线 */
        if (glow > 0.55) {
          ctx.strokeStyle = "rgba(255,255,255," + (glow * 0.18).toFixed(3) + ")";
          ctx.beginPath();
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y);
          ctx.stroke();
        }
      }
    }

    /* 顶点微光 */
    for (var jj = 0; jj < rows; jj++) {
      for (var ii = 0; ii < cols; ii++) {
        var p = co[jj][ii];
        var g = 1 - Math.abs(p.x - sweepX) / (SWEEP_W * 0.9);
        if (g > 0.12) {
          ctx.fillStyle = "rgba(255,255,255," + (g * 0.42).toFixed(3) + ")";
          ctx.fillRect(p.x - 0.8, p.y - 0.8, 1.6, 1.6);
        }
      }
    }
  }

  function draw(now) {
    requestAnimationFrame(draw);
    if (now - last < FRAME) return;
    t += last ? Math.min(now - last, 90) : 16;
    last = now;

    compute();
    var sweep = ((t * 0.00007) % 1.6) - 0.3;
    render(sweep * W);
  }

  /* 静态首帧：减少动态偏好 / 首屏立刻有东西 */
  function still() {
    t = 0;
    compute();
    render(W * 0.42);
  }

  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () { resize(); still(); if (!reduce) last = 0; }, 180);
  });

  resize();
  still();

  if (!reduce) requestAnimationFrame(draw);
})();
