// Обычный (не модульный) скрипт: подключается СРАЗУ ПОСЛЕ скрипта Tailwind CDN.
// Подменяет шкалы slate, purple и цвет white на переменные из css/theme.css, чтобы тему можно было менять на лету.
(function () {
  if (typeof tailwind === 'undefined') return;   // CDN Tailwind не загрузился — настраивать нечего
  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const scale = (name) => Object.fromEntries(
    shades.map(shade => [shade, `rgb(var(--${name}-${shade}) / <alpha-value>)`])
  );
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          slate: scale('slate'),
          purple: scale('purple'),
          white: 'rgb(var(--white) / <alpha-value>)',
        },
      },
    },
  };
})();
