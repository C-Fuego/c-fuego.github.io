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

  /* ---------- 阅读进度弧 ---------- */
  const arc = document.querySelector('[data-read-arc]');
  if (arc) {
    const LEN = 119.4;
    const update = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const p = max > 40 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 1;
      arc.style.strokeDashoffset = (LEN * (1 - p)).toFixed(1);
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
})();
