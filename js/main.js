(() => {
  document.documentElement.classList.add('js');
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('#main-nav');
  const setMenu = open => {
    header.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && header.classList.contains('nav-open')) {
      setMenu(false);
      toggle.focus();
    }
  });
  matchMedia('(max-width: 740px)').addEventListener('change', () => setMenu(false));
  const scroll = () => header.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', scroll, { passive: true });
  scroll();

  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('entered');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    document.querySelectorAll('.reveal').forEach(node => observer.observe(node));
  }

  const menu = document.querySelector('#menu-sections');
  const signatures = document.querySelector('#signatures');
  if (!menu && !signatures) return;

  const copy = window.WookLanguage;
  const tags = {
    v: ['V', 'Vegetariano', 'Vegetarian'],
    hot: ['P', 'Picante', 'Spicy'],
    gf: ['SG', 'Sin gluten', 'Gluten-free']
  };
  function render() {
    const { locale } = copy;
    const read = pair => copy.text(...pair);
    const price = amount => copy.text(amount + ' €', '€' + amount);
    const photo = item => item.image ? '<img src="assets/img/' + item.image + '.jpg" alt="' + read(item.name) + '" loading="lazy">' : '';
    if (signatures) {
      const dishes = window.WookMenu.flatMap(section => section.items);
      signatures.innerHTML = ['atun', 'wok', 'pato'].map(image => {
        const dish = dishes.find(item => item.image === image);
        return '<article>' + photo(dish) + '<h3>' + read(dish.name) + '</h3><p>' + read(dish.description) + '</p></article>';
      }).join('');
      return;
    }
    const badge = (key, legend = false) => {
      const [abbr, es, en] = tags[key];
      const label = copy.text(es, en);
      const code = key === 'hot' && locale === 'en' ? 'S' : key === 'gf' && locale === 'en' ? 'GF' : abbr;
      return '<span class="tag">' + (legend ? code + ' · ' : '') + label + '</span>';
    };
    document.querySelector('#diet-legend').innerHTML = Object.keys(tags).map(key => badge(key, true)).join('');
    document.querySelector('#menu-nav').innerHTML = window.WookMenu.map(section =>
      '<a href="#' + section.id + '">' + read(section.title) + '</a>').join('');
    menu.innerHTML = window.WookMenu.map(section =>
      '<section id="' + section.id + '"><h2>' + read(section.title) + '</h2><div class="menu-grid">' +
      section.items.map(item => '<article class="dish">' + photo(item) + '<div class="dish-info"><div class="dish-top"><h3>' +
        read(item.name) + '</h3><strong>' + price(item.price) + '</strong></div><p>' + read(item.description) + '</p>' +
        (item.tags.length ? '<div class="tags">' + item.tags.map(key => badge(key)).join('') + '</div>' : '') + '</div></article>').join('') +
      '</div></section>').join('');
  }
  document.addEventListener('wook:language', render);
  render();
})();
