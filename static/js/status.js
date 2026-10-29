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

  // 阅读进度盘：等距投影的椭圆环，靠刻度长短和虚实表现纵深（伪 3D，不用 3D 变换）
  const dial = document.querySelector('[data-read-dial]');
  if (dial) {
    const group = dial.querySelector('[data-dial-ticks]');
    const num = dial.querySelector('[data-dial-num]');
    const NS = 'http://www.w3.org/2000/svg';
    const N = 60;
    const RX = 46;
    const RY = 19.5;          // 压扁 = 视线俯角约 25°
    const ticks = [];

    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      const major = i % 5 === 0;
      const far = Math.sin(a) < 0;            // 上半圈是"远端"
      const inner = major ? 0.74 : 0.84;
      const l = document.createElementNS(NS, 'line');
      l.setAttribute('x1', (50 + Math.cos(a) * RX * inner).toFixed(2));
      l.setAttribute('y1', (50 + Math.sin(a) * RY * inner).toFixed(2));
      l.setAttribute('x2', (50 + Math.cos(a) * RX).toFixed(2));
      l.setAttribute('y2', (50 + Math.sin(a) * RY).toFixed(2));
      l.setAttribute('class', 'tick' + (major ? ' is-major' : '') + (far ? ' is-far' : ''));
      group.appendChild(l);
      ticks.push(l);
    }

    // 两条椭圆环：外圈实线，内圈虚线（背面）
    const ringOut = document.createElementNS(NS, 'ellipse');
    ringOut.setAttribute('cx', 50); ringOut.setAttribute('cy', 50);
    ringOut.setAttribute('rx', RX + 1.5); ringOut.setAttribute('ry', RY + 0.6);
    ringOut.setAttribute('class', 'dial-ring');
    group.appendChild(ringOut);

    const ringIn = document.createElementNS(NS, 'ellipse');
    ringIn.setAttribute('cx', 50); ringIn.setAttribute('cy', 50);
    ringIn.setAttribute('rx', RX * 0.66); ringIn.setAttribute('ry', RY * 0.66);
    ringIn.setAttribute('class', 'dial-ring is-dashed');
    group.appendChild(ringIn);

    const update = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const ratio = max > 40 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 1;
      const lit = Math.round(ratio * N);
      for (let i = 0; i < N; i++) ticks[i].classList.toggle('is-on', i < lit);
      num.textContent = Math.round(ratio * 100);
    };

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
})();
