// 工业图形：参照 rahoo.online/design-tool 的 18 种图形模板，
// 用 SVG 重画其中常用的几种。颜色走 currentColor，透明度交给 CSS。
//
// 两个必须遵守的约束：
//   1. 线条一律 vector-effect="non-scaling-stroke"，否则在 100 单位画布放大到几百像素后
//      线宽会跟着放大成 8px 的粗条。
//   2. 宽扁的图形（HUD 尺、条形码）用自己的 viewBox，不要用正方形画布拉伸，
//      否则纵向刻度会被压成 1px。
(() => {
  const NS = 'http://www.w3.org/2000/svg';

  const el = (tag, a) => {
    const e = document.createElementNS(NS, tag);
    for (const k in a) e.setAttribute(k, a[k]);
    return e;
  };
  const stroke = (tag, a) => el(tag, Object.assign({ stroke: 'currentColor', 'vector-effect': 'non-scaling-stroke', fill: 'none' }, a));

  const shapes = {
    /* 同心圆：一圈圈圆环，每 3 圈加粗 */
    concentric: {
      vb: '0 0 100 100',
      draw(svg, o) {
        const n = o.n || 9;
        for (let i = 1; i <= n; i++) {
          svg.appendChild(stroke('circle', { cx: 50, cy: 50, r: ((i / n) * 47).toFixed(2), 'stroke-width': i % 3 === 0 ? 1 : 0.6 }));
        }
      },
    },

    /* 刻度圆：60 根刻度，每 5 根加长 */
    scaleCircle: {
      vb: '0 0 100 100',
      draw(svg, o) {
        const n = o.n || 60;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 - Math.PI / 2;
          const major = i % 5 === 0;
          svg.appendChild(stroke('line', {
            x1: (50 + Math.cos(a) * (major ? 33 : 37)).toFixed(2), y1: (50 + Math.sin(a) * (major ? 33 : 37)).toFixed(2),
            x2: (50 + Math.cos(a) * 46).toFixed(2), y2: (50 + Math.sin(a) * 46).toFixed(2),
            'stroke-width': major ? 1.4 : 0.8,
          }));
        }
      },
    },

    /* HUD 尺：一条通宽基准线 + 主次刻度 + 两端竖挡 */
    hudLines: {
      vb: '0 0 400 24',
      draw(svg, o) {
        const n = o.n || 48;
        const y = 12;
        svg.appendChild(stroke('line', { x1: 0, y1: y, x2: 400, y2: y, 'stroke-width': 1 }));
        for (let i = 0; i <= n; i++) {
          const x = (i / n) * 400;
          const major = i % 4 === 0;
          svg.appendChild(stroke('line', {
            x1: x.toFixed(2), y1: y - (major ? 9 : 2.6), x2: x.toFixed(2), y2: y + (major ? 9 : 2.6),
            'stroke-width': major ? 1.6 : 0.8,
          }));
        }
        svg.appendChild(stroke('line', { x1: 0.6, y1: 1, x2: 0.6, y2: 23, 'stroke-width': 1.6 }));
        svg.appendChild(stroke('line', { x1: 399.4, y1: 1, x2: 399.4, y2: 23, 'stroke-width': 1.6 }));
      },
    },

    /* 条形码：宽窄不等的竖条，确定性伪随机 */
    barcode: {
      vb: '0 0 200 60',
      draw(svg, o) {
        let seed = o.seed || 17;
        const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
        let x = 1;
        while (x < 199) {
          const w = rnd() < 0.55 ? 0.8 : 2;
          const tall = rnd() < 0.2;
          svg.appendChild(el('rect', { x: x.toFixed(2), y: tall ? 0 : 12, width: w, height: tall ? 60 : 38, fill: 'currentColor' }));
          x += w + (rnd() < 0.5 ? 0.9 : 1.9);
        }
      },
    },

    /* 点阵：规则网格点 */
    dotMatrix: {
      vb: '0 0 100 100',
      draw(svg, o) {
        const n = o.n || 16;
        const step = 100 / n;
        for (let i = 0; i <= n; i++) {
          for (let j = 0; j <= n; j++) {
            svg.appendChild(el('circle', { cx: (i * step).toFixed(2), cy: (j * step).toFixed(2), r: 0.45, fill: 'currentColor' }));
          }
        }
      },
    },

    /* 等高线：几条不交叉的波浪线 */
    contour: {
      vb: '0 0 100 100',
      draw(svg, o) {
        const lines = o.n || 7;
        for (let i = 0; i < lines; i++) {
          const baseY = 8 + (i / (lines - 1)) * 84;
          const amp = 5 + (i % 3) * 2.5;
          const phase = i * 0.9;
          let d = '';
          for (let x = 0; x <= 100; x += 4) {
            const y = baseY + Math.sin(x / 18 + phase) * amp + Math.sin(x / 7 + phase * 2) * (amp * 0.3);
            d += (x === 0 ? 'M' : 'L') + x + ' ' + y.toFixed(2) + ' ';
          }
          svg.appendChild(stroke('path', { d, 'stroke-width': 0.7 }));
        }
      },
    },

    /* 射线：从中心向外发散 */
    rays: {
      vb: '0 0 100 100',
      draw(svg, o) {
        const n = o.n || 48;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const long = i % 4 === 0;
          svg.appendChild(stroke('line', {
            x1: (50 + Math.cos(a) * (long ? 20 : 34)).toFixed(2), y1: (50 + Math.sin(a) * (long ? 20 : 34)).toFixed(2),
            x2: (50 + Math.cos(a) * 50).toFixed(2), y2: (50 + Math.sin(a) * 50).toFixed(2),
            'stroke-width': long ? 1.2 : 0.7,
          }));
        }
      },
    },

    /* 方形网格 */
    squareGrid: {
      vb: '0 0 100 100',
      draw(svg, o) {
        const n = o.n || 10;
        const step = 100 / n;
        for (let i = 0; i <= n; i++) {
          const major = i % 5 === 0;
          svg.appendChild(stroke('line', { x1: i * step, y1: 0, x2: i * step, y2: 100, 'stroke-width': major ? 1 : 0.6 }));
          svg.appendChild(stroke('line', { x1: 0, y1: i * step, x2: 100, y2: i * step, 'stroke-width': major ? 1 : 0.6 }));
        }
      },
    },

    /* 半调：越靠右点越大 */
    halftone: {
      vb: '0 0 100 100',
      draw(svg, o) {
        const n = o.n || 16;
        const step = 100 / n;
        for (let i = 0; i <= n; i++) {
          for (let j = 0; j <= n; j++) {
            svg.appendChild(el('circle', { cx: (i * step).toFixed(2), cy: (j * step).toFixed(2), r: (0.1 + (i / n) * 1.0).toFixed(2), fill: 'currentColor' }));
          }
        }
      },
    },

    /* 环形排列：一圈小方块，方向跟着切向转 */
    ringArray: {
      vb: '0 0 100 100',
      draw(svg, o) {
        const n = o.n || 36;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const s = i % 3 === 0 ? 1.4 : 0.7;
          svg.appendChild(el('rect', {
            x: (50 + Math.cos(a) * 38 - s / 2).toFixed(2),
            y: (50 + Math.sin(a) * 38 - s / 2).toFixed(2),
            width: s, height: s, fill: 'currentColor',
            transform: `rotate(${((a * 180) / Math.PI).toFixed(1)} 50 50)`,
          }));
        }
      },
    },

    /* 嵌套图形：一层层旋转的方形 */
    nestedPolygons: {
      vb: '0 0 100 100',
      draw(svg, o) {
        const n = o.n || 6;
        for (let i = 0; i < n; i++) {
          const s = 92 - i * 12;
          svg.appendChild(stroke('rect', {
            x: (50 - s / 2).toFixed(2), y: (50 - s / 2).toFixed(2), width: s, height: s,
            'stroke-width': 0.9, transform: `rotate(${i * 7} 50 50)`,
          }));
        }
      },
    },
  };

  document.querySelectorAll('[data-shape]').forEach((host) => {
    const def = shapes[host.dataset.shape];
    if (!def) return;
    let opts = {};
    try { opts = host.dataset.shapeOpts ? JSON.parse(host.dataset.shapeOpts) : {}; } catch (e) {}
    const svg = el('svg', {
      viewBox: def.vb,
      'aria-hidden': 'true',
      preserveAspectRatio: host.dataset.fit || 'xMidYMid meet',
    });
    def.draw(svg, opts);
    host.appendChild(svg);
  });
})();
