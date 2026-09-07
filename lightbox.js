(function () {
  var CSS = [
    // desktop/tablet only — openGalleryFor() itself re-checks the same
    // 700px cutoff at click time before ever opening, so a touch device
    // tapping one of these (which still fires a click event) is a no-op
    // there too; this cursor is just the visual hint for the pointer that
    // can actually hover it
    "[data-lightbox]{cursor:zoom-in;}",
    ".al-lightbox{position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center;padding:40px;opacity:0;pointer-events:none;transition:opacity .3s ease;}",
    ".al-lightbox.is-open{opacity:1;pointer-events:auto;}",
    ".al-lightbox-backdrop{position:absolute;inset:0;background:rgba(10,6,6,0.78);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);}",
    ".al-lightbox-stage{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:20px;max-width:min(88vw,1400px);}",
    ".al-lightbox-imgwrap{display:flex;align-items:center;justify-content:center;max-width:100%;}",
    // the reserved 88px below (only subtracted once a filmstrip is
    // actually showing — see .has-filmstrip) is the filmstrip's own
    // 48px thumb height plus its 4px*2 padding and this stage's 20px
    // gap, so the two together never exceed the 88vh budget
    ".al-lightbox-img{max-width:min(88vw,1400px);max-height:88vh;width:auto;height:auto;display:block;object-fit:contain;border-radius:12px;box-shadow:0 40px 100px -30px rgba(0,0,0,0.7);transform:scale(0.96);transition:transform .35s cubic-bezier(.22,1,.36,1);}",
    ".al-lightbox.has-filmstrip .al-lightbox-img{max-height:calc(88vh - 88px);}",
    ".al-lightbox.is-open .al-lightbox-img{transform:scale(1);}",
    // only rendered/shown when a case study has more than one lightbox
    // image on the page (see renderFilmstrip) — a single-image gallery
    // never gets an empty strip taking up space under it
    ".al-lightbox-filmstrip{flex:0 0 auto;display:flex;gap:10px;max-width:100%;overflow-x:auto;padding:4px;}",
    ".al-lightbox-thumb{flex:0 0 auto;width:64px;height:48px;padding:0;border-radius:6px;border:2px solid transparent;background:none;overflow:hidden;cursor:pointer;opacity:.5;transition:opacity .2s ease,border-color .2s ease;}",
    ".al-lightbox-thumb img{width:100%;height:100%;object-fit:cover;display:block;}",
    ".al-lightbox-thumb:hover{opacity:.8;}",
    // active/focus share the same border color rather than each inventing
    // its own — matches this control's own close-button rule of reusing
    // an existing token instead of a new one
    ".al-lightbox-thumb.is-active{opacity:1;border-color:rgba(255,255,255,0.7);}",
    ".al-lightbox-thumb:focus-visible{outline:none;border-color:rgba(255,255,255,0.7);}",
    // frosted glass, not the site's usual solid-fill close buttons — the
    // backdrop behind it is already the darkest, busiest part of the page,
    // so a solid button would just read as another opaque block on top of
    // it; the blur lets it sit as a control floating over the image itself.
    // Border matches the nav dock's own (.site-nav-dock in nav.js) —
    // var(--al-border) with the identical fallback — rather than a new
    // color invented just for this button
    ".al-lightbox-close{position:fixed;top:24px;right:24px;z-index:2;width:44px;height:44px;border-radius:50%;border:1px solid var(--al-border,rgba(255,255,255,0.13));background:rgba(255,255,255,0.1);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);color:#f4eeeb;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .25s ease,transform .3s cubic-bezier(.22,1,.36,1);}",
    ".al-lightbox-close:hover{background:rgba(255,255,255,0.2);}",
    // outline:none only, no added ring color of its own — the button's
    // always-visible border above is treated as enough of a focus
    // indicator here, rather than inventing a separate highlight color
    ".al-lightbox-close:focus-visible{outline:none;}",
    ".al-lightbox-close-stroke{transform-origin:7px 7px;transition:transform .3s cubic-bezier(.22,1,.36,1);}",
    ".al-lightbox-close:hover .al-lightbox-close-stroke:first-child{transform:rotate(90deg);}",
    ".al-lightbox-close:hover .al-lightbox-close-stroke:last-child{transform:rotate(-90deg);}",
    "@media (max-width:700px){.al-lightbox{display:none;}}"
  ].join('');
  var styleTag = document.createElement('style');
  styleTag.textContent = CSS;
  document.head.appendChild(styleTag);

  var CLOSE_SVG = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none">' +
    '<path class="al-lightbox-close-stroke" d="M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
    '<path class="al-lightbox-close-stroke" d="M1 1L13 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
  '</svg>';

  var MOBILE_MAX_WIDTH = 700;

  var overlay = null;
  var imgEl = null;
  var filmstripEl = null;
  var closeBtn = null;
  var backdrop = null;
  var gallery = [];
  var currentIndex = 0;
  var lastFocused = null;

  function close() {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function show(index) {
    currentIndex = index;
    var item = gallery[index];
    if (!item) return;
    imgEl.src = item.src;
    imgEl.alt = item.alt || '';
    Array.prototype.forEach.call(filmstripEl.children, function (thumb, i) {
      thumb.classList.toggle('is-active', i === index);
    });
    var activeThumb = filmstripEl.children[index];
    if (activeThumb && activeThumb.scrollIntoView) {
      activeThumb.scrollIntoView({ inline: 'center', block: 'nearest' });
    }
  }

  function step(delta) {
    if (gallery.length < 2) return;
    show((currentIndex + delta + gallery.length) % gallery.length);
  }

  function renderFilmstrip() {
    filmstripEl.innerHTML = '';
    var hasFilmstrip = gallery.length > 1;
    overlay.classList.toggle('has-filmstrip', hasFilmstrip);
    if (!hasFilmstrip) {
      filmstripEl.style.display = 'none';
      return;
    }
    filmstripEl.style.display = '';
    gallery.forEach(function (item, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'al-lightbox-thumb';
      btn.setAttribute('aria-label', 'Image ' + (i + 1) + ' of ' + gallery.length);
      btn.innerHTML = '<img src="' + item.src + '" alt="">';
      btn.addEventListener('click', function () { show(i); });
      filmstripEl.appendChild(btn);
    });
  }

  // built lazily on first open rather than at script load — most page
  // visits never open a lightbox at all
  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'al-lightbox';
    overlay.setAttribute('data-lightbox-overlay', '');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML =
      '<div class="al-lightbox-backdrop" data-lightbox-backdrop></div>' +
      '<div class="al-lightbox-stage">' +
        '<div class="al-lightbox-imgwrap"><img class="al-lightbox-img" data-lightbox-img alt=""></div>' +
        '<div class="al-lightbox-filmstrip" data-lightbox-filmstrip></div>' +
      '</div>' +
      '<button type="button" class="al-lightbox-close" data-lightbox-close aria-label="Close">' + CLOSE_SVG + '</button>';
    document.body.appendChild(overlay);

    backdrop = overlay.querySelector('[data-lightbox-backdrop]');
    imgEl = overlay.querySelector('[data-lightbox-img]');
    filmstripEl = overlay.querySelector('[data-lightbox-filmstrip]');
    closeBtn = overlay.querySelector('[data-lightbox-close]');

    backdrop.addEventListener('click', close);
    closeBtn.addEventListener('click', close);

    // one persistent listener rather than adding/removing per open — it's
    // a no-op whenever the overlay isn't actually open
    document.addEventListener('keydown', function (e) {
      if (!overlay.classList.contains('is-open')) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); return; }
    });
    // resizing down to mobile mid-view would otherwise leave the page
    // scroll-locked forever — the CSS hides the overlay itself at this
    // width already, this just releases the scroll lock along with it
    window.addEventListener('resize', function () {
      if (overlay.classList.contains('is-open') && window.innerWidth < MOBILE_MAX_WIDTH) close();
    });
  }

  // the gallery is whatever [data-lightbox] images share the clicked
  // image's own case study: [data-pv-inner] scopes it to one card inside
  // the sliding project popup (see project-viewer.js), so browsing one
  // project there never mixes in another card's images; plain <main>
  // scopes it the same way on a standalone case-study page
  function openGalleryFor(img) {
    ensureOverlay();
    var scopeRoot = img.closest('[data-pv-inner]') || img.closest('main') || document;
    var imgs = Array.prototype.slice.call(scopeRoot.querySelectorAll('[data-lightbox]'));
    gallery = imgs.map(function (el) { return { src: el.currentSrc || el.src, alt: el.alt || '' }; });
    var index = imgs.indexOf(img);
    lastFocused = img;
    renderFilmstrip();
    show(index === -1 ? 0 : index);
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  // exposed so project-viewer.js can re-run this against a popup card's
  // freshly-injected bodyHTML — that injection happens well after this
  // page's own AL.selfHeal below has already settled and stopped
  // watching, so without an explicit call here those images would never
  // get wired up
  function wireIn(root) {
    var imgs = Array.prototype.slice.call((root || document).querySelectorAll('[data-lightbox]'));
    imgs.forEach(function (img) {
      if (img.__lightboxWired) return;
      img.__lightboxWired = true;
      img.addEventListener('click', function () {
        if (window.innerWidth < MOBILE_MAX_WIDTH) return;
        openGalleryFor(img);
      });
    });
  }

  AL.wireLightboxIn = wireIn;
  // lets project-viewer.js's own Escape/ArrowLeft/ArrowRight handling
  // (closing the project popup, paging between projects) stand down
  // while this is open, since both listeners otherwise react to the
  // exact same keydown — Escape was closing the popup underneath the
  // lightbox in the same press, and the arrow keys were paging projects
  // instead of stepping through this gallery
  AL.isLightboxOpen = function () { return !!(overlay && overlay.classList.contains('is-open')); };
  AL.selfHeal(function () { wireIn(document); });
})();
