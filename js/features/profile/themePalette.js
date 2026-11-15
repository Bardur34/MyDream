import { sanitizeProfile, DEFAULT_THEME } from './profileModel.js';

// Из пяти цветов визитки (фон, текст, кнопки, текст кнопок, рамки) считается вся палитра дневника.
// Шрифт сюда намеренно не входит: он меняет только визитку.

const toRgb = (hex) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const triplet = (rgb) => rgb.join(' ');

const COLOR_KEYS = ['bg', 'text', 'buttonBg', 'buttonText', 'border'];

export function buildPalette(theme) {
  const bg = toRgb(theme.bg);
  const text = toRgb(theme.text);
  const accent = toRgb(theme.buttonBg);
  const border = toRgb(theme.border);
  const white = [255, 255, 255];
  const black = [0, 0, 0];

  // Серая шкала: от фона через рамки к тексту (так же устроена шкала slate в Tailwind)
  const slate = {
    950: bg,
    900: mix(bg, border, 0.27),      // карточки, поля ввода
    800: mix(bg, border, 0.55),
    700: border,
    600: mix(border, text, 0.10),
    500: mix(border, text, 0.28),    // приглушённый текст
    400: mix(border, text, 0.55),
    300: mix(border, text, 0.87),
    200: text, 100: text, 50: text,
  };
  // Акцентная шкала: от цвета кнопок к фону (тёмные оттенки) и к тексту (светлые оттенки)
  const purple = {
    950: mix(accent, bg, 0.75),
    900: mix(accent, bg, 0.6),
    800: mix(accent, bg, 0.45),
    700: mix(accent, black, 0.2),
    600: accent,
    500: mix(accent, white, 0.15),
    400: mix(accent, text, 0.35),    // заголовки и акценты на фоне страницы
    300: mix(accent, text, 0.6),
    200: mix(accent, text, 0.75),
    100: mix(accent, text, 0.88),
    50: mix(accent, text, 0.94),
  };

  const vars = { '--white': text, '--btn-text': toRgb(theme.buttonText) };
  Object.entries(slate).forEach(([shade, rgb]) => { vars[`--slate-${shade}`] = rgb; });
  Object.entries(purple).forEach(([shade, rgb]) => { vars[`--purple-${shade}`] = rgb; });
  return Object.fromEntries(Object.entries(vars).map(([name, rgb]) => [name, triplet(rgb)]));
}

// Применяет цвета к странице. С цветами по умолчанию переменные убираются совсем,
// и дневник выглядит ровно так, как задумано в css/theme.css.
export function applyDiaryTheme(rawTheme) {
  const { theme } = sanitizeProfile({ theme: rawTheme });
  const style = document.documentElement.style;
  const isDefault = COLOR_KEYS.every(key => theme[key] === DEFAULT_THEME[key]);

  Object.entries(buildPalette(theme)).forEach(([name, value]) => {
    if (isDefault) style.removeProperty(name);
    else style.setProperty(name, value);
  });
}
