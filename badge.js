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
  var hoverBuffer = null;
  if (audioCtx) {
    fetch('sounds/hover-drop.mp3')
      .then(function (r) { return r.arrayBuffer(); })
      .then(function (data) { return audioCtx.decodeAudioData(data); })
      .then(function (buf) { hoverBuffer = buf; })
      .catch(function () {});
  }
  function playHoverDrop() {
    if (!audioCtx || !hoverBuffer) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    var src = audioCtx.createBufferSource();
    src.buffer = hoverBuffer;
    var gain = audioCtx.createGain();
    gain.gain.value = 0.6;
    src.connect(gain).connect(audioCtx.destination);
    src.start(0);
  }
  // browsers only unlock a suspended AudioContext on a real user gesture
  // (click/tap/keypress) — hovering the badge doesn't count as one, so
  // resuming only inside playHoverDrop() can leave it permanently silent if
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

  // the first wheel/touch/key scroll attempt is held (preventDefault) for
  // the animation's duration instead of letting the page move, then
  // released so scrolling continues as normal; hovering spins it too, and
  // can repeat on every hover since it isn't gating anything; once the page
  // is scrolled all the way down, every further swipe/wheel/key tick spins
  // it again (naturally rate-limited to one spin per gesture by `spinning`)
  var SPIN_MS = 1000;
  var SCROLL_KEYS = { ' ': 1, 'Spacebar': 1, 'PageDown': 1, 'PageUp': 1, 'ArrowDown': 1, 'ArrowUp': 1, 'Home': 1, 'End': 1 };

  function isAtBottom() {
    var doc = document.documentElement;
    return window.innerHeight + window.scrollY >= doc.scrollHeight - 2;
  }

  function initSpin(badgeEl, inner) {
    var angle = 0;
    var spinning = false;
    var scrollTriggered = false;
    var lockUntil = 0;

    function spinOnce() {
      if (spinning) return;
      spinning = true;
      angle += 90;
      inner.style.transform = 'rotateY(' + angle + 'deg)';
      setTimeout(function () {
        spinning = false;
      }, SPIN_MS);
    }

    function guard(e) {
      if (!scrollTriggered) {
        scrollTriggered = true;
        spinOnce();
        lockUntil = Date.now() + SPIN_MS;
        e.preventDefault();
        return;
      }
      if (Date.now() < lockUntil) {
        e.preventDefault();
        return;
      }
      if (isAtBottom()) spinOnce();
    }
    function guardKey(e) {
      if (SCROLL_KEYS[e.key]) guard(e);
    }

    window.addEventListener('wheel', guard, { passive: false });
    window.addEventListener('touchmove', guard, { passive: false });
    window.addEventListener('keydown', guardKey, { passive: false });
    badgeEl.addEventListener('mouseenter', spinOnce);
    badgeEl.addEventListener('mouseenter', playHoverDrop);
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
