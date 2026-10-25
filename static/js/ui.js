/* 交互层：阅读进度 / 目录跟随 / 灯箱 / 回顶 / 代码复制 / 站内搜索
   全部原生 JS，无依赖 */
(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 顶栏时钟 ---------- */
  var clock = document.getElementById("clock");
  if (clock) {
    var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
    var tick = function () {
      var d = new Date();
      clock.textContent = pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- 阅读进度（判定线形态） ---------- */
  var bar = $(".read-bar");
  var note = $(".read-note");
  if (bar) {
    var onScroll = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, h.scrollTop / max)) : 0;
      bar.style.transform = "scaleX(" + p + ")";
      if (note) note.style.left = (p * 100) + "%";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
  }

  /* ---------- 目录跟随 ---------- */
  var tocLinks = $$(".toc nav a");
  if (tocLinks.length) {
    var map = {};
    tocLinks.forEach(function (a) {
      var id = decodeURIComponent((a.getAttribute("href") || "").replace(/^#/, ""));
      if (id) map[id] = a;
    });
    var targets = Object.keys(map)
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);

    if ("IntersectionObserver" in window && targets.length) {
      var visible = {};
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          visible[e.target.id] = e.isIntersecting ? e.intersectionRatio : 0;
        });
        var best = null, bestVal = 0;
        Object.keys(visible).forEach(function (id) {
          if (visible[id] > bestVal) { bestVal = visible[id]; best = id; }
        });
        if (best) {
          tocLinks.forEach(function (a) { a.classList.remove("is-active"); });
          if (map[best]) map[best].classList.add("is-active");
        }
      }, { rootMargin: "-88px 0px -70% 0px", threshold: [0, 0.2, 0.6, 1] });
      targets.forEach(function (t) { io.observe(t); });
    }
  }

  /* ---------- 代码块：包一层 + 复制按钮 ---------- */
  $$(".prose pre").forEach(function (pre) {
    if (pre.parentElement.classList.contains("code-wrap")) return;
    var wrap = document.createElement("div");
    wrap.className = "code-wrap";
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "code-copy";
    btn.textContent = "COPY";
    btn.addEventListener("click", function () {
      var code = pre.querySelector("code") || pre;
      var text = code.innerText;
      var done = function () {
        btn.textContent = "OK";
        btn.classList.add("is-done");
        setTimeout(function () {
          btn.textContent = "COPY";
          btn.classList.remove("is-done");
        }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {});
      } else {
        var ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (e) {}
        document.body.removeChild(ta);
      }
    });
    wrap.appendChild(btn);
  });

  /* ---------- 图片灯箱 ---------- */
  var lb = null;
  function closeLb() {
    if (!lb) return;
    lb.classList.remove("is-open");
    document.body.style.overflow = "";
  }
  $$(".prose img").forEach(function (img) {
    img.classList.add("zoomable");
    img.addEventListener("click", function () {
      if (!lb) {
        lb = document.createElement("div");
        lb.className = "lightbox";
        lb.innerHTML = '<img alt="">';
        lb.addEventListener("click", closeLb);
        document.body.appendChild(lb);
      }
      lb.querySelector("img").src = img.currentSrc || img.src;
      lb.querySelector("img").alt = img.alt || "";
      lb.classList.add("is-open");
      document.body.style.overflow = "hidden";
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeLb(); closeSearch(); }
  });

  /* ---------- 回到顶部 ---------- */
  var toTop = $(".to-top");
  if (toTop) {
    var toggle = function () {
      toTop.classList.toggle("is-on", window.scrollY > 720);
    };
    window.addEventListener("scroll", toggle, { passive: true });
    toggle();
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
  }

  /* ---------- 站内搜索 ---------- */
  var overlay = $(".search");
  if (!overlay) return;

  var input = $(".search-input", overlay);
  var list = $(".search-results", overlay);
  var hint = $(".search-hint", overlay);
  var data = null;
  var loading = false;

  function openSearch() {
    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
    input.value = "";
    list.innerHTML = "";
    hint.textContent = data ? "输入关键词：标题、摘要、正文都会匹配" : "加载索引…";
    setTimeout(function () { input.focus(); }, 40);
    if (!data && !loading) {
      loading = true;
      fetch(overlay.dataset.json || "/index.json")
        .then(function (r) { return r.json(); })
        .then(function (d) {
          data = d;
          loading = false;
          hint.textContent = "输入关键词：标题、摘要、正文都会匹配";
          if (input.value.trim()) run();
        })
        .catch(function () {
          loading = false;
          hint.textContent = "索引加载失败";
        });
    }
  }
  function closeSearch() {
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  $$("[data-search-open]").forEach(function (el) {
    el.addEventListener("click", function (e) { e.preventDefault(); openSearch(); });
  });
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay || e.target.classList.contains("search-close")) closeSearch();
  });

  function esc(s) {
    return s.replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function run() {
    var q = input.value.trim().toLowerCase();
    if (!data) {
      if (loading) hint.textContent = "加载索引…";
      return;
    }
    if (!q) { list.innerHTML = ""; hint.textContent = "输入关键词：标题、摘要、正文都会匹配"; return; }
    var hits = data.filter(function (p) {
      return (p.t + " " + (p.s || "") + " " + (p.c || "")).toLowerCase().indexOf(q) >= 0;
    }).slice(0, 12);

    hint.textContent = hits.length ? hits.length + " 条命中" : "没有匹配的条目";
    list.innerHTML = hits.map(function (p, i) {
      return '<a class="search-hit" href="' + p.u + '">' +
        '<span class="search-hit-idx">' + String(i + 1).padStart(3, "0") + '</span>' +
        '<span class="search-hit-main"><span class="search-hit-title">' + esc(p.t) + '</span>' +
        '<span class="search-hit-desc">' + esc((p.s || p.c || "").slice(0, 96)) + '</span></span>' +
        '<span class="search-hit-date">' + (p.d || "") + '</span></a>';
    }).join("");
  }

  input.addEventListener("input", run);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      var first = $(".search-hit", list);
      if (first) window.location.href = first.getAttribute("href");
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
      e.preventDefault();
      if (overlay.classList.contains("is-open")) closeSearch(); else openSearch();
    }
  });
})();
