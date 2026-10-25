/* 全站故障特效：VHS 扫描线 + RGB 分离 + 块状色带 + 文本损坏
   触发概率极低（平均 2-4 分钟一次），单次持续 300-800ms。
   验证用：#glitch 打开页面会立刻来一次。 */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  var layer = null;
  var bands = [];
  var GLYPHS = "▓░▒█▚▞▙01#%&*@≠≡";

  function build() {
    layer = document.createElement("div");
    layer.className = "glitch-layer";

    var scan = document.createElement("div");
    scan.className = "glitch-scan";
    layer.appendChild(scan);

    for (var i = 0; i < 4; i++) {
      var b = document.createElement("div");
      b.className = "glitch-band";
      layer.appendChild(b);
      bands.push(b);
    }
    document.body.appendChild(layer);
  }

  /* 文本字符损坏：只动 28% 的文本节点、每个节点 18% 的字符，90-230ms 后还原 */
  function corruptText() {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    var n, guard = 0;
    while ((n = walker.nextNode()) && guard < 400) {
      guard++;
      var v = n.nodeValue;
      if (!v || v.trim().length < 4) continue;
      var p = n.parentElement;
      if (!p) continue;
      if (p.closest(".glitch-layer, script, style, canvas, .search")) continue;
      nodes.push(n);
    }

    var changed = [];
    for (var i = 0; i < nodes.length; i++) {
      if (Math.random() > 0.28) continue;
      var t = nodes[i];
      var orig = t.nodeValue;
      var out = "";
      for (var k = 0; k < orig.length; k++) {
        var ch = orig.charAt(k);
        out += (/\s/.test(ch) || Math.random() > 0.18)
          ? ch
          : GLYPHS.charAt((Math.random() * GLYPHS.length) | 0);
      }
      t.nodeValue = out;
      changed.push([t, orig]);
    }

    return function restore() {
      for (var j = 0; j < changed.length; j++) changed[j][0].nodeValue = changed[j][1];
    };
  }

  function run() {
    if (!layer) build();

    for (var i = 0; i < bands.length; i++) {
      var b = bands[i];
      b.style.top = (Math.random() * 96).toFixed(1) + "%";
      b.style.height = (6 + Math.random() * 46).toFixed(0) + "px";
      b.style.opacity = (0.06 + Math.random() * 0.20).toFixed(3);
      b.style.transform = "translateX(" + ((Math.random() - 0.5) * 34).toFixed(1) + "px)";
      b.style.background = Math.random() < 0.32
        ? "rgba(255,42,88,0.42)"
        : "rgba(120,220,255,0.30)";
    }

    document.body.classList.add("is-glitching");
    var restore = corruptText();

    setTimeout(restore, 90 + Math.random() * 140);

    var dur = 300 + Math.random() * 480;
    setTimeout(function () {
      document.body.classList.remove("is-glitching");
      /* 抖动结束后再兜一次，防止极端情况下有文本没还原 */
      restore();
    }, dur);
  }

  /* ------- 触发节奏：平均 2-4 分钟一次 ------- */
  function schedule() {
    var delay = 60000 + Math.random() * 170000;
    setTimeout(function () {
      if (Math.random() < 0.55) run();
      schedule();
    }, delay);
  }

  if (location.hash === "#glitch") {
    setTimeout(run, 700);
  } else {
    setTimeout(function () {
      if (Math.random() < 0.5) run();
      schedule();
    }, 30000 + Math.random() * 60000);
  }
})();
