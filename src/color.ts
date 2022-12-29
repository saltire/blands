import { random } from './utils';


// All HSV/RGB values should be between 0 and 1.
type HSV = {
  h: number,
  s: number,
  v: number,
};
type RGB = {
  r: number,
  g: number,
  b: number,
};

export function rgb2hex({ r, g, b }: RGB): string {
  return ['#', ...[r, g, b].map(c => Math.floor(c * 255).toString(16).padStart(2, '0'))].join('');
}

export function hsv2rgb({ h, s, v }: HSV): RGB {
  if (s === 0) {
    return { r: v, g: v, b: v };
  }

  const h6 = (h * 6) % 6;
  const i = Math.floor(h6);
  const a = h6 - i;
  const ch = [
    v * (1 - s),
    v * (1 - (s * a)),
    v * (1 - (s * (1 - a))),
  ];

  if (i === 0) {
    return { r: v, g: ch[2], b: ch[0] };
  }
  if (i === 1) {
    return { r: ch[1], g: v, b: ch[0] };
  }
  if (i === 2) {
    return { r: ch[0], g: v, b: ch[2] };
  }
  if (i === 3) {
    return { r: ch[0], g: ch[1], b: v };
  }
  if (i === 4) {
    return { r: ch[2], g: ch[0], b: v };
  }
  return { r: v, g: ch[0], b: ch[1] };
}

export function generateColorScheme() {
  const lv = random({ min: 0.5 });
  const light = rgb2hex(hsv2rgb({
    h: random(),
    s: random({ min: 1 - lv }), // Lower values need higher saturation.
    v: lv,
  }));

  const dv = random({ min: 0.05, max: lv - 0.3 }); // Make sure it's darker.
  const dark = rgb2hex(hsv2rgb({
    h: random(),
    s: random({ min: Math.max(0, dv - 0.3) }), // Higher values need slightly higher saturation.
    v: dv,
  }));

  return { light, dark };
}
