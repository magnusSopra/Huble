(() => {
  let preference;
  try {
    preference = localStorage.getItem('kundle.theme');
  } catch {
    preference = null;
  }
  const theme = preference === 'light' || preference === 'dark'
    ? preference
    : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
})();