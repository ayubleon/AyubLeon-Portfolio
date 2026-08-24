(function () {
  window.AL = window.AL || {};

  // design tokens used across nav.js/footer.js/badge.js/signature.js/
  // case-labels.js/project-viewer.js — one definition instead of the same
  // literals hand-repeated in every file's own CSS string
  var tokenStyle = document.createElement('style');
  tokenStyle.textContent = [
    ":root{",
    "--al-card:#1C1C1E;",
    "--al-card-hover:#2A2A2C;",
    // the light-surface counterpart to --al-card — used by the About
    // page's hero card and the project-viewer white card, an off-white
    // rather than pure #fff
    "--al-card-light:#FDFBF8;",
    "--al-green:#73C41E;",
    "--al-green-hover:#8fe030;",
    "--al-text-muted:rgba(239,232,229,0.45);",
    "--al-section-title:rgba(239,232,229,0.66);",
    "--al-border:rgba(255,255,255,0.13);",
    "--al-border-strong:rgba(255,255,255,0.16);",
    "}"
  ].join('');
  document.head.appendChild(tokenStyle);

  // self-healing mount/patch runner: support.js can rebuild the page's
  // <main> content from its own internal template after first paint, in
  // one or more waves — this re-runs `runFn` on every DOM mutation until a
  // settle window past `load` has passed with nothing left to react to,
  // then stops watching instead of leaving an observer running forever.
  // Used by every self-mounting component on the site (nav, footer,
  // badge, the About page's signature/heading patches, the case study
  // label/card patches).
  AL.selfHeal = function (runFn, settleMs) {
    runFn();
    var observer = new MutationObserver(runFn);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('load', function () {
      runFn();
      setTimeout(function () { observer.disconnect(); }, settleMs || 3000);
    });
  };

  // clipboard copy with a document.execCommand fallback for contexts
  // without navigator.clipboard (older Safari, non-secure origins).
  // execCommand can fail silently (returns false) as well as throw, so
  // both are treated as failure and reported via `fail` rather than just
  // dropped — otherwise a user who clicks "copy" and gets nothing has no
  // way to know it didn't work.
  AL.fallbackCopy = function (text, done, fail) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var copied = false;
    try { copied = document.execCommand('copy'); } catch (err) {}
    document.body.removeChild(ta);
    if (copied) {
      done();
    } else if (fail) {
      fail();
    }
  };
  AL.copyText = function (text, done, fail) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { AL.fallbackCopy(text, done, fail); });
    } else {
      AL.fallbackCopy(text, done, fail);
    }
  };

  // one shared toast, built lazily on first use, reused by both the nav
  // contact card and the footer's "Copy Email" link instead of each
  // building its own identical instance
  var toastEl = null;
  function ensureToast() {
    if (toastEl) return toastEl;
    var styleTag = document.createElement('style');
    styleTag.textContent = "@keyframes alToastSpin{from{transform:translate(-50%,-50%) rotate(0deg);}to{transform:translate(-50%,-50%) rotate(360deg);}}";
    document.head.appendChild(styleTag);
    var wrap = document.createElement('div');
    wrap.setAttribute('role', 'status');
    wrap.setAttribute('aria-live', 'polite');
    wrap.style.cssText = 'position:fixed;left:50%;bottom:92px;z-index:60;padding:1.6px;border-radius:999px;overflow:hidden;isolation:isolate;box-shadow:0 30px 70px -26px rgba(0,0,0,0.98);opacity:0;transform:translate(-50%,18px);pointer-events:none;transition:opacity .45s cubic-bezier(.22,1,.36,1),transform .55s cubic-bezier(.22,1,.36,1);';
    wrap.innerHTML =
      '<div data-toast-glow aria-hidden="true" style="position:absolute;left:50%;top:50%;width:260%;aspect-ratio:1;background:conic-gradient(from 0deg, rgba(255,255,255,0) 0deg, rgba(255,255,255,0) 200deg, rgba(255,255,255,0.55) 292deg, rgba(255,255,255,0.92) 330deg, #ffffff 348deg, rgba(255,255,255,0) 360deg);animation:alToastSpin 2.6s linear infinite;"></div>' +
      '<div style="position:relative;display:flex;align-items:center;padding:14px 24px;border-radius:999px;background:var(--al-card,#1C1C1E);font-family:\'Schibsted Grotesk\',Helvetica,sans-serif;font-size:14px;letter-spacing:-0.005em;color:#f4eeeb;">' +
        '<span data-toast-text style="font-family:Poppins">Copied to Clipboard</span>' +
      '</div>';
    document.body.appendChild(wrap);
    toastEl = wrap;
    return wrap;
  }
  var toastTimer;
  // `opts.glow` (default true) toggles the spinning conic-gradient border —
  // off for error messages, since that shimmer reads as a celebratory
  // "success" cue and would be misleading on a failure toast
  AL.showToast = function (msg, opts) {
    var wrap = ensureToast();
    var textEl = wrap.querySelector('[data-toast-text]');
    if (textEl) textEl.textContent = msg;
    var glowEl = wrap.querySelector('[data-toast-glow]');
    if (glowEl) glowEl.style.display = (opts && opts.glow === false) ? 'none' : '';
    wrap.style.opacity = '1';
    wrap.style.transform = 'translate(-50%, 0)';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      wrap.style.opacity = '0';
      wrap.style.transform = 'translate(-50%, 18px)';
    }, 2000);
  };

  // page-context nav targets, shared by nav.js and footer.js — footer
  // just ignores the extra `active` field nav.js uses to highlight itself
  AL.pageLinks = function () {
    var root = document.querySelector('[data-screen-label]');
    var label = root ? root.getAttribute('data-screen-label') : '';
    if (label === 'Hero') {
      return { home: '#top', work: '#work', about: 'Ayub Leon - About.dc.html', active: 'home' };
    }
    if (label === 'About') {
      return { home: 'Ayub%20Leon%20-%20Landing%20Page.dc.html', work: 'Ayub%20Leon%20-%20Landing%20Page.dc.html#work', about: '#top', active: 'about' };
    }
    return { home: 'Ayub%20Leon%20-%20Landing%20Page.dc.html', work: 'Ayub%20Leon%20-%20Landing%20Page.dc.html#work', about: 'Ayub Leon - About.dc.html', active: 'work' };
  };

  // buffered Web Audio playback on one shared AudioContext sitewide —
  // plain `new Audio().play()` re-fetches/decodes on every call, slow
  // enough on mobile to land audibly behind the animation, so each sound
  // is decoded once into an AudioBuffer up front and just scheduled from
  // there, which starts with near-zero latency
  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  AL.audioCtx = AudioCtx ? new AudioCtx() : null;
  AL.makeSoundPlayer = function (url, volume) {
    var buffer = null;
    var ready = null;
    if (AL.audioCtx) {
      ready = fetch(url)
        .then(function (r) { return r.arrayBuffer(); })
        .then(function (data) { return AL.audioCtx.decodeAudioData(data); })
        .then(function (buf) { buffer = buf; })
        .catch(function () {});
    }
    function start() {
      if (!buffer) return;
      var src = AL.audioCtx.createBufferSource();
      src.buffer = buffer;
      var gain = AL.audioCtx.createGain();
      gain.gain.value = volume;
      src.connect(gain).connect(AL.audioCtx.destination);
      src.start(0);
    }
    // on a freshly loaded page the fetch+decode may still be in flight —
    // resume the (possibly still-locked) context on this gesture regardless,
    // and queue the actual start for the moment decoding finishes instead of
    // silently dropping the very first click/tap/hover of each page
    function startWhenReady() {
      if (buffer) start();
      else if (ready) ready.then(start);
    }
    return function play() {
      if (!AL.audioCtx) return;
      // starting a buffer source while the context is still (technically)
      // suspended, even a moment after calling resume() on it, silently
      // drops the sound on some mobile WebKit versions instead of queuing
      // it for once resume() actually finishes — so on that path, wait for
      // resume()'s own promise before starting, rather than firing both in
      // the same tick
      if (AL.audioCtx.state === 'suspended') AL.audioCtx.resume().then(startWhenReady);
      else startWhenReady();
    };
  };
  // browsers only unlock a suspended AudioContext on a real user gesture
  // (click/tap/keypress) — hovering doesn't count, so a hover-triggered
  // sound (the badge, the contact card avatar) can land permanently silent
  // if a hover happens to be the very first interaction on the page. Grab
  // the first genuine gesture anywhere on the page to unlock it early.
  if (AL.audioCtx) {
    var unlockAudio = function () {
      if (AL.audioCtx.state === 'suspended') AL.audioCtx.resume();
      document.removeEventListener('pointerdown', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('pointerdown', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
  }
})();
