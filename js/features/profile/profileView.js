import { SUPABASE_URL, AVATAR_BUCKET } from '../../config.js';
import { sanitizeProfile, FONTS } from './profileModel.js';

// Отрисовка визитки. Её используют и публичная страница (visit/), и предпросмотр в настройках,
// поэтому выглядят они одинаково. Весь текст вставляется через textContent, ссылки проходят
// проверку в sanitizeProfile — разметка из базы на страницу не попадает.

export function avatarUrl(path, version) {
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  const base = `${SUPABASE_URL}/storage/v1/object/public/${AVATAR_BUCKET}/${encoded}`;
  return version ? `${base}?v=${encodeURIComponent(version)}` : base;
}

function loadFont(key) {
  const font = FONTS[key];
  if (!font || !font.google || document.getElementById(`font-${key}`)) return;
  const link = document.createElement('link');
  link.id = `font-${key}`;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
  document.head.appendChild(link);
}

// Стили, которые нельзя задать атрибутом style (наведение, нажатие). Сюда же позже добавятся анимации кнопок.
function ensureStyles() {
  if (document.getElementById('profile-styles')) return;
  const style = document.createElement('style');
  style.id = 'profile-styles';
  style.textContent = `
    .profile-link { transition: filter .15s, transform .1s; }
    .profile-link:hover { filter: brightness(1.15); }
    .profile-link:active { transform: scale(.98); }
    .profile-avatar-button:hover { filter: brightness(1.15); }
  `;
  document.head.appendChild(style);
}

function el(tag, style = {}, text = '', attrs = {}) {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  if (text) node.textContent = text;
  Object.entries(attrs).forEach(([name, value]) => node.setAttribute(name, value));
  return node;
}

// opts.interactive — аватарка открывает окно входа (на публичной странице)
// opts.avatarSrc — подменить аватарку (предпросмотр ещё не сохранённого файла); '' — без аватарки
export function renderProfile(root, rawProfile, { interactive = false, avatarSrc } = {}) {
  const profile = sanitizeProfile(rawProfile);
  const theme = profile.theme;
  ensureStyles();
  loadFont(theme.font);

  root.replaceChildren();
  Object.assign(root.style, {
    background: theme.bg,
    color: theme.text,
    fontFamily: FONTS[theme.font].css,
  });
  root.style.setProperty('--btn-bg', theme.buttonBg);
  root.style.setProperty('--btn-text', theme.buttonText);
  root.style.setProperty('--border', theme.border);

  const page = el('div', { maxWidth: '48rem', margin: '0 auto', padding: '2.5rem 1rem 3rem' });

  // --- шапка: аватарка, имя, описание
  const header = el('div', { textAlign: 'center', marginBottom: '2rem' });
  const avatarStyle = {
    width: '7rem', height: '7rem', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 1rem',
    border: '3px solid var(--border)', background: 'var(--btn-bg)', color: 'var(--btn-text)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', padding: '0',
  };
  const avatar = interactive
    ? el('button', { ...avatarStyle, cursor: 'pointer' }, '', { 'data-action': 'onAvatarClick', 'aria-label': 'Войти', type: 'button', class: 'profile-avatar-button' })
    : el('div', avatarStyle);
  const src = avatarSrc !== undefined ? avatarSrc : (profile.avatar_path ? avatarUrl(profile.avatar_path, profile.updated_at) : '');
  if (src) {
    const img = el('img', { width: '100%', height: '100%', objectFit: 'cover', display: 'block' }, '', { src, alt: '' });
    avatar.appendChild(img);
  } else {
    avatar.textContent = '👤';
  }
  header.appendChild(avatar);
  header.appendChild(el('h1', { fontSize: '2.25rem', lineHeight: '1.2', fontWeight: '700', margin: '0 0 .5rem', wordBreak: 'break-word' }, profile.display_name));
  header.appendChild(el('p', { fontSize: '.9rem', opacity: '.8', margin: '0', wordBreak: 'break-word' }, profile.description));
  page.appendChild(header);

  // --- ссылки: не больше двух колонок, на узком экране одна
  if (profile.links.length) {
    const grid = el('div', {
      display: 'grid', gap: '.75rem', marginBottom: '2rem',
      gridTemplateColumns: 'repeat(auto-fit, minmax(max(14rem, 45%), 1fr))',
    });
    profile.links.forEach(link => {
      const a = el('a', {
        display: 'block', padding: '1rem 1.25rem', borderRadius: '.5rem', border: '2px solid var(--border)',
        background: 'var(--btn-bg)', color: 'var(--btn-text)', textDecoration: 'none', wordBreak: 'break-word',
      }, link.title, { href: link.url, target: '_blank', rel: 'noopener noreferrer', class: 'profile-link' });
      grid.appendChild(a);
    });
    page.appendChild(grid);
  }

  // --- новости (пока заглушка)
  const news = el('div', {
    border: '2px solid var(--border)', borderRadius: '.5rem', minHeight: '14rem', padding: '1.5rem',
    display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '.5rem',
  });
  news.appendChild(el('div', { fontSize: '1.4rem' }, 'Новости Telegram-канала и мечты'));
  news.appendChild(el('div', { fontSize: '.85rem', opacity: '.6' }, 'Скоро здесь появятся новости.'));
  page.appendChild(news);

  root.appendChild(page);
}
