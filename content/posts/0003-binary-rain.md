---
title: "二进制雨的渲染成本"
date: 2026-10-25T22:12:00+08:00
tags: ["前端", "性能"]
summary: "一个每秒 24 帧的 canvas 背景，怎么在低端设备上也不掉帧。"
---

背景那层 0 和 1 是 canvas 画的。看着简单，做错会一直吃 CPU。

## 三个坑

1. **每帧 `clearRect`**：整屏重绘，字符失去拖尾，观感变成一堆跳动的点。
2. **按设备像素比开画布**：4K 屏上画布变成 3840×2160，每帧填 800 万像素。
3. **`requestAnimationFrame` 不节流**：144Hz 屏幕上白跑 144 次。

## 处理

拖尾用半透明黑覆盖而不是清屏：

```js
ctx.fillStyle = "rgba(0, 0, 0, 0.055)";
ctx.fillRect(0, 0, canvas.width, canvas.height);
```

画布按 `1/dpr` 的逻辑分辨率开，再交给 CSS 拉伸。等效于降采样，肉眼几乎看不出，填充量降到 1/4。

帧率锁在 24fps：

```js
var FRAME = 1000 / 24;
function draw(now) {
  requestAnimationFrame(draw);
  if (now - last < FRAME) return;
  last = now;
  // ...
}
```

24 帧对下落文字完全够。人眼在这类低速运动里分不出 24 和 60。

## 省掉的部分

- 不做每字符独立随机：一列一个字符，用列头位置驱动
- 不做发光效果：靠颜色透明度分层，`rgba(53,224,255,0.55)` 的头部比 `0.075` 的尾部亮，视觉上就有层次
- 窗口 resize 加 200ms 防抖，避免拖动窗口时反复重建数组

> 动画的第一原则不是好看，是不打扰。背景动效跑到 30% CPU 就是失败的。

对手里这块 1GB 的板子来说，这些都不是问题——canvas 在访客的浏览器里跑，服务器只是把 3KB 的 JS 发出去。

## 尊重系统设置

```js
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
```

开了「减少动态效果」的用户直接不启动，只留静态背景。这条比任何性能优化都重要。
