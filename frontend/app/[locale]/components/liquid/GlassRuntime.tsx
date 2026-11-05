"use client";

import { useEffect } from "react";

import { supportsRefraction } from "@/lib/liquidLens";

/**
 * Makes the glass react to light:
 * - turns on SVG refraction where the browser supports it (html.lg-refract, see lib/liquidLens),
 * - points each `.lg-rim` edge highlight toward the pointer (--lg-angle),
 * - moves the glare on surfaces that declare --lg-spot (--mx/--my, see styles/_liquid.scss),
 * - lets the backdrop's pointer light drift after the cursor (--px/--py).
 * Also hosts the <defs> the refraction filters are added to.
 */
export default function GlassRuntime() {
  useEffect(() => {
    if (supportsRefraction()) document.documentElement.classList.add("lg-refract");

    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const backdrop = document.querySelector<HTMLElement>(".lg-backdrop");
    const spotCache = new WeakMap<Element, boolean>();
    let frame = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 3;
    let target: Element | null = null;
    let lit: HTMLElement | null = null;

    const isSpot = (element: Element) => {
      let spot = spotCache.get(element);
      if (spot === undefined) {
        spot = getComputedStyle(element).getPropertyValue("--lg-spot").trim() !== "";
        spotCache.set(element, spot);
      }
      return spot;
    };

    const findSpot = (start: Element | null): HTMLElement | null => {
      let node = start;
      for (let depth = 0; node && node !== document.body && depth < 10; depth++) {
        if (isSpot(node)) return node as HTMLElement;
        node = node.parentElement;
      }
      return null;
    };

    const update = () => {
      frame = 0;

      // Read every rect first, then write, so the browser lays out once per frame.
      const rims = Array.from(document.querySelectorAll<HTMLElement>(".lg-rim"));
      const rimRects = rims.map((element) => element.getBoundingClientRect());
      const spot = findSpot(target);
      const spotRect = spot?.getBoundingClientRect();

      backdrop?.style.setProperty("--px", `${x}px`);
      backdrop?.style.setProperty("--py", `${y}px`);

      rims.forEach((element, index) => {
        const rect = rimRects[index];
        const angle = (Math.atan2(y - (rect.top + rect.height / 2), x - (rect.left + rect.width / 2)) * 180) / Math.PI + 90;
        element.style.setProperty("--lg-angle", `${angle.toFixed(1)}deg`);
      });

      if (spot && spotRect) {
        spot.style.setProperty("--mx", `${x - spotRect.left}px`);
        spot.style.setProperty("--my", `${y - spotRect.top}px`);
      }
      lit = spot;
    };

    const onMove = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      target = event.target as Element | null;
      if (!frame) frame = requestAnimationFrame(update);
    };

    // Scrolling moves surfaces under a still pointer.
    const onScroll = () => {
      if (lit && !frame) frame = requestAnimationFrame(update);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll, { capture: true });
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <defs id="lg-defs" />
    </svg>
  );
}
