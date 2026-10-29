// 站内功能：搜索、代码复制、目录跟随。样式在 css/main.css，部件在 ef/endfield.css。
(() => {
  'use strict';

  /* ---------- 搜索 ---------- */
  const overlay = document.querySelector('[data-search]');
  const input = overlay && overlay.querySelector('.site-search-input');
  const results = overlay && overlay.querySelector('[data-search-results]');
  const hint = overlay && overlay.querySelector('[data-search-hint]');
  let index = null;
  let loading = false;
  let openers = [];

  const jsonURL = document.body.dataset.index || 'index.json';

  function loadIndex() {
    if (index || loading) return Promise.resolve(index);
    loading = true;
    return fetch(jsonURL)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        index = d;
        loading = false;
        return d;
      })
      .catch(() => {
        loading = false;
        index = [];
        return [];
      });
  }

  function openSearch() {
    if (!overlay) return;
    openers = [document.activeElement].filter(Boolean);
    overlay.hidden = false;
    overlay.classList.add('is-open');
    document.body.classList.add('is-locked');
    requestAnimationFrame(() => input.focus());
    loadIndex().then(() => {
      if (input.value.trim()) run();
    });
  }

  function closeSearch() {
    if (!overlay) return;
    overlay.classList.remove('is-open');
    overlay.hidden = true;
    document.body.classList.remove('is-locked');
    if (openers[0]) openers[0].focus();
    openers = [];
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function run() {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      results.innerHTML = '';
      hint.textContent = '按标题、标签、正文匹配';
      return;
    }
    const hits = (index || [])
      .map((item) => {
        const hay = [item.title, item.summary, (item.tags || []).join(' '), item.body].join(' ').toLowerCase();
        const at = hay.indexOf(q);
        return at < 0 ? null : { item, at, count: hay.split(q).length - 1 };
      })
      .filter(Boolean)
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    hint.textContent = hits.length ? `找到 ${hits.length} 条` : '没有匹配的条目';
    results.innerHTML = hits
      .map(
        (h) => `<a class="search-hit" href="${h.item.url}">
          <span class="search-hit-no">${escapeHTML(h.item.no || '--')}</span>
          <span><span class="search-hit-title">${escapeHTML(h.item.title)}</span>
          <span class="search-hit-desc">${escapeHTML(h.item.summary || '')}</span></span>
          <span class="search-hit-date">${escapeHTML(h.item.date || '')}</span>
        </a>`
      )
      .join('');
  }

  if (overlay) {
    document.querySelectorAll('[data-search-open]').forEach((b) => b.addEventListener('click', openSearch));
    overlay.querySelectorAll('[data-search-close]').forEach((b) => b.addEventListener('click', closeSearch));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeSearch();
    });
    input.addEventListener('input', () => {
      loadIndex().then(run);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeSearch();
      if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && !overlay.classList.contains('is-open')) {
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        e.preventDefault();
        openSearch();
      }
    });
  }

  /* ---------- 代码块复制 ---------- */
  document.querySelectorAll('.ef-prose pre').forEach((pre) => {
    const wrap = document.createElement('div');
    wrap.className = 'code-wrap';
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'code-copy';
    btn.textContent = 'COPY';
    btn.addEventListener('click', () => {
      const text = pre.querySelector('code') ? pre.querySelector('code').innerText : pre.innerText;
      const done = () => {
        btn.textContent = 'OK';
        btn.classList.add('is-done');
        setTimeout(() => {
          btn.textContent = 'COPY';
          btn.classList.remove('is-done');
        }, 1200);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, done);
      else done();
    });
    wrap.appendChild(btn);
  });

  /* ---------- 目录跟随 ---------- */
  const toc = document.querySelector('.post-toc');
  if (toc) {
    const links = [...toc.querySelectorAll('a[href^="#"]')];
    const heads = links
      .map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))))
      .filter(Boolean);
    if (heads.length) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            const id = e.target.id;
            links.forEach((a) => {
              const on = decodeURIComponent(a.hash.slice(1)) === id;
              a.classList.toggle('is-active', on);
              if (on) a.setAttribute('aria-current', 'true');
              else a.removeAttribute('aria-current');
            });
          });
        },
        { rootMargin: '0px 0px -70% 0px', threshold: 0 }
      );
      heads.forEach((h) => io.observe(h));
    }
  }

  /* ---------- 阅读进度：刻度圆（60 格，走过的刻度变黄） ---------- */
  const dial = document.querySelector('[data-read-dial]');
  if (dial) {
    const group = dial.querySelector('[data-dial-ticks]');
    const num = dial.querySelector('[data-dial-num]');
    const NS = 'http://www.w3.org/2000/svg';
    const N = 60;
    const ticks = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      const long = i % 5 === 0;
      const r1 = long ? 26 : 28.5;
      const r2 = 34;
      const l = document.createElementNS(NS, 'line');
      l.setAttribute('x1', (36 + Math.cos(a) * r1).toFixed(2));
      l.setAttribute('y1', (36 + Math.sin(a) * r1).toFixed(2));
      l.setAttribute('x2', (36 + Math.cos(a) * r2).toFixed(2));
      l.setAttribute('y2', (36 + Math.sin(a) * r2).toFixed(2));
      l.setAttribute('class', 'tick' + (long ? ' is-major' : ''));
      group.appendChild(l);
      ticks.push(l);
    }
    const updateDial = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const ratio = max > 40 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 1;
      const lit = Math.round(ratio * N);
      for (let i = 0; i < N; i++) ticks[i].classList.toggle('is-on', i < lit);
      num.textContent = Math.round(ratio * 100);
    };
    window.addEventListener('scroll', updateDial, { passive: true });
    window.addEventListener('resize', updateDial);
    updateDial();
  }
})();
