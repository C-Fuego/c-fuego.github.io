// 状态条时钟、首屏 UPTIME、接缝带滚动
(() => {
  const clock = document.querySelector('[data-clock]');
  let timer = null;

  const pad = (n) => String(n).padStart(2, '0');

  const tick = () => {
    if (!clock) return;
    const d = new Date();
    clock.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  };

  tick();
  timer = setInterval(tick, 1000);
  window.addEventListener('pagehide', () => clearInterval(timer));

  // 首屏 UPTIME：从打开页面开始计
  const uptime = document.querySelector('[data-uptime]');
  if (uptime) {
    const start = Date.now();
    const upd = () => {
      const s = Math.floor((Date.now() - start) / 1000);
      uptime.textContent = pad(Math.floor(s / 60)) + ':' + pad(s % 60);
    };
    upd();
    setInterval(upd, 1000);
  }

  // 接缝带：平滑滚到日志区
  const seam = document.querySelector('[data-seam]');
  const target = document.querySelector('#log');
  if (seam && target) {
    seam.addEventListener('click', (e) => {
      e.preventDefault();
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  }
})();
