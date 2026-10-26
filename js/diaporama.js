/* Exécuté dans le <head>, avant l'affichage : active la mise en page diaporama et applique le thème mémorisé */
document.documentElement.classList.add('js');
try {
  var themeMemorise = localStorage.getItem('theme-diaporama');
  if (themeMemorise === 'dark' || themeMemorise === 'light') document.documentElement.setAttribute('data-theme', themeMemorise);
} catch (e) {}

/* Le reste attend que le document soit chargé */
document.addEventListener('DOMContentLoaded', function () {
(function () {
  var main = document.getElementById('diapositives');
  var conteneur = document.getElementById('conteneur');
  var slides = Array.prototype.slice.call(conteneur.querySelectorAll('.slide'));
  var total = slides.length;
  var precedente = document.getElementById('precedente');
  var suivante = document.getElementById('suivante');
  var position = document.getElementById('position');
  var annonce = document.getElementById('annonce');
  var bascule = document.getElementById('bascule');
  var btnSommaire = document.getElementById('btn-sommaire');
  var panneau = document.getElementById('panneau-sommaire');
  var liste = document.getElementById('liste-sommaire');
  var pied = document.getElementById('pied');
  var barreHaut = document.getElementById('barre-haut');
  var barreBas = document.getElementById('barre-bas');
  var titreBase = document.title;
  var courant = 0;
  var modeTout = false;

  function titreDe(n) { return slides[n].querySelector('h2').textContent.replace(/\s+/g, ' ').trim(); }

  /* Hauteur réelle des barres fixes (elle varie avec le zoom et la taille du texte) */
  function mesurerBarres() {
    document.documentElement.style.setProperty('--h-haut', barreHaut.offsetHeight + 'px');
    document.documentElement.style.setProperty('--h-bas', barreBas.offsetHeight + 'px');
  }
  mesurerBarres();
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(mesurerBarres);
    ro.observe(barreHaut);
    ro.observe(barreBas);
  } else {
    window.addEventListener('resize', mesurerBarres);
  }

  /* Mode clair / sombre */
  var racine = document.documentElement;
  var btnTheme = document.getElementById('btn-theme');
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function themeActif() { return racine.getAttribute('data-theme') || (mq && mq.matches ? 'dark' : 'light'); }
  function majTheme() {
    var cible = themeActif() === 'dark' ? 'light' : 'dark';
    btnTheme.setAttribute('data-cible', cible);
    btnTheme.setAttribute('title', cible === 'dark' ? 'Mode sombre' : 'Mode clair');
  }
  btnTheme.addEventListener('click', function () {
    var nouveau = themeActif() === 'dark' ? 'light' : 'dark';
    racine.setAttribute('data-theme', nouveau);
    try { localStorage.setItem('theme-diaporama', nouveau); } catch (err) {}
    majTheme();
  });
  if (mq) { if (mq.addEventListener) mq.addEventListener('change', majTheme); else if (mq.addListener) mq.addListener(majTheme); }
  majTheme();

  /* Sommaire */
  slides.forEach(function (s, n) {
    var li = document.createElement('li');
    var a = document.createElement('a');
    a.href = '#' + s.id;
    a.textContent = titreDe(n);
    li.appendChild(a);
    liste.appendChild(li);
  });
  var liens = Array.prototype.slice.call(liste.querySelectorAll('a'));

  function ouvrirSommaire() {
    panneau.hidden = false;
    btnSommaire.setAttribute('aria-expanded', 'true');
  }
  function fermerSommaire(rendreFocus) {
    if (panneau.hidden) return;
    panneau.hidden = true;
    btnSommaire.setAttribute('aria-expanded', 'false');
    if (rendreFocus) btnSommaire.focus();
  }
  btnSommaire.addEventListener('click', function () {
    if (panneau.hidden) ouvrirSommaire(); else fermerSommaire(false);
  });
  document.addEventListener('click', function (e) {
    if (!panneau.hidden && !panneau.contains(e.target) && !btnSommaire.contains(e.target)) fermerSommaire(false);
  });

  /* Affichage d'une diapositive */
  function afficher(n, options) {
    options = options || {};
    if (n < 0 || n >= total) return;
    var focusDansAncienne = slides[courant].contains(document.activeElement);
    courant = n;
    slides.forEach(function (s, k) { s.hidden = !modeTout && k !== n; });
    position.textContent = (n + 1) + ' sur ' + total;
    precedente.setAttribute('aria-disabled', n === 0 ? 'true' : 'false');
    suivante.setAttribute('aria-disabled', n === total - 1 ? 'true' : 'false');
    liens.forEach(function (a, k) { if (k === n) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    if (!modeTout) {
      main.scrollTop = 0;
      document.title = 'Diapositive ' + (n + 1) + ' sur ' + total + (n === 0 ? '' : ' : ' + titreDe(n)) + ' | ' + titreBase;
      try { if (history.replaceState) history.replaceState(null, '', '#' + slides[n].id); } catch (err) {}
    }
    if (options.annoncer) annonce.textContent = 'Diapositive ' + (n + 1) + ' sur ' + total + ' : ' + titreDe(n);
    if (options.focusTitre || focusDansAncienne) slides[n].querySelector('h2').focus();
  }

  function indexDepuisHash() {
    var id = '';
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (err) {}
    for (var k = 0; k < total; k++) { if (slides[k].id === id) return k; }
    return -1;
  }

  precedente.addEventListener('click', function () { if (!modeTout && courant > 0) afficher(courant - 1, { annoncer: true }); });
  suivante.addEventListener('click', function () { if (!modeTout && courant < total - 1) afficher(courant + 1, { annoncer: true }); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panneau.hidden) { fermerSommaire(true); return; }
    if (modeTout || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    var cible = e.target;
    if (cible.closest && cible.closest('input, textarea, select, [contenteditable="true"], .tableau')) return;
    if (e.key === 'ArrowRight' && courant < total - 1) { e.preventDefault(); afficher(courant + 1, { annoncer: true }); }
    else if (e.key === 'ArrowLeft' && courant > 0) { e.preventDefault(); afficher(courant - 1, { annoncer: true }); }
  });

  liste.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a) return;
    var n = liens.indexOf(a);
    if (n < 0) return;
    e.preventDefault();
    fermerSommaire(false);
    if (modeTout) { slides[n].scrollIntoView(); slides[n].querySelector('h2').focus(); return; }
    afficher(n, { annoncer: false, focusTitre: true });
  });

  /* Toutes les diapositives / une à la fois */
  bascule.addEventListener('click', function () {
    modeTout = !modeTout;
    bascule.setAttribute('aria-pressed', modeTout ? 'true' : 'false');
    conteneur.className = modeTout ? 'mode-tout' : 'mode-diapo';
    pied.hidden = !modeTout;
    position.hidden = modeTout;
    precedente.hidden = modeTout;
    suivante.hidden = modeTout;
    if (modeTout) {
      slides.forEach(function (s) { s.hidden = false; });
      document.title = titreBase;
      annonce.textContent = 'Toutes les diapositives sont affichées';
    } else {
      afficher(courant, { annoncer: true });
    }
  });

  window.addEventListener('hashchange', function () {
    var n = indexDepuisHash();
    if (n >= 0 && n !== courant && !modeTout) afficher(n, { annoncer: true, focusTitre: true });
  });

  pied.hidden = true;
  var depart = indexDepuisHash();
  afficher(depart >= 0 ? depart : 0);
})();
});
