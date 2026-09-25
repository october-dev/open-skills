/* Launch-assets starter helpers. Point LOGO_DIR at your copied brand/product logos.
   Extend HARNESS/APPS with the real logos you dropped into assets/. */
export const LOGO_DIR = '../assets/logos';
export const L = (f) => `${LOGO_DIR}/${f}`;

/* Fill with the real logo filenames you copied into assets/logos/ */
export const LOGOS = {/* key: {f:'file.png', n:'Display Name'} */};
export const logo = (k, size = 27, r = 7) => {
  const x = LOGOS[k]; if (!x) return '';
  return `<img src="${L(x.f)}" alt="${x.n}" style="width:${size}px;height:${size}px;border-radius:${r}px;object-fit:cover">`;
};

/* Some logos vanish on the wrong ground — keep measured allow/deny lists and filter. */
export const BAD_ON_LIGHT = new Set([]);   // white-on-transparent logos
export const BAD_ON_DARK  = new Set([]);   // dark line-art logos
export const onLight = (ks) => ks.filter(k => !BAD_ON_LIGHT.has(k));
export const onDark  = (ks) => ks.filter(k => !BAD_ON_DARK.has(k));

/* Figma-style multiplayer cursor with a name tag. */
export function cursor({ x, y, name, color, scale = 1, style = '' }) {
  return `<div style="position:absolute;left:${x}px;top:${y}px;transform:scale(${scale});pointer-events:none;z-index:40;${style}">
    <svg width="23" height="26" viewBox="0 0 23 26" fill="none" style="filter:drop-shadow(0 3px 7px rgba(10,20,40,.28))">
      <path d="M2 1.6 L2 21.2 L7.3 16.3 L10.7 23.9 L14.2 22.3 L10.9 15 L18.2 14.6 Z" fill="${color}" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/></svg>
    ${name ? `<div style="position:absolute;left:15px;top:17px;padding:4px 10px;border-radius:8px;font:600 13px sans-serif;color:#fff;white-space:nowrap;background:${color}">${name}</div>` : ''}
  </div>`;
}
export function avatar({ n, c, size = 34, ring = '#fff' }) {
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${c};color:#fff;display:grid;place-items:center;
    font:600 ${size*0.4}px sans-serif;box-shadow:0 0 0 2.5px ${ring},0 4px 10px rgba(30,18,6,.2)">${n[0]}</div>`;
}
