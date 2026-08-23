(function () {
  // a real 4-sided rectangular prism: each face is exactly as wide as the
  // source SVGs (47:140 ratio), so the square-cross-section radius is just
  // half that face width — the two SVGs are duplicated onto opposite faces
  // (front/back = name, left/right = portrait) so every quarter-turn lands
  // on a flush, gapless edge
  var CSS = [
    ".al-badge{position:fixed;top:28px;left:28px;z-index:45;perspective:900px;display:block;cursor:pointer;-webkit-tap-highlight-color:transparent;--face-h:130px;--face-w:43.64px;--r:21.82px;}",
    ".al-badge-inner{position:relative;width:var(--face-w);height:var(--face-h);transform-style:preserve-3d;will-change:transform;transition:transform 1s cubic-bezier(.65,0,.35,1);}",
    ".al-badge-face{position:absolute;top:0;left:0;width:var(--face-w);height:var(--face-h);backface-visibility:hidden;}",
    ".al-badge-face svg{display:block;width:100%;height:100%;}",
    ".al-badge-face-front{transform:translateZ(var(--r));}",
    ".al-badge-face-right{transform:rotateY(90deg) translateZ(var(--r));}",
    ".al-badge-face-back{transform:rotateY(180deg) translateZ(var(--r));}",
    ".al-badge-face-left{transform:rotateY(270deg) translateZ(var(--r));}",
    "@media (max-width:700px){.al-badge{top:18px;left:18px;--face-h:92px;--face-w:30.89px;--r:15.44px;}}",
    "@media (prefers-reduced-motion: reduce){.al-badge-inner{transition:none;}}",
    "@media (max-width:1400px){.al-badge{display:none;}}"
  ].join('');
  var styleTag = document.createElement('style');
  styleTag.textContent = CSS;
  document.head.appendChild(styleTag);

  function homeHref() {
    var root = document.querySelector('[data-screen-label]');
    var label = root ? root.getAttribute('data-screen-label') : '';
    return label === 'Hero' ? '#top' : 'Ayub%20Leon%20-%20Landing%20Page.dc.html';
  }

  function badgeHTML() {
    return (
      '<a class="al-badge" href="' + homeHref() + '" aria-label="Go to home">' +
        '<div class="al-badge-inner" data-badge-inner>' +
          '<div class="al-badge-face al-badge-face-front" data-face="name"></div>' +
          '<div class="al-badge-face al-badge-face-right" data-face="portrait"></div>' +
          '<div class="al-badge-face al-badge-face-back" data-face="name"></div>' +
          '<div class="al-badge-face al-badge-face-left" data-face="portrait"></div>' +
        '</div>' +
      '</a>'
    );
  }

  // faces start empty and get the actual SVG markup injected once fetched
  // (rather than <img src>) so the hover rule above can reach into the
  // paths directly — an <img> renders its SVG in an opaque sub-document
  // that page CSS can't touch at all
  var svgTextCache = {};
  function loadSvgText(url) {
    if (!svgTextCache[url]) svgTextCache[url] = fetch(url).then(function (r) { return r.text(); });
    return svgTextCache[url];
  }
  function fillFaces(el) {
    var nameFaces = el.querySelectorAll('[data-face="name"]');
    var portraitFaces = el.querySelectorAll('[data-face="portrait"]');
    loadSvgText('images/badge-name.svg').then(function (svg) {
      nameFaces.forEach(function (f) { f.innerHTML = svg; });
    });
    loadSvgText('images/badge-portrait.svg').then(function (svg) {
      portraitFaces.forEach(function (f) { f.innerHTML = svg; });
    });
  }

  // decode once into an AudioBuffer up front (mirrors nav.js's whoosh/click
  // sounds) so playback on hover starts with near-zero latency instead of
  // fetching/decoding fresh on every mouseenter
  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  var audioCtx = AudioCtx ? new AudioCtx() : null;
  var tapBuffer = null;
  if (audioCtx) {
    fetch('sounds/icon-tap.mp3')
      .then(function (r) { return r.arrayBuffer(); })
      .then(function (data) { return audioCtx.decodeAudioData(data); })
      .then(function (buf) { tapBuffer = buf; })
      .catch(function () {});
  }
  function playIconTap() {
    if (!audioCtx || !tapBuffer) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    var src = audioCtx.createBufferSource();
    src.buffer = tapBuffer;
    var gain = audioCtx.createGain();
    gain.gain.value = 0.6;
    src.connect(gain).connect(audioCtx.destination);
    src.start(0);
  }
  // browsers only unlock a suspended AudioContext on a real user gesture
  // (click/tap/keypress) — hovering the badge doesn't count as one, so
  // resuming only inside playIconTap() can leave it permanently silent if
  // a hover happens to be the very first interaction on the page. Grab the
  // first genuine gesture anywhere on the page to unlock it early instead.
  if (audioCtx) {
    var unlockAudio = function () {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      document.removeEventListener('pointerdown', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('pointerdown', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
  }

  // the first wheel/touch scroll attempt is held (preventDefault) and
  // dragged 1:1 with the scroll motion instead of snapping instantly —
  // letting go past DRAG_THRESHOLD*COMMIT_RATIO of real scroll effort
  // completes the turn, letting go short of it springs back to the
  // starting face; hovering and keyboard scroll keys still do an instant
  // full spin (no natural "hold and release" gesture to drag). Once the
  // page is scrolled all the way down, every further swipe/wheel tick can
  // drag another turn the same way (rate-limited by `spinning`/`dragging`).
  var SPIN_MS = 1000;
  var DRAG_THRESHOLD = 200;   // px of cumulative scroll effort for a full turn
  var COMMIT_RATIO = 0.5;     // past this fraction, letting go completes the turn
  var DRAG_IDLE_MS = 220;     // gap since the last scroll tick that counts as "letting go"
  var SETTLE_MS = 320;        // full-arc duration for the commit/revert snap
  var SCROLL_KEYS = { ' ': 1, 'Spacebar': 1, 'PageDown': 1, 'PageUp': 1, 'ArrowDown': 1, 'ArrowUp': 1, 'Home': 1, 'End': 1 };

  function isAtBottom() {
    var doc = document.documentElement;
    return window.innerHeight + window.scrollY >= doc.scrollHeight - 2;
  }

  function initSpin(badgeEl, inner) {
    var angle = 0;
    var spinning = false;
    var scrollTriggered = false;

    var dragging = false;
    var dragDelta = 0;
    var idleTimer = null;
    var lastTouchY = null;

    function spinOnce() {
      if (spinning || dragging) return;
      spinning = true;
      angle += 90;
      inner.style.transform = 'rotateY(' + angle + 'deg)';
      setTimeout(function () {
        spinning = false;
      }, SPIN_MS);
    }

    function startDrag() {
      dragging = true;
      dragDelta = 0;
      scrollTriggered = true;
      inner.style.transition = 'none';
    }

    function updateDrag(delta) {
      dragDelta += delta;
      if (dragDelta < 0) dragDelta = 0;
      if (dragDelta > DRAG_THRESHOLD) dragDelta = DRAG_THRESHOLD;
      var progress = dragDelta / DRAG_THRESHOLD;
      inner.style.transform = 'rotateY(' + (angle + progress * 90) + 'deg)';
      clearTimeout(idleTimer);
      idleTimer = setTimeout(endDrag, DRAG_IDLE_MS);
    }

    // resolves the held gesture once scroll ticks stop arriving: past the
    // commit ratio it finishes the turn, short of it it springs back —
    // either way the snap duration scales with the remaining arc so a
    // near-complete drag settles fast and a barely-started one does too
    function endDrag() {
      if (!dragging) return;
      var progress = dragDelta / DRAG_THRESHOLD;
      var commit = progress >= COMMIT_RATIO;
      var remaining = commit ? 1 - progress : progress;
      var duration = Math.max(120, remaining * SETTLE_MS);
      dragging = false;
      dragDelta = 0;
      if (commit) angle += 90;
      inner.style.transition = 'transform ' + duration + 'ms cubic-bezier(.22,1,.36,1)';
      inner.style.transform = 'rotateY(' + angle + 'deg)';
      setTimeout(function () {
        inner.style.transition = '';
      }, duration);
    }

    // the drag/threshold gate applies to every turn a scroll can trigger —
    // the very first scroll on the page, and every repeat once the page is
    // scrolled all the way down — so real scroll effort is always required
    // to complete a turn, not just on that first attempt. at the bottom
    // this must only catch further downward attempts (delta > 0) — since
    // isAtBottom() only goes false once the page has actually moved away
    // from the bottom, hijacking upward scroll ticks there too would
    // preventDefault() every attempt to leave the bottom and trap the page
    function canTrigger(delta) {
      if (!scrollTriggered) return true;
      return isAtBottom() && delta > 0;
    }
    function guard(e, delta) {
      if (dragging) {
        e.preventDefault();
        updateDrag(delta);
        return;
      }
      if (spinning) {
        e.preventDefault();
        return;
      }
      if (canTrigger(delta)) {
        startDrag();
        e.preventDefault();
        updateDrag(delta);
      }
    }
    function guardWheel(e) { guard(e, e.deltaY); }
    function guardTouch(e) {
      var t = e.touches && e.touches[0];
      if (!t || lastTouchY == null) return;
      var delta = lastTouchY - t.clientY;
      lastTouchY = t.clientY;
      guard(e, delta);
    }
    function guardTouchStart(e) {
      var t = e.touches && e.touches[0];
      lastTouchY = t ? t.clientY : null;
    }
    function guardTouchEnd() {
      lastTouchY = null;
    }
    function guardKey(e) {
      if (!SCROLL_KEYS[e.key]) return;
      if (dragging || spinning) {
        e.preventDefault();
        return;
      }
      if (!scrollTriggered) {
        scrollTriggered = true;
        spinOnce();
        e.preventDefault();
        return;
      }
      if (isAtBottom()) spinOnce();
    }

    window.addEventListener('wheel', guardWheel, { passive: false });
    window.addEventListener('touchstart', guardTouchStart, { passive: true });
    window.addEventListener('touchmove', guardTouch, { passive: false });
    window.addEventListener('touchend', guardTouchEnd, { passive: true });
    window.addEventListener('keydown', guardKey, { passive: false });
    badgeEl.addEventListener('mouseenter', spinOnce);
    badgeEl.addEventListener('mouseenter', playIconTap);
  }

  function fill(el) {
    if (el.childElementCount > 0) return;
    el.innerHTML = badgeHTML();
    fillFaces(el);
    initSpin(el.querySelector('.al-badge'), el.querySelector('[data-badge-inner]'));
  }

  function fillAll() {
    document.querySelectorAll('[data-badge-mount]').forEach(fill);
  }

  fillAll();

  // the host framework can re-render and clear this mount point shortly
  // after first paint; keep it self-healing rather than racing its timing
  var observer = new MutationObserver(fillAll);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('load', function () {
    fillAll();
    setTimeout(function () { observer.disconnect(); }, 3000);
  });
})();
