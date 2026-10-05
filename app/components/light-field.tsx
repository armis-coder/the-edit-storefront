"use client";

import { useEffect, useRef } from "react";

/** A small 2D canvas study: no model download or WebGL startup. */
export function LightField({ paused }: { paused: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let width = 1, height = 1, frame = 0, previous = 0, phase = 0;
    let visible = true;
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };

    function draw() {
      if (!context) return;
      context.clearRect(0, 0, width, height);
      const scale = Math.min(width / 680, height / 730);
      const centerX = width * .5, centerY = height * .49;
      const light = context.createLinearGradient(0, centerY - 345 * scale, 0, centerY + 345 * scale);
      light.addColorStop(0, "rgba(166,185,209,0)");
      light.addColorStop(.19, "rgba(166,185,209,.32)");
      light.addColorStop(.43, "rgba(220,229,238,.78)");
      light.addColorStop(.64, "rgba(153,174,198,.3)");
      light.addColorStop(1, "rgba(166,185,209,0)");
      context.strokeStyle = light;
      context.lineWidth = Math.max(.6, .8 * scale);
      for (let line = 0; line < 104; line++) {
        const u = line / 103, band = (u - .5) * 310;
        const highlight = Math.max(0, Math.cos(u * Math.PI * 2 - phase * .32)) ** 8;
        context.globalAlpha = .1 + highlight * .5 + Math.sin(u * Math.PI) * .15;
        context.beginPath();
        for (let step = 0; step <= 70; step++) {
          const v = step / 70, envelope = Math.sin(v * Math.PI);
          const spread = .62 + envelope * .5;
          const twist = Math.sin(v * Math.PI * 1.8 - .8 + phase * .13) * 104;
          const fold = Math.sin(v * Math.PI * 2.4 + u * 2.4 + phase * .17) * 28;
          const x = centerX + (band * spread + twist + fold + pointer.x * 46 * envelope) * scale;
          const y = centerY + ((v - .5) * 740 + Math.sin(u * Math.PI) * 20 + pointer.y * 24 * envelope) * scale;
          if (step === 0) context.moveTo(x, y); else context.lineTo(x, y);
        }
        context.stroke();
      }
      context.globalAlpha = 1;
    }
    function resize() {
      if (!host || !canvas || !context) return;
      const bounds = host.getBoundingClientRect();
      width = Math.max(1, bounds.width); height = Math.max(1, bounds.height);
      const ratio = Math.min(devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw();
    }
    function tick(now: number) {
      frame = requestAnimationFrame(tick);
      if (!visible || document.hidden || media.matches || pausedRef.current) { previous = now; return; }
      if (now - previous < 32) return;
      phase += Math.min(now - (previous || now), 70) * .0005;
      previous = now;
      pointer.x += (pointer.targetX - pointer.x) * .055;
      pointer.y += (pointer.targetY - pointer.y) * .055;
      draw();
    }
    function move(event: PointerEvent) {
      if (event.pointerType !== "mouse" || !host) return;
      const bounds = host.getBoundingClientRect();
      pointer.targetX = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
      pointer.targetY = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
    }
    function leave() { pointer.targetX = 0; pointer.targetY = 0; }
    const sizeObserver = new ResizeObserver(resize);
    const visibilityObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    sizeObserver.observe(host); visibilityObserver.observe(host);
    host.addEventListener("pointermove", move, { passive: true });
    host.addEventListener("pointerleave", leave);
    media.addEventListener("change", draw);
    resize(); frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame); sizeObserver.disconnect(); visibilityObserver.disconnect();
      host.removeEventListener("pointermove", move); host.removeEventListener("pointerleave", leave);
      media.removeEventListener("change", draw);
    };
  }, []);

  return <div ref={hostRef} className="light-field" aria-hidden="true"><canvas ref={canvasRef} /></div>;
}
