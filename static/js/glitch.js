/* 崩坏模式：不是一次性的闪，而是一段”持续故障期”
   进入方式：每次打开页面掷骰子，1% 概率进入，持续 60 秒
   期间打开站内任何页面都还在坏（状态存在 localStorage，带过期时间）
   表现形式：扫描线/色带/RGB 分离常驻，文字与布局按 1-2 秒脉冲反复崩坏
   验证：localStorage.setItem("ig.glitchUntil", Date.now()+60000) 后刷新 */
(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var KEY = "ig.glitchUntil";
  var DURATION = 60000;        /* 一次故障期 60 秒 */
  var CHANCE = 0.01;           /* 每次进页面 1% 概率进入 */

  var GLYPHS = "▓░▒█▚▞▙▟▛■□◆◇▲△▼▽0１01#%&*@≠≡¤¦§¨©ª«¬®¯°±²³µ";
  var layer = null;
  var bands = [];

  /* ---------- 状态 ---------- */
  var until = 0;
  try { until = parseInt(localStorage.getItem(KEY) || "0", 10) || 0; } catch (e) {}
  var now = Date.now();

  if (until > now) {
    begin(until - now);
  } else if (Math.random() < CHANCE) {
    var endAt = now + DURATION;
    try { localStorage.setItem(KEY, String(endAt)); } catch (e) {}
    begin(DURATION);
  }

  /* ---------- 实现 ---------- */

  function ensureLayer() {
    if (layer) return;
    layer = document.createElement("div");
    layer.className = "glitch-layer";

    var scan = document.createElement("div");
    scan.className = "glitch-scan";
    layer.appendChild(scan);

    for (var i = 0; i < 10; i++) {
      var b = document.createElement("div");
      b.className = "glitch-band";
      layer.appendChild(b);
      bands.push(b);
    }
    document.body.appendChild(layer);
  }

  function gibberish(len) {
    var s = "";
    for (var i = 0; i < len; i++) s += GLYPHS.charAt((Math.random() * GLYPHS.length) | 0);
    return s;
  }

  function corruptText() {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var nodes = [], n, guard = 0;
    while ((n = walker.nextNode()) && guard < 800) {
      guard++;
      var v = n.nodeValue;
      if (!v || v.trim().length < 2) continue;
      var p = n.parentElement;
      if (!p || p.closest(".glitch-layer, script, style, canvas, .search")) continue;
      nodes.push(n);
    }

    var changed = [];
    for (var i = 0; i < nodes.length; i++) {
      if (Math.random() > 0.85) continue;
      var t = nodes[i], orig = t.nodeValue, out;
      if (Math.random() < 0.3) {
        out = gibberish(Math.max(1, Math.round(orig.replace(/\s/g, "").length * (0.4 + Math.random()))));
      } else {
        out = "";
        for (var k = 0; k < orig.length; k++) {
          var ch = orig.charAt(k);
          out += (/\s/.test(ch) || Math.random() > 0.82)
            ? ch : GLYPHS.charAt((Math.random() * GLYPHS.length) | 0);
        }
      }
      t.nodeValue = out;
      changed.push([t, orig]);
    }
    return function () {
      for (var j = 0; j < changed.length; j++) changed[j][0].nodeValue = changed[j][1];
    };
  }

  function breakLayout() {
    var main = document.querySelector("main");
    if (!main) return function () {};
    var saved = [], kids = main.children;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      if (el.offsetHeight < 6) continue;
      saved.push([el, el.style.transform, el.style.filter, el.style.opacity]);
      el.style.transition = "none";
      el.style.transform =
        "translate3d(" + ((Math.random() - 0.5) * 170).toFixed(1) + "px," +
        ((Math.random() - 0.5) * 110).toFixed(1) + "px,0) " +
        "rotate(" + ((Math.random() - 0.5) * 14).toFixed(2) + "deg) " +
        "skewX(" + ((Math.random() - 0.5) * 16).toFixed(2) + "deg) " +
        "scale(" + (0.88 + Math.random() * 0.26).toFixed(3) + ")";
      el.style.filter =
        "hue-rotate(" + ((Math.random() - 0.5) * 110).toFixed(0) + "deg) " +
        "contrast(" + (1 + Math.random() * 0.7).toFixed(2) + ") " +
        "saturate(" + (1 + Math.random() * 2.2).toFixed(2) + ")";
      if (Math.random() < 0.28) el.style.opacity = (0.35 + Math.random() * 0.4).toFixed(2);
    }
    return function () {
      for (var j = 0; j < saved.length; j++) {
        saved[j][0].style.transform = saved[j][1] || "";
        saved[j][0].style.filter = saved[j][2] || "";
        saved[j][0].style.opacity = saved[j][3] || "";
      }
    };
  }

  function rollBands() {
    for (var i = 0; i < bands.length; i++) {
      var b = bands[i];
      b.style.top = (Math.random() * 98).toFixed(1) + "%";
      b.style.height = (10 + Math.random() * 100).toFixed(0) + "px";
      b.style.opacity = (0.10 + Math.random() * 0.40).toFixed(3);
      b.style.transform = "translateX(" + ((Math.random() - 0.5) * 80).toFixed(1) + "px)";
      var r = Math.random();
      b.style.background = r < 0.34 ? "rgba(255,42,88,0.48)"
        : r < 0.62 ? "rgba(120,220,255,0.40)"
        : "rgba(0,0,0,0.90)";
    }
  }

  function begin(remain) {
    ensureLayer();
    var stopAt = Date.now() + remain;

    /* 常驻层：扫描线 / RGB 分离 / 周期性白闪 一直在 */
    document.body.classList.add("is-glitching", "is-broken");

    var restoreText = function () {};
    var restoreLayout = function () {};

    function pulse() {
      if (Date.now() >= stopAt) { finish(); return; }

      restoreText();
      restoreLayout();

      rollBands();
      restoreText = corruptText();
      restoreLayout = breakLayout();

      /* 崩 1.0-2.2s → 闪一下正常 0.12-0.32s → 继续崩 */
      var up = 1000 + Math.random() * 1200;
      var down = 120 + Math.random() * 200;

      setTimeout(function () {
        restoreText();
        restoreLayout();
        setTimeout(pulse, down);
      }, up);
    }

    function finish() {
      restoreText();
      restoreLayout();
      document.body.classList.remove("is-glitching", "is-broken");
      try {
        if (parseInt(localStorage.getItem(KEY) || "0", 10) <= Date.now()) {
          localStorage.removeItem(KEY);
        }
      } catch (e) {}
    }

    pulse();
  }
})();
