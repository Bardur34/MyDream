import { registerActions, initActionDelegation } from '../core/actions.js';
import { startProtectedPage } from '../core/protectedPage.js';
import { migrateLegacyKeys } from '../services/localStore.js';
import { actions as settingsActions } from '../features/settings/settings.js';
import { actions as tabsActions, initSettingsTabs } from '../features/settings/settingsTabs.js';
import { actions as profileActions, initProfileEditor } from '../features/settings/profileEditor.js';
import { initTelegramSection } from '../features/settings/telegramLink.js';

// Новый раздел настроек: его actions добавляются сюда, а блок — в нужную вкладку в notes/settings/index.html
registerActions({
  ...settingsActions,
  ...tabsActions,
  ...profileActions,
});

migrateLegacyKeys();
initActionDelegation();

startProtectedPage((user) => {
  document.getElementById('accountName').textContent = user.email || 'Владелец';
  initSettingsTabs();
  initTelegramSection();
  initProfileEditor();
});
