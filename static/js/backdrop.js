/* 背景：穹顶式球面网格（对齐 Phigros 第九章封面 TriGrid）
   tan 投影 → 中心密、边缘疏、经线向中心收敛
   环线 + 交错斜线构成三角网；光带绕中心扫；边缘带 RGB 色散 */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvas = document.getElementById("backdrop");
  if (!canvas) return;

  var ctx = canvas.getContext("2d", { alpha: false });

  var BG = "#080C12";
  var RINGS = 13;                    /* 同心环层数 */
  var SEGS = 40;                     /* 每环分段 */
  var MAXPHI = 80 * Math.PI / 180;   /* 穹顶张角半角 */
  var PHI0 = 11 * Math.PI / 180;      /* 跳过正中心，避免糊死 */

  var W = 0, H = 0, dpr = 1;
  var nodes = [], deco = [];
  var cx = 0, cy = 0, R = 1;
  var t = 0, last = 0;
  var FRAME = 1000 / 30;

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function build() {
    cx = W * 0.5;
    cy = H * 0.46;
    R = Math.hypot(W, H) * 0.62;

    var kMax = Math.tan(MAXPHI / 2);
    nodes = [];
    deco = [];

    for (var i = 0; i <= RINGS; i++) {
      var tt = i / RINGS;
      var rr = Math.pow(tt, 1.7) * R;
      var stagger = (i % 2) * (Math.PI / SEGS);
      var ring = [];
      for (var j = 0; j < SEGS; j++) {
        var th = (j / SEGS) * Math.PI * 2 + stagger;
        ring.push({
          bx: cx + Math.cos(th) * rr,
          by: cy + Math.sin(th) * rr * 0.94,
          th: th,
          ph: Math.random() * Math.PI * 2,
          sp: 0.5 + Math.random() * 0.9,
          x: 0, y: 0
        });
        if (i > 1 && Math.random() < 0.03 + tt * 0.05) {
          deco.push({
            ring: i, seg: j,
            size: rnd(3, 6.5) * (0.6 + tt * 0.8),
            rot: rnd(0, Math.PI * 2),
            a: rnd(0.12, 0.32)
          });
        }
      }
      nodes.push(ring);
    }
  }

  function compute() {
    for (var i = 0; i < nodes.length; i++) {
      var ring = nodes[i];
      for (var j = 0; j < ring.length; j++) {
        var n = ring[j];
        var wob = Math.sin(t * 0.00035 * n.sp + n.ph) * 2.6
                + Math.cos(t * 0.00017 + n.ph) * 1.8;
        n.x = n.bx + Math.cos(n.th) * wob;
        n.y = n.by + Math.sin(n.th) * wob;
      }
    }
  }

  function angDist(a, b) {
    var d = Math.abs(a - b) % (Math.PI * 2);
    return d > Math.PI ? Math.PI * 2 - d : d;
  }

  function tri(x, y, size, rot, alpha) {
    var r = size * 0.75;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(rot) * r, y + Math.sin(rot) * r);
    ctx.lineTo(x + Math.cos(rot + 2.094) * r, y + Math.sin(rot + 2.094) * r);
    ctx.lineTo(x + Math.cos(rot + 4.188) * r, y + Math.sin(rot + 4.188) * r);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255," + alpha.toFixed(3) + ")";
    ctx.fill();
  }

  function render() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    /* 穹顶中心冷光 + 边缘自然衰减 */
    var g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.15);
    g1.addColorStop(0, "rgba(120,170,200,0.10)");
    g1.addColorStop(0.45, "rgba(40,70,95,0.045)");
    g1.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    var sweepAng = (t * 0.00018) % (Math.PI * 2);
    var FOCAL = Math.PI * 0.55;

    /* 每环的亮度先算一次，三种描边复用 */
    var glowOf = [];
    for (var i0 = 0; i0 < nodes.length; i0++) {
      var ringL = nodes[i0], gmax = 0;
      for (var s = 0; s < 8; s++) {
        var smp = ringL[(s * Math.floor(ringL.length / 8)) % ringL.length];
        var gv = 1 - angDist(smp.th, sweepAng) / FOCAL;
        if (gv > gmax) gmax = gv;
      }
      glowOf.push(gmax < 0 ? 0 : gmax);
    }

    for (var pass = 0; pass < 3; pass++) {
      for (var i = 0; i < nodes.length; i++) {
        var ring = nodes[i];
        var glow = glowOf[i];
        var outer = i / RINGS;

        ctx.beginPath();
        var nxt = nodes[i + 1];
        if (nxt) {
          /* 三角带：本环 j/j+1 与外环 j/j+1 组成两个三角面 */
          for (var j = 0; j < ring.length; j++) {
            var jj = (j + 1) % ring.length;
            var a = ring[j], b = ring[jj];
            var c = nxt[j], e = nxt[jj];
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.closePath();
            ctx.moveTo(b.x, b.y); ctx.lineTo(e.x, e.y); ctx.lineTo(c.x, c.y); ctx.closePath();
          }
        } else {
          for (var j3 = 0; j3 <= ring.length; j3++) {
            var n3 = ring[j3 % ring.length];
            if (j3 === 0) ctx.moveTo(n3.x, n3.y); else ctx.lineTo(n3.x, n3.y);
          }
        }

        if (pass === 0) {
          ctx.lineWidth = 2.8;
          ctx.strokeStyle = "rgba(255,255,255," + (0.008 + glow * 0.06).toFixed(3) + ")";
          ctx.stroke();
        } else if (pass === 1) {
          ctx.lineWidth = 1;
          ctx.strokeStyle = "rgba(255,255,255," + (0.014 + glow * 0.13 + outer * 0.008).toFixed(3) + ")";
          ctx.stroke();
        } else if (glow > 0.42) {
          ctx.lineWidth = 1;
          ctx.save();
          ctx.translate(-1.1, 0);
          ctx.strokeStyle = "rgba(90,220,255," + (glow * 0.18).toFixed(3) + ")";
          ctx.stroke();
          ctx.restore();
          ctx.save();
          ctx.translate(1.1, 0);
          ctx.strokeStyle = "rgba(255,90,120," + (glow * 0.14).toFixed(3) + ")";
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    /* 顶点小三角装饰 */
    for (var k = 0; k < deco.length; k++) {
      var d = deco[k];
      var ring2 = nodes[d.ring];
      if (!ring2) continue;
      var p = ring2[d.seg];
      if (!p) continue;
      var gw = 1 - angDist(p.th, sweepAng) / FOCAL;
      if (gw < 0) gw = 0;
      tri(p.x, p.y, d.size, d.rot + t * 0.00005, Math.min(0.8, d.a + gw * 0.35));
    }
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
  if (!reduce) requestAnimationFrame(draw);
})();
