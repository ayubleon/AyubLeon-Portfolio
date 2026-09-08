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
    // never gets an empty row of controls taking up space under it
    ".al-lightbox-filmstrip-row{display:none;align-items:center;gap:10px;max-width:100%;}",
    ".al-lightbox.has-filmstrip .al-lightbox-filmstrip-row{display:flex;}",
    // min-width:0 is load-bearing here — without it a flex child with
    // overflow-x:auto refuses to shrink below its content width, which
    // would push the prev/next buttons off the edge of the stage instead
    // of letting the strip itself scroll
    ".al-lightbox-filmstrip{flex:1 1 auto;min-width:0;display:flex;gap:10px;overflow-x:auto;padding:4px;}",
    ".al-lightbox-thumb{flex:0 0 auto;width:64px;height:48px;padding:0;border-radius:6px;border:2px solid transparent;background:none;overflow:hidden;cursor:pointer;opacity:.5;transition:opacity .2s ease,border-color .2s ease;}",
    ".al-lightbox-thumb img{width:100%;height:100%;object-fit:cover;display:block;}",
    ".al-lightbox-thumb:hover{opacity:.8;}",
    // active/focus share the same border color rather than each inventing
    // its own — matches this control's own close-button rule of reusing
    // an existing token instead of a new one
    ".al-lightbox-thumb.is-active{opacity:1;border-color:rgba(255,255,255,0.7);}",
    ".al-lightbox-thumb:focus-visible{outline:none;border-color:rgba(255,255,255,0.7);}",
    // same frosted-glass treatment as the close button below, just smaller
    // — a matching pair of controls either side of the strip rather than a
    // new visual language just for these two
    ".al-lightbox-filmstrip-nav{flex:0 0 auto;width:32px;height:32px;border-radius:50%;border:1px solid var(--al-border,rgba(255,255,255,0.13));background:rgba(255,255,255,0.1);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);color:#f4eeeb;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .25s ease;}",
    ".al-lightbox-filmstrip-nav:hover{background:rgba(255,255,255,0.2);}",
    ".al-lightbox-filmstrip-nav:focus-visible{outline:none;border-color:rgba(255,255,255,0.7);}",
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
    "@media (max-width:700px){.al-lightbox{display:none;}}",
    // anchored to the first clickable image itself (see maybeScheduleHint
    // below) rather than a corner of the screen — a disconnected toast
    // was easy to miss entirely, since nobody's looking at the bottom of
    // the screen the instant a page loads. This sits right where the
    // visitor's eyes already are
    ".al-lightbox-hint{position:fixed;z-index:250;transform:translate(-50%,8px);opacity:0;pointer-events:none;transition:opacity .35s ease,transform .35s cubic-bezier(.22,1,.36,1);}",
    ".al-lightbox-hint.is-visible{opacity:1;transform:translate(-50%,0);}",
    ".al-lightbox-hint.arrow-up{transform:translate(-50%,-8px);}",
    ".al-lightbox-hint.arrow-up.is-visible{transform:translate(-50%,0);}",
    ".al-lightbox-hint-pill{position:relative;display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:999px;background:var(--al-card,#1C1C1E);color:#f4eeeb;font-family:'Schibsted Grotesk',Helvetica,sans-serif;font-size: 0.8125rem;letter-spacing:-0.005em;white-space:nowrap;box-shadow:0 16px 34px -16px rgba(0,0,0,0.7);}",
    // default: hint sits above the image, arrow at the pill's own bottom
    // edge pointing down at it
    ".al-lightbox-hint-pill::after{content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);border:6px solid transparent;border-top-color:var(--al-card,#1C1C1E);}",
    // too close to the top of the viewport for that — hint sits below the
    // image instead, so the arrow flips to the pill's top edge pointing up
    ".al-lightbox-hint.arrow-up .al-lightbox-hint-pill::after{top:auto;bottom:100%;border-top-color:transparent;border-bottom-color:var(--al-card,#1C1C1E);}"
  ].join('');
  var styleTag = document.createElement('style');
  styleTag.textContent = CSS;
  document.head.appendChild(styleTag);

  var CLOSE_SVG = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none">' +
    '<path class="al-lightbox-close-stroke" d="M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
    '<path class="al-lightbox-close-stroke" d="M1 1L13 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
  '</svg>';

  var PREV_SVG = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none">' +
    '<path d="M9 3L5 7L9 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>';
  var NEXT_SVG = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none">' +
    '<path d="M5 3L9 7L5 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
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
    // the row's own display (and so the prev/next buttons alongside the
    // strip) follows this same class in CSS, rather than being toggled
    // here separately — one flag, one place, for whether there's anything
    // to page through at all
    overlay.classList.toggle('has-filmstrip', hasFilmstrip);
    if (!hasFilmstrip) return;
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
        '<div class="al-lightbox-filmstrip-row">' +
          '<button type="button" class="al-lightbox-filmstrip-nav" data-lightbox-prev aria-label="Previous image">' + PREV_SVG + '</button>' +
          '<div class="al-lightbox-filmstrip" data-lightbox-filmstrip></div>' +
          '<button type="button" class="al-lightbox-filmstrip-nav" data-lightbox-next aria-label="Next image">' + NEXT_SVG + '</button>' +
        '</div>' +
      '</div>' +
      '<button type="button" class="al-lightbox-close" data-lightbox-close aria-label="Close">' + CLOSE_SVG + '</button>';
    document.body.appendChild(overlay);

    backdrop = overlay.querySelector('[data-lightbox-backdrop]');
    imgEl = overlay.querySelector('[data-lightbox-img]');
    filmstripEl = overlay.querySelector('[data-lightbox-filmstrip]');
    closeBtn = overlay.querySelector('[data-lightbox-close]');
    var prevBtn = overlay.querySelector('[data-lightbox-prev]');
    var nextBtn = overlay.querySelector('[data-lightbox-next]');

    backdrop.addEventListener('click', close);
    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', function () { step(-1); });
    nextBtn.addEventListener('click', function () { step(1); });

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

  // click-to-enlarge isn't a pattern visitors expect by default on a
  // portfolio site, so the cursor:zoom-in hover cue alone is easy to miss
  // entirely. This surfaces it once, the very first time this browser
  // ever sees a lightbox image, then never again — localStorage rather
  // than sessionStorage, since the point is teaching the pattern once for
  // good, not re-reminding on every return visit.
  //
  // First version of this used the site's shared bottom-of-screen toast —
  // technically fired correctly (verified via the localStorage flag
  // flipping), but a disconnected pill next to the nav dock is exactly
  // where nobody is looking the instant a page loads, and it was gone in
  // 3.2s. This anchors directly to the first clickable image itself, so
  // it sits right where the visitor's eyes already are
  var HINT_KEY = 'al-lightbox-hint-seen';
  var hintTimer = null;
  var hintDone = false;
  var hintEl = null;
  function hintAlreadySeen() {
    try { return localStorage.getItem(HINT_KEY) === '1'; } catch (e) { return false; }
  }
  function ensureHintEl() {
    if (hintEl) return hintEl;
    var el = document.createElement('div');
    el.className = 'al-lightbox-hint';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<div class="al-lightbox-hint-pill">Click to view full size</div>';
    document.body.appendChild(el);
    hintEl = el;
    return el;
  }
  // dismissal only (fading it back out) — separate from markHintSeen
  // below, which is about the "teach once, ever" bookkeeping and fires
  // the moment the hint is shown, not only once it's gone again
  function hideHint() {
    if (!hintEl) return;
    hintEl.classList.remove('is-visible');
    window.removeEventListener('scroll', hideHint);
    document.removeEventListener('click', hideHint, true);
  }
  function markHintSeen() {
    hintDone = true;
    clearTimeout(hintTimer);
    try { localStorage.setItem(HINT_KEY, '1'); } catch (e) {}
  }
  function positionHint(img) {
    var el = ensureHintEl();
    var rect = img.getBoundingClientRect();
    el.style.left = (rect.left + rect.width / 2) + 'px';
    if (rect.top > 60) {
      // sits above the image, arrow pointing down at it
      el.classList.remove('arrow-up');
      el.style.top = 'auto';
      el.style.bottom = (window.innerHeight - rect.top + 12) + 'px';
    } else {
      // too close to the top of the viewport for that — sits below the
      // image instead, arrow flipped to point up at it
      el.classList.add('arrow-up');
      el.style.bottom = 'auto';
      el.style.top = (rect.bottom + 12) + 'px';
    }
  }
  // held back so it reads as a considered tip rather than firing the
  // instant an image scrolls into the DOM. Deliberately doesn't close
  // over the `img` passed in for the whole 1800ms wait — support.js's
  // React boot() can tear down and replace this entire subtree with
  // fresh nodes shortly after first parse (see its own comment in
  // support.js), which would leave a captured reference pointing at an
  // already-detached element by the time this fires. Re-querying fresh
  // at fire time sidesteps that regardless of exactly when the swap
  // happens, rather than depending on winning a timing race against it.
  // hintTimer is always reset to null before returning — a stale, still-
  // truthy hintTimer from a fire that bailed early (nothing left to show,
  // reduced motion, etc.) would otherwise block every future retry for
  // the rest of the page's life, since the guard above treats any
  // non-null hintTimer as "already scheduled".
  //
  // scopeRoot carries through the same root wireIn() was called with —
  // without it, the re-query above fell back to searching the whole
  // document, which inside the project popup could land on a
  // [data-lightbox] image belonging to a different (hidden or off-screen)
  // card instead of the one actually visible in the open popup, pointing
  // the hint at nothing the visitor could see
  function isInViewport(el) {
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.top < window.innerHeight && r.bottom > 0 &&
      r.left < window.innerWidth && r.right > 0;
  }
  // the first DOM match isn't necessarily the right one to point at — a
  // case study's first lightbox image can sit well down the page (or, in
  // the project popup, below the fold of a card that opens scrolled to
  // the top), and anchoring a hint to an image nobody can currently see
  // defeats the entire point of it. This picks the first match that's
  // actually on screen right now
  function firstVisibleLightboxImg(scopeRoot) {
    var imgs = (scopeRoot || document).querySelectorAll('[data-lightbox]');
    for (var i = 0; i < imgs.length; i++) {
      if (isInViewport(imgs[i])) return imgs[i];
    }
    return null;
  }
  // retried rather than given up on after one miss — the visitor may
  // simply not have scrolled a lightbox image into view yet 1800ms after
  // the page/popup settled. Capped so a page or popup the visitor closes
  // before ever scrolling one into view doesn't leave this polling forever
  var HINT_RETRY_MS = 600;
  var HINT_MAX_ATTEMPTS = 20;
  function maybeScheduleHint(scopeRoot) {
    if (hintDone || hintTimer || hintAlreadySeen()) return;
    var attempts = 0;
    var fire = function () {
      if (hintAlreadySeen()) { hintTimer = null; return; }
      var freshImg = firstVisibleLightboxImg(scopeRoot);
      attempts++;
      if (!freshImg) {
        if (attempts >= HINT_MAX_ATTEMPTS) { hintTimer = null; return; }
        hintTimer = setTimeout(fire, HINT_RETRY_MS);
        return;
      }
      hintTimer = null;
      markHintSeen();
      positionHint(freshImg);
      var el = ensureHintEl();
      requestAnimationFrame(function () { el.classList.add('is-visible'); });
      window.addEventListener('scroll', hideHint, { passive: true, once: true });
      document.addEventListener('click', hideHint, { capture: true, once: true });
      setTimeout(hideHint, 4500);
    };
    hintTimer = setTimeout(fire, 1800);
  }

  // the gallery is whatever [data-lightbox] images share the clicked
  // image's own case study: [data-pv-inner] scopes it to one card inside
  // the sliding project popup (see project-viewer.js), so browsing one
  // project there never mixes in another card's images; plain <main>
  // scopes it the same way on a standalone case-study page
  function openGalleryFor(img) {
    // clicking an image is itself proof the visitor already found the
    // feature — cancels the hint if it hasn't fired yet, and skips it for
    // good either way
    markHintSeen();
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
    if (imgs.length && window.innerWidth >= MOBILE_MAX_WIDTH) maybeScheduleHint(root);
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
