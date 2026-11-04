"use client";

import { type RefObject, useEffect } from "react";

/**
 * Real refraction for the floating glass (header, dock): an SVG displacement map that bends
 * the backdrop near the rounded edges, the way a thick glass lens does. Only Chromium can run
 * SVG filters inside `backdrop-filter`, so GlassRuntime adds `html.lg-refract` there and every
 * other browser keeps the plain frosted blur.
 *
 * The element's CSS opts in with `backdrop-filter: var(--lg-lens,) blur(...)`.
 */

let sequence = 0;
let refraction: boolean | null = null;

/** Chromium is the only engine that runs SVG filters inside backdrop-filter. */
export function supportsRefraction(): boolean {
  if (refraction === null) {
    const brands = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData?.brands;
    refraction =
      Boolean(brands?.some((entry) => entry.brand === "Chromium")) && CSS.supports("backdrop-filter", "url(#lg) blur(1px)");
  }
  return refraction;
}

/** Signed distance from a point (relative to the center) to a rounded rectangle; < 0 inside. */
function roundedRectDistance(x: number, y: number, halfW: number, halfH: number, radius: number) {
  const qx = Math.abs(x) - halfW + radius;
  const qy = Math.abs(y) - halfH + radius;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
}

/**
 * Red/green encode the x/y offset (128 = none). Inside the bezel each pixel samples from further
 * inward, so the edge magnifies what is behind it; the profile is a circular arc, like a lens rim.
 */
function displacementMap(width: number, height: number, radius: number, bezel: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return "";

  const image = context.createImageData(width, height);
  const data = image.data;
  const halfW = width / 2;
  const halfH = height / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = x + 0.5 - halfW;
      const py = y + 0.5 - halfH;
      const inside = -roundedRectDistance(px, py, halfW, halfH, radius);
      let dx = 0;
      let dy = 0;

      if (inside < bezel) {
        const nx = roundedRectDistance(px + 0.5, py, halfW, halfH, radius) - roundedRectDistance(px - 0.5, py, halfW, halfH, radius);
        const ny = roundedRectDistance(px, py + 0.5, halfW, halfH, radius) - roundedRectDistance(px, py - 0.5, halfW, halfH, radius);
        const length = Math.hypot(nx, ny) || 1;
        const t = 1 - Math.max(0, inside) / bezel;
        const strength = 1 - Math.sqrt(Math.max(0, 1 - t * t));
        dx = (-nx / length) * strength;
        dy = (-ny / length) * strength;
      }

      const i = (y * width + x) * 4;
      data[i] = 128 + dx * 127;
      data[i + 1] = 128 + dy * 127;
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

const SVG_NS = "http://www.w3.org/2000/svg";

export function useLiquidLens(
  ref: RefObject<HTMLElement | null>,
  { bezel = 16, scale = 42, enabled = true }: { bezel?: number; scale?: number; enabled?: boolean } = {}
) {
  useEffect(() => {
    const element = ref.current;
    const defs = document.getElementById("lg-defs");
    if (!enabled || !element || !defs || !supportsRefraction()) return;

    const id = `lg-lens-${++sequence}`;
    const filter = document.createElementNS(SVG_NS, "filter");
    filter.setAttribute("id", id);
    filter.setAttribute("filterUnits", "userSpaceOnUse");
    filter.setAttribute("color-interpolation-filters", "sRGB");
    defs.appendChild(filter);

    let lastSize = "";
    let timer: ReturnType<typeof setTimeout> | null = null;

    const build = () => {
      const width = Math.round(element.offsetWidth);
      const height = Math.round(element.offsetHeight);
      const size = `${width}x${height}`;
      if (!width || !height || size === lastSize) return;
      lastSize = size;

      const radius = Math.min(parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0, width / 2, height / 2);
      const map = displacementMap(width, height, radius, Math.min(bezel, radius || bezel, width / 2, height / 2));
      if (!map) return;

      filter.setAttribute("x", "0");
      filter.setAttribute("y", "0");
      filter.setAttribute("width", String(width));
      filter.setAttribute("height", String(height));
      filter.innerHTML =
        `<feImage href="${map}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" result="map"/>` +
        `<feDisplacementMap in="SourceGraphic" in2="map" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/>`;
      element.style.setProperty("--lg-lens", `url(#${id})`);
    };

    build();
    const observer = new ResizeObserver(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(build, 120);
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
      element.style.removeProperty("--lg-lens");
      filter.remove();
    };
  }, [ref, bezel, scale, enabled]);
}
