(() => {
  const supported = ['es', 'en'];
  let locale = 'en';
  try {
    const remembered = localStorage.getItem('wook-language');
    if (supported.includes(remembered)) locale = remembered;
  } catch {}
  const currentUrl = new URL(location.href);
  const requested = currentUrl.searchParams.get('lang');
  if (supported.includes(requested)) locale = requested;

  const attributes = ['alt', 'aria-label', 'placeholder'];
  const translated = [...document.querySelectorAll('[data-en], [data-en-alt], [data-en-aria-label], [data-en-placeholder]')].map(node => ({
    node,
    spanish: node.hasAttribute('data-en') ? node.textContent : null,
    values: attributes.filter(attr => node.hasAttribute('data-en-' + attr)).map(attr => [attr, node.getAttribute(attr)])
  }));
  const desc = document.querySelector('meta[name="description"]');
  const defaultTitle = document.title;
  const defaultDesc = desc.content;

  function apply() {
    const english = locale === 'en';
    document.documentElement.lang = locale;
    document.title = english ? document.querySelector('meta[name="title-en"]').content : defaultTitle;
    desc.content = english ? document.querySelector('meta[name="description-en"]').content : defaultDesc;
    translated.forEach(({node, spanish, values}) => {
      if (spanish !== null) node.textContent = english ? node.dataset.en : spanish;
      values.forEach(([attr, value]) => node.setAttribute(attr, english ? node.getAttribute('data-en-' + attr) : value));
    });
    document.querySelectorAll('[data-lang]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.lang === locale));
    });
    // Carry the language even when file URLs isolate storage by page.
    document.querySelectorAll('a[href$=".html"], a[href*=".html#"], a[data-page-link]').forEach(link => {
      link.dataset.pageLink = '';
      const url = new URL(link.getAttribute('href'), location.href);
      link.setAttribute('href', url.pathname.split('/').pop() + '?lang=' + locale + url.hash);
    });
    document.dispatchEvent(new Event('wook:language'));
  }

  window.WookLanguage = {
    get locale() { return locale; },
    get intl() { return locale === 'en' ? 'en-GB' : 'es-ES'; },
    text(es, en) { return locale === 'en' ? en : es; }
  };
  document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => {
    locale = button.dataset.lang;
    try { localStorage.setItem('wook-language', locale); } catch {}
    try {
      const url = new URL(location.href);
      url.searchParams.set('lang', locale);
      history.replaceState(null, '', url);
    } catch {}
    apply();
  }));
  apply();
})();
