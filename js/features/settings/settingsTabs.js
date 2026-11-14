// Вкладки настроек: «Визитка» и «Заметки». Выбранная вкладка хранится в адресе (#visit / #notes),
// поэтому после обновления страницы остаётся открытой.
const TABS = ['visit', 'notes'];
const ACTIVE = 'flex-1 py-1.5 text-xs font-medium rounded-lg bg-purple-600 text-white transition';
const IDLE = 'flex-1 py-1.5 text-xs font-medium rounded-lg text-slate-400 hover:text-white transition';

const cap = (tab) => tab[0].toUpperCase() + tab.slice(1);

export function showSettingsTab(tab) {
  TABS.forEach(name => {
    document.getElementById(`settingsTab${cap(name)}`).classList.toggle('hidden', name !== tab);
    document.getElementById(`settingsTab${cap(name)}Btn`).className = name === tab ? ACTIVE : IDLE;
  });
  history.replaceState(null, '', `#${tab}`);
}

export function initSettingsTabs() {
  const fromAddress = location.hash.slice(1);
  showSettingsTab(TABS.includes(fromAddress) ? fromAddress : 'visit');
}

export const actions = {
  switchSettingsTab: (el) => showSettingsTab(el.dataset.tab),
};
