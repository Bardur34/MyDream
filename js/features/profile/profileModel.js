// Модель визитки: значения по умолчанию, шрифты и проверка данных.
// Всё, что приходит из базы, проходит через sanitizeProfile — на страницу попадают только безопасные значения.

export const MAX_LINKS = 12;
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'tg:'];

export const FONTS = {
  system:     { label: 'Системный',            css: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  serif:      { label: 'С засечками',          css: "Georgia, 'Times New Roman', serif" },
  mono:       { label: 'Моноширинный',         css: "ui-monospace, 'SF Mono', Consolas, monospace" },
  montserrat: { label: 'Montserrat',           css: "'Montserrat', sans-serif",  google: 'Montserrat:wght@400;600' },
  playfair:   { label: 'Playfair Display',     css: "'Playfair Display', serif", google: 'Playfair+Display:wght@400;700' },
  caveat:     { label: 'Caveat (рукописный)',  css: "'Caveat', cursive",         google: 'Caveat:wght@400;700' },
};

// Цвета по умолчанию совпадают с палитрой заметок, поэтому с ними заметки выглядят как раньше.
// theme — всё оформление одним блоком: новые настройки (шаблоны, градиент, анимации кнопок)
// добавляются сюда без изменения таблицы в базе
export const DEFAULT_THEME = {
  template: 'classic',
  bg: '#020617',        // = slate-950
  text: '#f1f5f9',      // = slate-100
  buttonBg: '#9333ea',  // = purple-600 (главный цвет кнопок и акцентов)
  buttonText: '#ffffff',
  border: '#334155',    // = slate-700
  font: 'system',
};

export const DEFAULT_PROFILE = {
  display_name: 'Имя',
  description: 'Здесь будет описание',
  avatar_path: null,
  links: [],
  theme: DEFAULT_THEME,
  updated_at: null,
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

// Адрес ссылки → безопасный href или null. Принимаются только http, https и tg;
// адрес без схемы (t.me/name) дополняется до https://
export function normalizeUrl(value) {
  const v = String(value ?? '').trim();
  if (!v) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
  try {
    const url = new URL(withScheme);
    return ALLOWED_PROTOCOLS.includes(url.protocol) ? url.href : null;
  } catch (e) {
    return null;
  }
}

export function sanitizeProfile(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const t = r.theme && typeof r.theme === 'object' ? r.theme : {};
  const color = (value, fallback) => (HEX_COLOR.test(value) ? value : fallback);

  const links = (Array.isArray(r.links) ? r.links : [])
    .map(link => ({ title: String((link && link.title) ?? '').trim().slice(0, 60), url: normalizeUrl(link && link.url) }))
    .filter(link => link.title && link.url)
    .slice(0, MAX_LINKS);

  return {
    display_name: String(r.display_name ?? DEFAULT_PROFILE.display_name).slice(0, 60),
    description: String(r.description ?? DEFAULT_PROFILE.description).slice(0, 200),
    avatar_path: typeof r.avatar_path === 'string' && r.avatar_path ? r.avatar_path : null,
    links,
    theme: {
      template: DEFAULT_THEME.template,
      bg: color(t.bg, DEFAULT_THEME.bg),
      text: color(t.text, DEFAULT_THEME.text),
      buttonBg: color(t.buttonBg, DEFAULT_THEME.buttonBg),
      buttonText: color(t.buttonText, DEFAULT_THEME.buttonText),
      border: color(t.border, DEFAULT_THEME.border),
      font: Object.prototype.hasOwnProperty.call(FONTS, t.font) ? t.font : DEFAULT_THEME.font,
    },
    updated_at: r.updated_at || null,
  };
}
