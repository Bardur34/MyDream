import { getAuthClient } from '../../services/auth.js';
import { PROFILE_TABLE, AVATAR_BUCKET, STORAGE_KEYS } from '../../config.js';

const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
export const AVATAR_TYPES = Object.keys(EXTENSIONS);

// Настройки визитки (читать может любой — это публичные данные). null, если строки ещё нет.
export async function fetchProfile() {
  const client = await getAuthClient();
  const { data, error } = await client.from(PROFILE_TABLE)
    .select('display_name, description, avatar_path, links, theme, updated_at')
    .eq('id', 1).maybeSingle();
  if (error) throw error;
  return data;
}

// Сохранить может только вошедший владелец (политика RLS). Возвращает сохранённую строку.
export async function saveProfile({ display_name, description, avatar_path, links, theme }) {
  const client = await getAuthClient();
  const row = { id: 1, display_name, description, avatar_path, links, theme, updated_at: new Date().toISOString() };
  const { error } = await client.from(PROFILE_TABLE).upsert(row);
  if (error) throw error;
  return row;
}

// Новый файл каждый раз: адрес меняется, и браузеры не показывают старую картинку из кэша
export async function uploadAvatar(file) {
  const client = await getAuthClient();
  const path = `avatar/avatar_${Date.now()}.${EXTENSIONS[file.type]}`;
  const { error } = await client.storage.from(AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
  if (error) throw error;
  return path;
}

// Не бросает ошибок: лишний файл в хранилище не должен ломать сохранение
export async function deleteAvatar(path) {
  if (!path) return;
  try {
    const client = await getAuthClient();
    const { error } = await client.storage.from(AVATAR_BUCKET).remove([path]);
    if (error) console.error('Не удалось удалить аватарку из хранилища', error);
  } catch (error) {
    console.error(error);
  }
}

// Копия последней визитки в браузере: страница открывается сразу, без пустого экрана, пока идёт запрос
export function readProfileCache() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.profile) || 'null'); } catch (e) { return null; }
}
export function writeProfileCache(profile) {
  try { localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile)); } catch (e) { /* хранилище недоступно */ }
}
