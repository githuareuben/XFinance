import { createContext, useContext, useEffect, useMemo, useState } from "react";

/**
 * Small theme system that controls CSS variables:
 *   --brand     (primary)
 *   --brand-2   (a deeper companion shade derived from --brand)
 */
const ThemeCtx = createContext(null);

const STORAGE_KEY = "theme.brand";

/** Convert hex -> hsl */
function hexToHsl(hex) {
  let r = 0, g = 0, b = 0;
  const m = hex.replace('#','').match(/.{1,2}/g);
  if (!m) return { h: 270, s: 60, l: 50 }; // fallback (violet-ish)
  [r, g, b] = m.map(v => parseInt(v, 16));
  r/=255; g/=255; b/=255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h = 0, s = 0, l = (max+min)/2;
  if (max !== min) {
    const d = max-min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){
      case r: h = (g-b)/d + (g < b ? 6 : 0); break;
      case g: h = (b-r)/d + 2; break;
      case b: h = (r-g)/d + 4; break;
    }
    h *= 60;
  }
  return { h, s: s*100, l: l*100 };
}

/** Convert hsl -> hex */
function hslToHex(h,s,l){
  s/=100; l/=100;
  const C = (1 - Math.abs(2*l - 1)) * s;
  const X = C * (1 - Math.abs((h/60) % 2 - 1));
  const m = l - C/2;
  let r=0,g=0,b=0;
  if (0<=h && h<60)   { r=C; g=X; b=0; }
  else if (60<=h && h<120){ r=X; g=C; b=0; }
  else if (120<=h && h<180){ r=0; g=C; b=X; }
  else if (180<=h && h<240){ r=0; g=X; b=C; }
  else if (240<=h && h<300){ r=X; g=0; b=C; }
  else { r=C; g=0; b=X; }
  const to255 = v => Math.round((v+m)*255);
  const hex = (n) => n.toString(16).padStart(2,'0');
  return `#${hex(to255(r))}${hex(to255(g))}${hex(to255(b))}`;
}

/** Given a brand hex, derive a companion (--brand-2) slightly darker/richer */
function deriveBrand2(brandHex){
  const {h,s,l} = hexToHsl(brandHex);
  const l2 = Math.max(0, l - 12);       // darker
  const s2 = Math.min(100, s + 6);      // a touch more saturated
  return hslToHex(h, s2, l2);
}

export function ThemeProvider({ children }) {
  const [brand, setBrand] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || "#8A2BE2"; // default violet
  });

  // Apply CSS variables whenever brand changes
  useEffect(() => {
    const root = document.documentElement;
    const brand2 = deriveBrand2(brand);
    root.style.setProperty("--brand", brand);
    root.style.setProperty("--brand-2", brand2);
    localStorage.setItem(STORAGE_KEY, brand);
  }, [brand]);

  const presets = useMemo(() => ([
    "#8A2BE2", // violet
    "#6A5ACD", // slate-violet
    "#3B82F6", // blue
    "#10B981", // emerald
    "#F59E0B", // amber
    "#EF4444", // red
  ]), []);

  const value = useMemo(() => ({ brand, setBrand, presets }), [brand, presets]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(){
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}