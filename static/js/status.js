// 状态条时钟、页底斜线、换页过场
(() => {
  const clock = document.querySelector('[data-clock]');
  let timer = null;

  const pad = (n) => String(n).padStart(2, '0');

  const tick = () => {
    if (!clock) return;
    const d = new Date();
    clock.textContent =
      d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  };

  // 时钟上挂完整时区，悬停可见；不占顶栏宽度
  if (clock) {
    try {
      var zone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      var parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(new Date());
      var name = '';
      for (var i = 0; i < parts.length; i++) if (parts[i].type === 'timeZoneName') name = parts[i].value;
      clock.title = zone + (name ? '（' + name + '）' : '');
    } catch (e) {}
  }

  tick();
  timer = setInterval(tick, 1000);
  window.addEventListener('pagehide', () => clearInterval(timer));

  // 页底斜线：进入视口才划过去（IO 在隐藏标签页不触发，用轮询兜底）
  const cut = document.querySelector('[data-cut]');
  if (cut) {
    const near = () => {
      const r = cut.getBoundingClientRect();
      return r.top < window.innerHeight * 0.92 && r.bottom > 0;
    };
    if (near()) {
      cut.classList.add('is-cut');
    } else {
      const poll = setInterval(() => {
        if (near()) {
          cut.classList.add('is-cut');
          clearInterval(poll);
        }
      }, 200);
    }
  }

  // 过场：45° 斜线网格从点击处铺满 → 跳转 → 新页收回
  const hatch = document.querySelector('[data-hatch]');
  if (hatch) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      if (a.target && a.target !== '_self') return;
      if (a.hasAttribute('download')) return;

      let url;
      try { url = new URL(a.href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.hash) return;
      if (url.href === location.href) return;
      if (reduceMotion) return;

      e.preventDefault();
      hatch.style.setProperty('--hx', (e.clientX / innerWidth * 100).toFixed(1) + '%');
      hatch.style.setProperty('--hy', (e.clientY / innerHeight * 100).toFixed(1) + '%');
      hatch.classList.add('is-on', 'is-covering');
      try { sessionStorage.setItem('hatch-go', '1'); } catch (err) {}
      setTimeout(() => { location.href = url.href; }, 320);
    });
  }
})();
