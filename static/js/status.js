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

    const scrollTop = () => {
      const el = document.scrollingElement || document.documentElement;
      return el.scrollTop || window.scrollY || 0;
    };

    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 40 ? Math.min(1, Math.max(0, scrollTop() / max)) : 1;
      const lit = Math.round(ratio * N);
      for (let i = 0; i < N; i++) ticks[i].classList.toggle('is-on', i < lit);
      num.textContent = Math.round(ratio * 100);
    };

    // 事件 + rAF 双通道：有些环境（headless、内嵌 webview）滚动时不派发 scroll
    window.addEventListener('scroll', update, { passive: true });
    document.addEventListener('scroll', update, { passive: true, capture: true });
    window.addEventListener('resize', update);

    let lastTop = -1;
    const watch = () => {
      const top = scrollTop();
      if (top !== lastTop) {
        lastTop = top;
        update();
      }
    };
    // rAF 在后台/隐藏标签会被挂起，setInterval 不会；两条都留，谁活着谁干活
    const rafLoop = () => { watch(); requestAnimationFrame(rafLoop); };
    requestAnimationFrame(rafLoop);
    setInterval(watch, 200);
    update();
  }

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
      const timer = setInterval(() => {
        if (near()) {
          cut.classList.add('is-cut');
          clearInterval(timer);
        }
      }, 200);
    }
  }

  // 面板指示器：24 根刻度环
  const pulse = document.querySelector('[data-pulse]');
  if (pulse) {
    const g = pulse.querySelector('[data-pulse-ticks]');
    const NS = 'http://www.w3.org/2000/svg';
    const N = 24;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      const long = i % 6 === 0;
      const r1 = long ? 11 : 13;
      const l = document.createElementNS(NS, 'line');
      l.setAttribute('x1', (20 + Math.cos(a) * r1).toFixed(2));
      l.setAttribute('y1', (20 + Math.sin(a) * r1).toFixed(2));
      l.setAttribute('x2', (20 + Math.cos(a) * 17).toFixed(2));
      l.setAttribute('y2', (20 + Math.sin(a) * 17).toFixed(2));
      l.setAttribute('class', 'tick' + (long ? ' is-long' : ''));
      l.style.setProperty('--i', i);
      g.appendChild(l);
    }
  }

  // 满屏黄闪切：滚到日志区时开一枪，只开一次
  const flash = document.querySelector('[data-flash]');
  const logSec = document.querySelector('#log');
  if (flash && logSec) {
    let fired = false;
    const check = () => {
      if (fired) return;
      const r = logSec.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.86 && r.bottom > 0) {
        fired = true;
        flash.classList.add('is-firing');
        setTimeout(() => flash.classList.remove('is-firing'), 700);
      }
    };
    setInterval(check, 200);
    check();
  }

  // 过场：竖线依次落下 → 圆环扩散 → 横扫 → 墨色灌满，然后导航
  const vt = document.querySelector('[data-vt]');
  if (vt) {
    // 生成线条：36 根竖线 + 16 根横线
    const bars = vt.querySelector('.vt-bars');
    const rows = vt.querySelector('.vt-rows');
    if (bars && !bars.children.length) {
      for (let i = 0; i < 36; i++) {
        const el = document.createElement('i');
        el.style.setProperty('--i', i);
        bars.appendChild(el);
      }
    }
    if (rows && !rows.children.length) {
      for (let i = 0; i < 16; i++) {
        const el = document.createElement('i');
        el.style.setProperty('--i', i);
        rows.appendChild(el);
      }
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
      if (a.dataset.seam !== undefined) return;   // 接缝带是页内滚动
      if (url.href === location.href) return;

      if (reduce) return;   // 减少动态效果：直接跳

      e.preventDefault();
      vt.classList.add('is-on', 'is-leaving');
      try { sessionStorage.setItem('vt-go', '1'); } catch (err) {}
      setTimeout(() => { location.href = url.href; }, 380);
    });
  }
})();
