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
    // acts like a toast morphing out of the popup's own close button
    // rather than a bar laid over the image — it never actually travels
    // down to the image at all (an earlier version did, and sliding a
    // shape diagonally down across the photo on the way there just looked
    // like it was dragging over the content). Anchored via `right`/`top`
    // rather than `left` so it can grow leftward, out from under the
    // button, while that anchor edge itself never moves — the button
    // stays exactly where it is the whole time, this just reveals and
    // retracts from it.
    //
    // Its real width is measured once (see maybeScheduleHint) and never
    // changes again — the grow/shrink is done entirely with clip-path,
    // not by animating width itself. width (and padding, which used to
    // animate alongside it) are layout properties: changing either forces
    // the browser to recompute the page's layout on every single frame,
    // which is exactly what was reading as jagged rather than smooth.
    // clip-path only affects what's painted, never triggers layout, so
    // the same reveal reads as genuinely smooth.
    //
    // clip-path itself isn't left to a CSS transition here — animateHintShape
    // below drives it frame-by-frame instead, because the corner rounding
    // needs to shrink in direct proportion to how much is revealed at
    // every instant (round = revealed-width/2, easing toward 0 as it
    // finishes) rather than as a separate step once the reveal is done.
    // Two independent CSS transitions (reveal, then a delayed border-radius)
    // read as two separate motions glued together; a single JS-driven
    // value where the corner IS a function of the current reveal width
    // is what actually reads as one continuous, unforced-looking motion
    ".al-lightbox-hint{box-sizing:border-box;position:fixed;z-index:250;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 10px 10px 16px;background:#0A84FF;color:#fff;font-family:'Schibsted Grotesk',Helvetica,sans-serif;font-size: 0.8125rem;letter-spacing:-0.005em;box-shadow:0 16px 34px -16px rgba(0,0,0,0.4);opacity:0;pointer-events:none;transition:opacity .3s ease;}",
    ".al-lightbox-hint.is-visible{opacity:1;pointer-events:auto;}",
    ".al-lightbox-hint-text{white-space:nowrap;}",
    ".al-lightbox-hint-text,.al-lightbox-hint-close{transition:opacity .16s ease;}",
    // a manual close rather than relying only on the timeout/scroll/click
    // dismissal in maybeScheduleHint — that auto-dismiss is a judgment
    // call about when the visitor's likely done reading it, and this is
    // the guaranteed way out if that judgment call is wrong for them
    ".al-lightbox-hint-close{flex:0 0 auto;width:22px;height:22px;border:0;border-radius:50%;background:rgba(255,255,255,0.14);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .2s ease;}",
    ".al-lightbox-hint-close:hover{background:rgba(255,255,255,0.26);}",
    ".al-lightbox-hint-close:focus-visible{outline:none;box-shadow:0 0 0 2px rgba(255,255,255,0.5);}"
  ].join('');
  var styleTag = document.createElement('style');
  styleTag.textContent = CSS;
  document.head.appendChild(styleTag);

  var HINT_CLOSE_SVG = '<svg width="10" height="10" viewBox="0 0 14 14" fill="none">' +
    '<path d="M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
    '<path d="M1 1L13 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
  '</svg>';

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
  // entirely. Shown fresh on every page load that has a lightbox image
  // (not just the visitor's first ever visit) — hintDone below only stops
  // it from firing more than once per page view, e.g. after the visitor
  // has already opened the gallery or dismissed it
  //
  // First version of this used the site's shared bottom-of-screen toast —
  // technically fired correctly, but a disconnected pill next to the nav
  // dock is exactly where nobody is looking the instant a page loads, and
  // it was gone in 3.2s. A version after that anchored a bar directly over
  // the first clickable image instead, but that meant recomputing its
  // position against a moving target (the image scrolls, the popup's
  // slide-transitions resize things) and a wrong measurement there just
  // showed the bar floating over nothing in particular. This instead lives
  // as a toast morphing out of the popup's own close button — a fixed
  // point that isn't going anywhere — timed to when a lightbox image
  // actually scrolls into view, with its own close button rather than
  // relying only on the timeout/scroll/click dismissal below to clear it
  var hintTimer = null;
  var hintDone = false;
  var hintEl = null;
  var hintAnimFrame = null;
  // the anchor button's actual size at the moment the hint appeared, and
  // the bar's own full natural width (text + button + padding) measured
  // the same moment — hideHint reveals/hides between these two rather
  // than re-measuring either, since by the time it's dismissed the popup
  // could plausibly be mid slide-transition or gone altogether
  var hintCollapsedSize = 36;
  var hintFullWidth = 0;
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  // drives the whole reveal/hide as one continuous value rather than two
  // separate CSS transitions (a plain reveal, then a delayed border-radius
  // change) — those read as two glued-together motions even once each was
  // individually smooth. Here the corner radius is calculated as a direct
  // function of how much is currently revealed (roughly revealedWidth/2,
  // eased toward 0 as the motion finishes rather than lingering at a full
  // pill until the reveal is done) — since it's derived from the actual
  // revealed width at every frame instead of animating on its own
  // schedule, it can never end up rounder than that width would allow,
  // so there's nothing to visibly snap once the true shape catches up to
  // the declared radius. `growing` true reveals collapsed->full and eases
  // the roundness out from full to 0; false runs the same motion in
  // reverse for hideHint
  function animateHintShape(el, growing, durationMs, onDone) {
    cancelAnimationFrame(hintAnimFrame);
    var from = growing ? hintCollapsedSize : hintFullWidth;
    var to = growing ? hintFullWidth : hintCollapsedSize;
    var start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var raw = Math.min((ts - start) / durationMs, 1);
      var eased = easeOutCubic(raw);
      var revealed = from + (to - from) * eased;
      // 1 at the collapsed circle end of this motion, 0 at the full-bar
      // end, regardless of which direction is playing
      var roundness = growing ? (1 - eased) : eased;
      var hidden = Math.max(hintFullWidth - revealed, 0);
      el.style.clipPath = 'inset(0 0 0 ' + hidden + 'px round ' + (revealed / 2 * roundness) + 'px)';
      if (raw < 1) {
        hintAnimFrame = requestAnimationFrame(frame);
      } else if (onDone) {
        onDone();
      }
    }
    hintAnimFrame = requestAnimationFrame(frame);
  }
  function ensureHintEl() {
    if (hintEl) return hintEl;
    var el = document.createElement('div');
    el.className = 'al-lightbox-hint';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<span class="al-lightbox-hint-text">Click an image to view full size</span>' +
      '<button type="button" class="al-lightbox-hint-close" aria-label="Dismiss">' + HINT_CLOSE_SVG + '</button>';
    el.querySelector('.al-lightbox-hint-close').addEventListener('click', function (e) {
      e.stopPropagation();
      hideHint();
    });
    document.body.appendChild(el);
    hintEl = el;
    return el;
  }
  // dismissal — separate from stopScheduling below, which is the "don't
  // try to show this again this page view" bookkeeping and fires the
  // moment the hint is shown, not only once it's gone again. Retracts back
  // into the close button it grew out of rather than just fading out in
  // place — is-visible only comes off once that shape change has actually
  // finished, so the fade-out starts from the collapsed pill rather than
  // cutting the retraction short
  var HINT_HIDE_MS = 320;
  function hideHint() {
    if (!hintEl || !hintEl.classList.contains('is-visible') || hintEl.classList.contains('is-collapsing')) return;
    window.removeEventListener('scroll', hideHint);
    document.removeEventListener('click', hideHint, true);
    hintEl.classList.add('is-collapsing');
    hintEl.querySelector('.al-lightbox-hint-text').style.opacity = '0';
    hintEl.querySelector('.al-lightbox-hint-close').style.opacity = '0';
    animateHintShape(hintEl, false, HINT_HIDE_MS, function () {
      hintEl.classList.remove('is-visible', 'is-collapsing');
    });
  }
  function stopScheduling() {
    hintDone = true;
    clearTimeout(hintTimer);
  }
  // the fixed point this toast lives at for its whole life — the project
  // popup's own close button when one is open (getBoundingClientRect
  // gives viewport coordinates regardless of that button's own
  // position:absolute), or a fixed top-right point matching the site's
  // other floating close buttons' own convention (see .al-lightbox-close)
  // for a standalone case-study page, which has no popup close button to
  // anchor to at all
  function hintAnchorRect() {
    var closeBtn = document.querySelector('.al-pv-close');
    if (closeBtn) {
      var r = closeBtn.getBoundingClientRect();
      if (r.width > 0) return { top: r.top, right: r.right, size: r.width };
    }
    return { top: 24, right: window.innerWidth - 24, size: 44 };
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
  // requires the image's own top edge to be on screen, not just some
  // fraction of the image somewhere — this is the "has the visitor
  // actually scrolled to it yet" signal the toast waits for, even though
  // the toast itself always appears anchored to the close button rather
  // than the image (see hintAnchorRect)
  function isInViewport(el) {
    var r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0 || r.left >= window.innerWidth || r.right <= 0) return false;
    return r.top >= 0 && r.top < window.innerHeight - 40;
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
    if (hintDone || hintTimer) return;
    var attempts = 0;
    var fire = function () {
      var freshImg = firstVisibleLightboxImg(scopeRoot);
      attempts++;
      if (!freshImg) {
        if (attempts >= HINT_MAX_ATTEMPTS) { hintTimer = null; return; }
        hintTimer = setTimeout(fire, HINT_RETRY_MS);
        return;
      }
      hintTimer = null;
      hintDone = true;
      // freshImg only gated WHEN this fires (an image has to actually be
      // on screen) — WHERE the toast appears doesn't depend on it at all,
      // it always anchors to the close button (see hintAnchorRect)
      var el = ensureHintEl();
      var textEl = el.querySelector('.al-lightbox-hint-text');
      var closeBtn = el.querySelector('.al-lightbox-hint-close');
      var anchor = hintAnchorRect();
      hintCollapsedSize = anchor.size;
      el.style.left = 'auto';
      el.style.right = (window.innerWidth - anchor.right) + 'px';
      el.style.top = anchor.top + 'px';
      // the bar's real width is measured once here and fixed for the rest
      // of its life — width can't transition to/from "auto" anyway, and
      // more importantly this box never needs to change size again: the
      // whole reveal/hide from here on is done with clip-path (see the
      // CSS comment above and animateHintShape), which paints without
      // ever touching layout
      el.style.transition = 'none';
      el.style.clipPath = 'none';
      el.style.width = '';
      void el.offsetWidth;
      hintFullWidth = el.getBoundingClientRect().width;
      el.style.width = hintFullWidth + 'px';
      textEl.style.opacity = '0';
      closeBtn.style.opacity = '0';
      void el.offsetWidth; // commit the width/opacity above before anything transitions
      el.style.transition = '';
      el.classList.add('is-visible');
      animateHintShape(el, true, 420, function () {
        textEl.style.opacity = '';
        closeBtn.style.opacity = '';
      });
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
    // the rest of this page view either way
    stopScheduling();
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
