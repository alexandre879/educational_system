// Shared by the server layout (boot script) and lib/appearance.ts (the client store).

// Kept under the old key so the theme chosen before the appearance store existed still applies.
export const THEME_KEY = "theme";
export const APPEARANCE_KEY = "appearance";

/** The order accents follow when they change automatically (same order as the picker). */
export const ACCENT_ORDER = ["ocean", "violet", "rose", "sunset", "emerald", "lagoon"] as const;

/** How often the accent may change by itself, in minutes; 0 is off. */
export const ACCENT_CYCLES = [0, 10, 20, 30, 60] as const;

/**
 * Applies the saved appearance to <html> before the first paint, so there's no flash of the wrong theme.
 * With an automatic accent, the colour is worked out from the clock the same way lib/appearance.ts does:
 * the chosen accent, moved on one step for every period since 1970.
 */
export const APPEARANCE_BOOT_SCRIPT = `(function(){try{var d=document.documentElement,s=localStorage,a=JSON.parse(s.getItem("${APPEARANCE_KEY}")||"{}"),t=s.getItem("${THEME_KEY}")||"dark",m=function(q){return window.matchMedia(q).matches},o=${JSON.stringify(ACCENT_ORDER)},c=${JSON.stringify(ACCENT_CYCLES)},ac=a.accent||"ocean",n=c.indexOf(a.accentCycle)>0?a.accentCycle:0,i=o.indexOf(ac);if(t==="system")t=m("(prefers-color-scheme: light)")?"light":"dark";if(n&&i>=0)ac=o[(i+Math.floor(Date.now()/(n*60000)))%o.length];d.setAttribute("data-theme",t);d.setAttribute("data-accent",ac);d.setAttribute("data-glass",a.glass||"regular");d.setAttribute("data-backdrop",a.backdrop||"aurora");if(a.motion==="reduced"||(a.motion!=="full"&&m("(prefers-reduced-motion: reduce)")))d.setAttribute("data-motion","reduced");if(a.sidebarCollapsed)d.setAttribute("data-sidebar","collapsed")}catch(e){}})();`;
