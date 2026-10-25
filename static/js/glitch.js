/* 全站崩溃特效：每次进页面掷一次骰子，1% 概率触发
   目标观感：页面“坏掉”——文字几乎全乱码、区块歪斜错位、色块遮挡、信号闪断。
   持续 1.4-2.6s 后完整复原。验证：#glitch */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  var layer = null;
  var bands = [];
  /* 汉字、方块、符号混着来，保证“读不出来” */
  var GLYPHS = "▓░▒█▚▞▙▟▛■□◆◇▲△▼▽0１01#%&*@≠≡¤¦§¨©ª«¬®¯°±²³µ";

  function build() {
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

  /* 文本损坏：95% 节点、85% 字符，另有 25% 概率整段换成纯乱码 */
  function corruptText() {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    var n, guard = 0;
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
      if (Math.random() > 0.95) continue;
      var t = nodes[i];
      var orig = t.nodeValue;
      var out;

      if (Math.random() < 0.25) {
        /* 整段变乱码，长度也随机（数字损坏的观感） */
        out = gibberish(Math.max(1, Math.round(orig.replace(/\s/g, "").length * (0.5 + Math.random()))));
      } else {
        out = "";
        for (var k = 0; k < orig.length; k++) {
          var ch = orig.charAt(k);
          out += (/\s/.test(ch) || Math.random() > 0.85)
            ? ch
            : GLYPHS.charAt((Math.random() * GLYPHS.length) | 0);
        }
      }
      t.nodeValue = out;
      changed.push([t, orig]);
    }

    return function restore() {
      for (var j = 0; j < changed.length; j++) changed[j][0].nodeValue = changed[j][1];
    };
  }

  /* 区块错位：大幅位移 + 旋转 + 缩放，制造布局崩坏 */
  function breakLayout() {
    var main = document.querySelector("main");
    if (!main) return function () {};
    var saved = [];
    var kids = main.children;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      if (el.offsetHeight < 6) continue;
      saved.push([el, el.style.transform, el.style.filter, el.style.opacity]);
      el.style.transition = "none";
      el.style.transform =
        "translate3d(" + ((Math.random() - 0.5) * 190).toFixed(1) + "px," +
        ((Math.random() - 0.5) * 120).toFixed(1) + "px,0) " +
        "rotate(" + ((Math.random() - 0.5) * 16).toFixed(2) + "deg) " +
        "skewX(" + ((Math.random() - 0.5) * 18).toFixed(2) + "deg) " +
        "scale(" + (0.86 + Math.random() * 0.3).toFixed(3) + ")";
      el.style.filter =
        "hue-rotate(" + ((Math.random() - 0.5) * 120).toFixed(0) + "deg) " +
        "contrast(" + (1 + Math.random() * 0.8).toFixed(2) + ") " +
        "saturate(" + (1 + Math.random() * 2.5).toFixed(2) + ")";
      if (Math.random() < 0.3) el.style.opacity = (0.35 + Math.random() * 0.4).toFixed(2);
    }
    return function () {
      for (var j = 0; j < saved.length; j++) {
        saved[j][0].style.transform = saved[j][1] || "";
        saved[j][0].style.filter = saved[j][2] || "";
        saved[j][0].style.opacity = saved[j][3] || "";
      }
    };
  }

  function run() {
    build();

    for (var i = 0; i < bands.length; i++) {
      var b = bands[i];
      b.style.top = (Math.random() * 98).toFixed(1) + "%";
      b.style.height = (10 + Math.random() * 110).toFixed(0) + "px";
      b.style.opacity = (0.12 + Math.random() * 0.45).toFixed(3);
      b.style.transform = "translateX(" + ((Math.random() - 0.5) * 90).toFixed(1) + "px)";
      var r = Math.random();
      b.style.background = r < 0.34
        ? "rgba(255,42,88,0.5)"          /* 红带 */
        : r < 0.62
          ? "rgba(120,220,255,0.42)"     /* 青带 */
          : "rgba(0,0,0,0.92)";          /* 黑色遮挡：数据缺失 */
    }

    document.body.classList.add("is-glitching", "is-broken");

    var restoreText = corruptText();
    var restoreLayout = breakLayout();

    /* 中途回一次文本，再继续坏，像信号恢复失败 */
    setTimeout(function () { /* 保持损坏，不做中途恢复 */ }, 0);

    var dur = 1400 + Math.random() * 1200;
    setTimeout(function () {
      restoreText();
      restoreLayout();
      document.body.classList.remove("is-glitching", "is-broken");
    }, dur);
  }

  if (location.hash === "#glitch") {
    setTimeout(run, 300);
  } else if (Math.random() < 0.01) {
    setTimeout(run, 400 + Math.random() * 1000);
  }
})();
