"use client";

import { useLayoutEffect } from "react";

import { reapplyAppearance } from "@/lib/appearance";

/**
 * Switching language remounts the root layout, and React resets the attributes on <html> that hold
 * the appearance (theme, accent, glass…), so the site fell back to its default look until a reload.
 * This remounts with the layout and puts them back before the browser paints.
 */
export default function AppearanceSync() {
  useLayoutEffect(() => {
    reapplyAppearance();
  }, []);
  return null;
}
