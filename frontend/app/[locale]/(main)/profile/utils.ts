export const letterToHsl = (name?: string) => {
  const ch = (name?.trim()?.[0] ?? "U").toUpperCase();
  const code = ch.charCodeAt(0);
  const hue = ((code * 37) % 360 + 360) % 360;
  return {
    bg: `hsl(${hue} 70% 45%)`,
    fg: "rgba(255,255,255,0.92)",
    letter: ch,
  };
};