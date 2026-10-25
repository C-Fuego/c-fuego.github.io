/* 背景：三角编织网（对齐 Phigros 第九章界面）
   白色细线 + 双层描边做柔和辉光 + 顶点随机撒实心小三角 + 光带扫过 */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvas = document.getElementById("backdrop");
  if (!canvas) return;

  var ctx = canvas.getContext("2d", { alpha: false });

  var CELL = 96;               /* 网格边长 */
  var BG = "#080C12";          /* 底色：蓝灰深色，不是纯黑 */
  var SWEEP_W = 300;           /* 光带半宽 */

  var W = 0, H = 0, cols = 0, rows = 0, dpr = 1;
  var pts = [], co = [], deco = [];
  var t = 0, last = 0;
  var FRAME = 1000 / 30;

  function rnd(a, b) { return a + Math.random() * (b - a); }

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
    pts = []; co = []; deco = [];
    for (var j = 0; j < rows; j++) {
      var rp = [], rc = [];
      for (var i = 0; i < cols; i++) {
        rp.push({
          x: (i - 1) * CELL,
          y: (j - 1) * CELL,
          ph: Math.random() * Math.PI * 2,
          sp: 0.6 + Math.random() * 0.8
        });
        rc.push({ x: 0, y: 0 });
      }
      pts.push(rp);
      co.push(rc);
    }

    /* 顶点装饰：约 7% 的顶点挂一个实心小三角 */
    for (var jj = 0; jj < rows; jj++) {
      for (var ii = 0; ii < cols; ii++) {
        if (Math.random() < 0.07) {
          deco.push({ i: ii, j: jj, size: rnd(3.5, 7), rot: rnd(0, Math.PI * 2), a: rnd(0.16, 0.38) });
        }
      }
    }
  }

  function compute() {
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var p = pts[j][i], c = co[j][i];
        c.x = p.x + Math.sin(t * 0.00035 * p.sp + p.ph) * 4.5 + Math.cos(t * 0.00015 + p.ph) * 2.5;
        c.y = p.y + Math.cos(t * 0.00042 * p.sp + p.ph * 1.6) * 4;
      }
    }
  }

  function tri(cx, cy, size, rot, alpha) {
    var r = size * 0.75, a = rot;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.lineTo(cx + Math.cos(a + 2.094) * r, cy + Math.sin(a + 2.094) * r);
    ctx.lineTo(cx + Math.cos(a + 4.188) * r, cy + Math.sin(a + 4.188) * r);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255," + alpha.toFixed(3) + ")";
    ctx.fill();
  }

  function render(sweepX) {
    /* 底色 + 顶部一层很淡的冷光 */
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    var g = ctx.createRadialGradient(W * 0.5, -H * 0.15, 0, W * 0.5, -H * 0.15, H * 1.1);
    g.addColorStop(0, "rgba(90,140,170,0.14)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    /* 网格：两层描边 = 柔和辉光 */
    for (var pass = 0; pass < 2; pass++) {
      for (var j = 0; j < rows - 1; j++) {
        for (var i = 0; i < cols - 1; i++) {
          var a = co[j][i], b = co[j][i + 1], c = co[j + 1][i], d = co[j + 1][i + 1];
          var mx = (a.x + d.x) * 0.5;
          var glow = 1 - Math.abs(mx - sweepX) / SWEEP_W;
          if (glow < 0) glow = 0;

          if (pass === 1) {
            ctx.lineWidth = 2.8;
            ctx.strokeStyle = "rgba(255,255,255," + (0.008 + glow * 0.07).toFixed(3) + ")";
          } else {
            ctx.lineWidth = 1;
            ctx.strokeStyle = "rgba(255,255,255," + (0.032 + glow * 0.20).toFixed(3) + ")";
          }

          ctx.beginPath();
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.lineTo(d.x, d.y); ctx.lineTo(c.x, c.y);
          ctx.lineTo(a.x, a.y);
          if ((i + j) % 2 === 0) { ctx.moveTo(a.x, a.y); ctx.lineTo(d.x, d.y); }
          else { ctx.moveTo(b.x, b.y); ctx.lineTo(c.x, c.y); }
          ctx.stroke();
        }
      }
    }

    /* 光带经过的三角形填一层极淡的白 */
    for (var j2 = 0; j2 < rows - 1; j2++) {
      for (var i2 = 0; i2 < cols - 1; i2++) {
        var a2 = co[j2][i2], b2 = co[j2][i2 + 1], c2 = co[j2 + 1][i2], d2 = co[j2 + 1][i2 + 1];
        var mx2 = (a2.x + d2.x) * 0.5;
        var gw = 1 - Math.abs(mx2 - sweepX) / SWEEP_W;
        if (gw < 0.45) continue;
        ctx.fillStyle = "rgba(255,255,255," + (gw * 0.032).toFixed(3) + ")";
        if ((i2 + j2) % 2 === 0) {
          ctx.beginPath(); ctx.moveTo(a2.x, a2.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(d2.x, d2.y); ctx.closePath(); ctx.fill();
        } else {
          ctx.beginPath(); ctx.moveTo(a2.x, a2.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(c2.x, c2.y); ctx.closePath(); ctx.fill();
        }
      }
    }

    /* 顶点小三角装饰 */
    for (var k = 0; k < deco.length; k++) {
      var dv = deco[k];
      var pv = co[dv.j][dv.i];
      if (!pv) continue;
      var gv = 1 - Math.abs(pv.x - sweepX) / SWEEP_W;
      if (gv < 0) gv = 0;
      tri(pv.x, pv.y, dv.size, dv.rot + t * 0.00006, Math.min(0.85, dv.a + gv * 0.4));
    }
  }

  function draw(now) {
    requestAnimationFrame(draw);
    if (now - last < FRAME) return;
    t += last ? Math.min(now - last, 90) : 16;
    last = now;
    compute();
    var sweep = ((t * 0.00006) % 1.6) - 0.3;
    render(sweep * W);
  }

  function still() {
    t = 8000;
    compute();
    render(W * 0.40);
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
