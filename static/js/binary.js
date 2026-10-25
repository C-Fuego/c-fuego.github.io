/* 二进制雨 + 时钟 + 载入 glitch
   纯前端，静态托管，无依赖 */
(function () {
  "use strict";

  /* ---------- 时钟 ---------- */
  var clock = document.getElementById("clock");
  function tick() {
    if (!clock) return;
    var d = new Date();
    var p = function (n) { return n < 10 ? "0" + n : "" + n; };
    clock.textContent = p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- 载入时一次 glitch ---------- */
  document.querySelectorAll(".glitch").forEach(function (el, i) {
    setTimeout(function () {
      el.classList.add("is-booting");
      setTimeout(function () { el.classList.remove("is-booting"); }, 1200);
    }, 260 + i * 180);
  });

  /* ---------- 二进制雨 ---------- */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  var canvas = document.getElementById("bits");
  if (!canvas) return;
  var ctx = canvas.getContext("2d", { alpha: true });

  var CELL = 14;          /* 逻辑字符格宽 */
  var FONT = 11;          /* 逻辑字号 */
  var scale = 1;          /* 设备像素比后的缩放 */
  var cols = 0, rows = 0;
  var drops = [];         /* 每列的头部行号 */
  var speeds = [];

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    /* 逻辑分辨率压到 1/dpr，再放大绘制，省 CPU */
    var w = Math.ceil(window.innerWidth / dpr);
    var h = Math.ceil(window.innerHeight / dpr);
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    scale = dpr;

    cols = Math.ceil(w / CELL);
    rows = Math.ceil(h / (CELL * 1.15));
    drops = new Array(cols);
    speeds = new Array(cols);
    for (var i = 0; i < cols; i++) {
      drops[i] = Math.random() * rows;
      speeds[i] = 0.28 + Math.random() * 0.75;
    }
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
  }

  var last = 0;
  var FRAME = 1000 / 24;  /* 24fps 足够，省电 */

  function draw(now) {
    requestAnimationFrame(draw);
    if (now - last < FRAME) return;
    last = now;

    /* 轻微拖尾：用半透明黑覆盖，而不是 clearRect */
    ctx.fillStyle = "rgba(0, 0, 0, 0.055)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = FONT + "px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textBaseline = "top";

    for (var c = 0; c < cols; c++) {
      var y = drops[c];
      var x = c * CELL;
      var ch = Math.random() > 0.5 ? "1" : "0";
      var py = y * CELL * 1.15;

      /* 头部字符亮，其余暗 */
      if (Math.random() > 0.985) {
        ctx.fillStyle = "rgba(53, 224, 255, 0.55)";
      } else if (Math.random() > 0.92) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
      } else {
        ctx.fillStyle = "rgba(53, 224, 255, 0.075)";
      }
      ctx.fillText(ch, x, py);

      drops[c] += speeds[c];
      if (py > canvas.height && Math.random() > 0.975) {
        drops[c] = -Math.random() * 8;
        speeds[c] = 0.28 + Math.random() * 0.75;
      }
    }
  }

  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(resize, 200);
  });

  resize();
  requestAnimationFrame(draw);
})();
