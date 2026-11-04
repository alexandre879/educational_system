// Shared by the server layout (boot script) and lib/appearance.ts (the client store).

// Kept under the old key so the theme chosen before the appearance store existed still applies.
export const THEME_KEY = "theme";
export const APPEARANCE_KEY = "appearance";

/** Applies the saved appearance to <html> before the first paint, so there's no flash of the wrong theme. */
export const APPEARANCE_BOOT_SCRIPT = `(function(){try{var d=document.documentElement,s=localStorage,a=JSON.parse(s.getItem("${APPEARANCE_KEY}")||"{}"),t=s.getItem("${THEME_KEY}")||"dark",m=function(q){return window.matchMedia(q).matches};if(t==="system")t=m("(prefers-color-scheme: light)")?"light":"dark";d.setAttribute("data-theme",t);d.setAttribute("data-accent",a.accent||"ocean");d.setAttribute("data-glass",a.glass||"regular");d.setAttribute("data-backdrop",a.backdrop||"aurora");if(a.motion==="reduced"||(a.motion!=="full"&&m("(prefers-reduced-motion: reduce)")))d.setAttribute("data-motion","reduced");if(a.sidebarCollapsed)d.setAttribute("data-sidebar","collapsed")}catch(e){}})();`;
