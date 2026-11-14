import { registerActions, initActionDelegation } from '../core/actions.js';
import { hasSavedSession } from '../services/auth.js';
import { actions as loginActions, initLoginModal, openLoginModal } from '../features/auth/loginModal.js';
import { NOTES_URL } from '../config.js';
import { migrateLegacyKeys } from '../services/localStore.js';
import { renderProfile } from '../features/profile/profileView.js';
import { sanitizeProfile, DEFAULT_PROFILE } from '../features/profile/profileModel.js';
import { fetchProfile, readProfileCache, writeProfileCache } from '../features/profile/profileApi.js';

// Причины, по которым дневник вернул человека на визитку (см. goToVisit в pages/notes.js)
const REASONS = {
  expired: 'Вход устарел. Войдите заново.',
};

registerActions({
  ...loginActions,
  // Аватарка: есть сохранённый вход — идём в дневник (он сам перепроверит вход на сервере
  // и вернёт сюда, если вход недействителен); нет — открываем окно входа.
  onAvatarClick: () => {
    if (hasSavedSession()) location.href = NOTES_URL;
    else openLoginModal();
  },
});

migrateLegacyKeys();
initActionDelegation();
initLoginModal();

const reason = new URLSearchParams(location.search).get('e');
if (reason) {
  history.replaceState({}, '', location.pathname);
  if (REASONS[reason]) openLoginModal(REASONS[reason]);
}

// ---- Визитка ----
const profileRoot = document.getElementById('profileRoot');

function showProfile(profile) {
  renderProfile(profileRoot, profile, { interactive: true });
  document.body.style.background = sanitizeProfile(profile).theme.bg;   // чтобы фон был и за краями страницы
  profileRoot.style.visibility = 'visible';
}

async function loadProfile() {
  const cached = readProfileCache();
  if (cached) showProfile(cached);              // сразу, пока идёт запрос

  try {
    const fresh = await fetchProfile();
    if (fresh) {
      writeProfileCache(fresh);
      showProfile(fresh);
    } else if (!cached) {
      showProfile(DEFAULT_PROFILE);
    }
  } catch (error) {
    console.error(error);
    if (!cached) showProfile(DEFAULT_PROFILE);  // база недоступна — показываем стандартную визитку
  }
}

loadProfile();
