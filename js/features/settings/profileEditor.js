import { AVATAR_MAX_BYTES } from '../../config.js';
import { renderProfile, avatarUrl } from '../profile/profileView.js';
import { FONTS, DEFAULT_PROFILE, DEFAULT_THEME, MAX_LINKS, normalizeUrl, sanitizeProfile } from '../profile/profileModel.js';
import {
  fetchProfile, saveProfile, uploadAvatar, deleteAvatar, writeProfileCache, AVATAR_TYPES,
} from '../profile/profileApi.js';

// Вкладка «Визитка» в настройках: форма + предпросмотр, который перерисовывается при каждом изменении.
const $ = (id) => document.getElementById(id);

const COLOR_FIELDS = { cBg: 'bg', cText: 'text', cBtnBg: 'buttonBg', cBtnText: 'buttonText', cBorder: 'border' };
const FIELD_CLASS = 'w-full bg-slate-950 border rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-600 placeholder-slate-600';

let draft = null;               // то, что сейчас в форме
let savedAvatarPath = null;     // аватарка, которая сейчас сохранена в базе
let savedUpdatedAt = null;
let pendingFile = null;         // выбранный, но ещё не загруженный файл
let pendingUrl = null;          // адрес для предпросмотра выбранного файла
let avatarRemoved = false;
let showLinkErrors = false;

function say(id, text, tone = 'text-slate-400') {
  const el = $(id);
  el.textContent = text;
  el.className = `text-xs ${tone}`;
}

function currentAvatarSrc() {
  if (pendingUrl) return pendingUrl;
  if (avatarRemoved || !savedAvatarPath) return '';
  return avatarUrl(savedAvatarPath, savedUpdatedAt);
}

function updatePreview() {
  const src = currentAvatarSrc();
  renderProfile($('profilePreview'), draft, { interactive: false, avatarSrc: src });

  const thumb = $('avatarThumb');
  thumb.replaceChildren();
  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.className = 'w-full h-full object-cover';
    thumb.appendChild(img);
  } else {
    thumb.textContent = '👤';
  }
}

// ---------- ссылки ----------
function renderLinks() {
  const box = $('linksEditor');
  box.replaceChildren();

  draft.links.forEach((link, index) => {
    const row = document.createElement('div');
    row.className = 'flex gap-2 items-start';
    row.dataset.index = index;

    const fields = document.createElement('div');
    fields.className = 'flex-1 space-y-1';
    [['title', 'Название', 60], ['url', 'Адрес: https://… или tg://…', 500]].forEach(([field, placeholder, max]) => {
      const input = document.createElement('input');
      input.dataset.field = field;
      input.dataset.index = index;
      input.value = link[field];
      input.placeholder = placeholder;
      input.maxLength = max;
      const bad = showLinkErrors && (field === 'title' ? !link.title.trim() : !normalizeUrl(link.url));
      input.className = `${FIELD_CLASS} ${bad ? 'border-red-500' : 'border-slate-800'}`;
      fields.appendChild(input);
    });
    row.appendChild(fields);

    const buttons = document.createElement('div');
    buttons.className = 'flex flex-col gap-1';
    [['moveLinkUp', '↑', 'Выше'], ['moveLinkDown', '↓', 'Ниже'], ['removeLink', '✕', 'Удалить']].forEach(([action, symbol, label]) => {
      const button = document.createElement('button');
      button.dataset.action = action;
      button.dataset.index = index;
      button.setAttribute('aria-label', label);
      button.textContent = symbol;
      button.className = 'w-8 h-8 text-xs bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition';
      buttons.appendChild(button);
    });
    row.appendChild(buttons);
    box.appendChild(row);
  });

  $('addLinkBtn').disabled = draft.links.length >= MAX_LINKS;
}

// ---------- заполнение формы ----------
function fillForm() {
  $('pName').value = draft.display_name;
  $('pDescription').value = draft.description;
  Object.entries(COLOR_FIELDS).forEach(([id, key]) => { $(id).value = draft.theme[key]; });
  $('pFont').value = draft.theme.font;
  renderLinks();
  updatePreview();
}

function onFormInput(event) {
  const t = event.target;
  if (t.id === 'pName') draft.display_name = t.value;
  else if (t.id === 'pDescription') draft.description = t.value;
  else if (t.id === 'pFont') draft.theme.font = t.value;
  else if (COLOR_FIELDS[t.id]) draft.theme[COLOR_FIELDS[t.id]] = t.value;
  else if (t.dataset.field) {
    draft.links[Number(t.dataset.index)][t.dataset.field] = t.value;
    t.classList.remove('border-red-500');
  } else return;
  updatePreview();
}

// ---------- аватарка ----------
function onAvatarChosen(event) {
  const file = event.target.files[0];
  event.target.value = '';           // чтобы тот же файл можно было выбрать снова
  if (!file) return;
  if (!AVATAR_TYPES.includes(file.type)) return say('avatarMessage', 'Нужен файл JPG, PNG, WebP или GIF.', 'text-red-400');
  if (file.size > AVATAR_MAX_BYTES) return say('avatarMessage', 'Файл больше 5 МБ.', 'text-red-400');

  if (pendingUrl) URL.revokeObjectURL(pendingUrl);
  pendingFile = file;
  pendingUrl = URL.createObjectURL(file);
  avatarRemoved = false;
  say('avatarMessage', 'Аватарка выбрана. Нажмите «Сохранить визитку».', 'text-slate-400');
  updatePreview();
}

function clearPending() {
  if (pendingUrl) URL.revokeObjectURL(pendingUrl);
  pendingFile = null;
  pendingUrl = null;
}

// ---------- действия ----------
function moveLink(index, delta) {
  const target = index + delta;
  if (target < 0 || target >= draft.links.length) return;
  [draft.links[index], draft.links[target]] = [draft.links[target], draft.links[index]];
  renderLinks();
  updatePreview();
}

async function save() {
  // 1. проверка ссылок: у каждой должны быть название и подходящий адрес
  showLinkErrors = true;
  const broken = draft.links.some(link => !link.title.trim() || !normalizeUrl(link.url));
  renderLinks();
  if (broken) return say('profileMessage', 'Проверьте ссылки: у каждой должно быть название и адрес (http, https или tg).', 'text-red-400');
  showLinkErrors = false;
  draft.links = draft.links.map(link => ({ title: link.title.trim(), url: normalizeUrl(link.url) }));
  renderLinks();

  const button = $('saveProfileBtn');
  button.disabled = true;
  say('profileMessage', 'Сохраняю…');

  let uploadedPath = null;
  try {
    if (pendingFile) uploadedPath = await uploadAvatar(pendingFile);
    const avatar_path = pendingFile ? uploadedPath : (avatarRemoved ? null : savedAvatarPath);

    const saved = await saveProfile({
      display_name: draft.display_name.trim(),
      description: draft.description.trim(),
      avatar_path,
      links: draft.links,
      theme: { ...draft.theme, template: DEFAULT_THEME.template },
    });

    // сохранилось — старую аватарку из хранилища убираем
    if (savedAvatarPath && savedAvatarPath !== avatar_path) await deleteAvatar(savedAvatarPath);
    savedAvatarPath = avatar_path;
    savedUpdatedAt = saved.updated_at;
    avatarRemoved = false;
    clearPending();
    writeProfileCache(saved);
    updatePreview();
    say('avatarMessage', 'JPG, PNG, WebP или GIF, до 5 МБ.', 'text-slate-500');
    say('profileMessage', 'Сохранено', 'text-green-400');
  } catch (error) {
    console.error(error);
    if (uploadedPath) await deleteAvatar(uploadedPath);   // запись не сохранилась — загруженный файл не оставляем
    say('profileMessage', 'Не удалось сохранить. Ничего не изменилось, попробуйте ещё раз.', 'text-red-400');
  } finally {
    button.disabled = false;
  }
}

export async function initProfileEditor() {
  Object.entries(FONTS).forEach(([key, font]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = font.label;
    $('pFont').appendChild(option);
  });

  let row = null;
  try {
    row = await fetchProfile();
  } catch (error) {
    console.error(error);
    say('profileMessage', 'Не удалось загрузить визитку. Выполнен ли SQL из supabase/site_profile.sql?', 'text-red-400');
  }

  const profile = row ? sanitizeProfile(row) : sanitizeProfile(DEFAULT_PROFILE);
  draft = {
    display_name: profile.display_name,
    description: profile.description,
    links: profile.links.map(link => ({ ...link })),
    theme: { ...profile.theme },
  };
  savedAvatarPath = profile.avatar_path;
  savedUpdatedAt = profile.updated_at;

  $('profileForm').addEventListener('input', onFormInput);
  $('avatarFile').addEventListener('change', onAvatarChosen);
  fillForm();
}

export const actions = {
  pickAvatar: () => $('avatarFile').click(),
  removeAvatar: () => {
    clearPending();
    avatarRemoved = true;
    say('avatarMessage', 'Аватарка будет убрана после сохранения.', 'text-slate-400');
    updatePreview();
  },
  addLink: () => {
    if (draft.links.length >= MAX_LINKS) return;
    draft.links.push({ title: '', url: '' });
    renderLinks();
    updatePreview();
  },
  removeLink: (el) => { draft.links.splice(Number(el.dataset.index), 1); renderLinks(); updatePreview(); },
  moveLinkUp: (el) => moveLink(Number(el.dataset.index), -1),
  moveLinkDown: (el) => moveLink(Number(el.dataset.index), 1),
  resetTheme: () => {
    draft.theme = { ...DEFAULT_THEME };
    fillForm();
    say('profileMessage', 'Цвета сброшены. Нажмите «Сохранить визитку».', 'text-slate-400');
  },
  saveProfile: () => save(),
};
