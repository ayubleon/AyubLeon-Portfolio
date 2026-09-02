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
    "--al-green:#EF4418;",
    "--al-green-hover:#F37352;",
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

  // covers the page with a veil matching its own black background until
  // the DOM actually goes quiet, instead of revealing on a fixed timer.
  // supports.js's own boot() swap is already smoothed by the
  // @view-transition rule in each page's <head>, but that only masks a
  // ~250-400ms browser-controlled window — the AL.selfHeal cascade above
  // (nav/footer/badge/signature/heading patches, each re-running on every
  // mutation from every other one) can keep touching the DOM well past
  // that, and when it does, the tail end becomes visible as a flash on an
  // already-settled-looking page. This waits for QUIET_MS with no
  // qualifying mutation before revealing, so it naturally clears fast
  // when the page is actually done and only holds longer when there's
  // real churn left to hide — capped at MAX_WAIT_MS so a page that never
  // fully quiets (a stray hover-driven style tweak, say) still reveals
  // rather than staying hidden. Lives here rather than in each page's own
  // early inline script because it has to watch the exact same
  // childList/subtree mutations AL.selfHeal itself reacts to, so the two
  // are one mechanism split across two functions, not two unrelated ones.
  // The veil element itself is static markup outside <x-dc> in each
  // page's <body> (see its own comment there) — sitting outside <x-dc>
  // means boot()'s dc.replaceWith swap can never touch it
  (function installSettleVeil() {
    var veil = document.querySelector('[data-settle-veil]');
    if (!veil) return;
    var QUIET_MS = 220;
    var MAX_WAIT_MS = 1400;
    var revealed = false;
    var quietTimer = null;
    var observer;
    function reveal() {
      if (revealed) return;
      revealed = true;
      clearTimeout(quietTimer);
      observer.disconnect();
      veil.style.opacity = '0';
      veil.addEventListener('transitionend', function () { veil.remove(); }, { once: true });
    }
    function scheduleReveal() {
      clearTimeout(quietTimer);
      quietTimer = setTimeout(reveal, QUIET_MS);
    }
    observer = new MutationObserver(scheduleReveal);
    observer.observe(document.body, { childList: true, subtree: true });
    scheduleReveal();
    setTimeout(reveal, MAX_WAIT_MS);
  })();

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

  // shared by every cursor-following tooltip (the About page's Behance
  // trigger, the footer's Figma key): follows the pointer at a fixed
  // offset, anchored to the right of the cursor by default or the left
  // when `side` is 'left' (for a trigger that already sits at the right
  // edge of the screen, so the tag has nowhere to grow into on that side).
  // Either way the result is clamped so it never overflows the viewport —
  // an unclamped offset still pushes the tag off-screen top/bottom, or
  // off the opposite edge on a narrow window
  AL.positionCursorTooltip = function (tip, e, offsetX, offsetY, side) {
    var rect = tip.getBoundingClientRect();
    var x = side === 'left' ? e.clientX - offsetX - rect.width : e.clientX + offsetX;
    var y = e.clientY + offsetY;
    x = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - rect.height - 8));
    tip.style.transform = 'translate(' + x + 'px,' + y + 'px)';
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
      if (!AL.audioCtx || AL.audioMuted) return;
      // before the page's first real gesture, the context is suspended
      // and calling resume() here — from a hover, not a click/tap/key —
      // is exactly the case the browser's autoplay policy logs "not
      // allowed to start" for, since hovering doesn't count as a
      // gesture. Silently doing nothing is correct anyway: this sound
      // would only land dropped regardless (see unlockAudio's own
      // comment below), so there's nothing to gain from the attempt,
      // only console noise. Once a real gesture has happened anywhere on
      // the page, unlockAudio has already resumed the context — this
      // still calls resume() itself for a sound triggered directly by
      // that same gesture, in case its own resume() call hasn't
      // resolved yet, which is a real user-gesture context and doesn't
      // log the warning
      if (AL.audioCtx.state === 'suspended') {
        if (AL.audioGestureSeen) AL.audioCtx.resume().then(startWhenReady);
      } else {
        startWhenReady();
      }
    };
  };
  // shared instances for sounds used by more than one component file —
  // switch.mp3 alone was independently fetched and decoded up to four
  // times per page load (nav.js, footer.js, project-viewer.js, and the
  // About page's own script each built their own player for the exact
  // same file), and icon-tap.mp3 twice (nav.js, badge.js). One shared
  // instance per file means one fetch/decode each, reused by whichever
  // components need it, sitewide
  AL.playSwitch = AL.makeSoundPlayer('sounds/switch.mp3', 0.35);
  AL.playIconTap = AL.makeSoundPlayer('sounds/icon-tap.mp3', 0.6);

  // sitewide sound on/off, persisted across page loads (every internal
  // navigation is a full reload, not an SPA route change, so without this
  // the choice would silently reset on every click) — read once at
  // startup rather than inside makeSoundPlayer's play(), since that gets
  // called far more often than the preference could possibly change.
  // Starts muted on a genuinely fresh visit; unlockAudio below turns it
  // on the moment the user's first real gesture lands, so sound arrives
  // as a natural side effect of using the page rather than something
  // they have to go find a toggle for first — but only until they've
  // actually touched the toggle themselves, at which point AL.audioExplicit
  // makes their own choice stick instead of being overridden by that
  var AUDIO_MUTE_KEY = 'al-audio-muted';
  var AUDIO_EXPLICIT_KEY = 'al-audio-explicit';
  // touch devices skip the mute/explicit-choice machinery below entirely —
  // there's no toggle for them to have set a preference with (see the
  // button-creation guard further down), sound is just always on
  var isTouchDevice = window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  AL.audioExplicit = (function () {
    try { return localStorage.getItem(AUDIO_EXPLICIT_KEY) === '1'; } catch (e) { return false; }
  })();
  AL.audioMuted = isTouchDevice ? false : (AL.audioExplicit ? (function () {
    try { return localStorage.getItem(AUDIO_MUTE_KEY) === '1'; } catch (e) { return true; }
  })() : true);

  var AUDIO_TOGGLE_CSS = [
    // no card/pill of its own — plain white content, blended against
    // whatever's actually behind it (mix-blend-mode:difference inverts
    // per-pixel: white-on-white reads black, white-on-black stays white),
    // so it reads clearly over every section without tracking each
    // section's own background color by hand. isolation:isolate keeps
    // the label/state/icon compositing together as one group first, so
    // they blend against the page as a single unit rather than each
    // possibly double-blending against each other where they'd overlap
    ".al-audio-toggle{position:fixed;top:28px;right:28px;z-index:46;display:inline-flex;align-items:center;gap:7px;border:0;background:none;padding:0;color:#fff;font-family:Poppins,Helvetica,sans-serif;font-size:13px;font-weight:600;letter-spacing:-0.005em;cursor:pointer;-webkit-tap-highlight-color:transparent;mix-blend-mode:difference;isolation:isolate;opacity:0;transform:scale(0.85);animation:alAudioEnter .5s cubic-bezier(.22,1,.36,1) .15s forwards;}",
    ".al-audio-toggle:hover{opacity:0.7;}",
    "@keyframes alAudioEnter{to{opacity:1;transform:scale(1);}}",
    "@media (prefers-reduced-motion: reduce){.al-audio-toggle{animation:none;opacity:1;transform:none;}}",
    // lighter than the state word ("On"/"Off") next to it, so the label
    // reads as a quieter caption and the actual state carries the visual
    // weight — no separate muted color for this instead, since a
    // partially transparent color would blend against the page
    // differently than the solid state text/icon next to it
    ".al-audio-toggle-label{font-weight:400;}",
    ".al-audio-toggle svg{display:block;flex:0 0 auto;}",
    "@media (max-width:700px){.al-audio-toggle{top:18px;right:18px;font-size:12px;}}"
  ].join('');
  var audioToggleStyle = document.createElement('style');
  audioToggleStyle.textContent = AUDIO_TOGGLE_CSS;
  document.head.appendChild(audioToggleStyle);

  var AUDIO_ON_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/></svg>';
  var AUDIO_OFF_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="12" x2="21" y2="12"/></svg>';

  function renderAudioToggle(btn) {
    btn.innerHTML =
      '<span class="al-audio-toggle-label">Audio</span>' +
      (AL.audioMuted ? 'Off' : 'On') +
      (AL.audioMuted ? AUDIO_OFF_SVG : AUDIO_ON_SVG);
    btn.setAttribute('aria-pressed', AL.audioMuted ? 'false' : 'true');
    btn.setAttribute('aria-label', AL.audioMuted ? 'Turn sound effects on' : 'Turn sound effects off');
  }
  // one shared instance per page, built directly rather than through a
  // dedicated mount + self-heal pair like nav/footer/badge — nothing here
  // depends on page-specific content (AL.pageLinks() etc.), so there's no
  // rebuild-wave risk of it losing its wiring the way those do. Skipped
  // entirely on touch devices — sound is just always on there (see
  // AL.audioMuted above), so there's nothing for a toggle to control
  if (!isTouchDevice && !document.querySelector('[data-audio-toggle]')) {
    var audioToggleBtn = document.createElement('button');
    audioToggleBtn.type = 'button';
    audioToggleBtn.className = 'al-audio-toggle';
    audioToggleBtn.setAttribute('data-audio-toggle', '1');
    renderAudioToggle(audioToggleBtn);
    audioToggleBtn.addEventListener('click', function () {
      AL.audioMuted = !AL.audioMuted;
      AL.audioExplicit = true;
      try {
        localStorage.setItem(AUDIO_MUTE_KEY, AL.audioMuted ? '1' : '0');
        localStorage.setItem(AUDIO_EXPLICIT_KEY, '1');
      } catch (e) {}
      renderAudioToggle(audioToggleBtn);
    });
    document.body.appendChild(audioToggleBtn);
  }

  // browsers only unlock a suspended AudioContext on a real user gesture
  // (click/tap/keypress) — hovering doesn't count, so a hover-triggered
  // sound (the badge, the contact card avatar) can land permanently silent
  // if a hover happens to be the very first interaction on the page. Grab
  // the first genuine gesture anywhere on the page to unlock it early.
  AL.audioGestureSeen = false;
  if (AL.audioCtx) {
    var unlockAudio = function () {
      AL.audioGestureSeen = true;
      // the site's own optimistic default (see AL.audioMuted's own
      // comment above): turn sound on now that the user has actually
      // engaged with the page, unless they've already made an explicit
      // choice of their own via the toggle — that choice always wins
      if (!AL.audioExplicit && AL.audioMuted) {
        AL.audioMuted = false;
        try { localStorage.setItem(AUDIO_MUTE_KEY, '0'); } catch (e) {}
        if (audioToggleBtn) renderAudioToggle(audioToggleBtn);
      }
      if (AL.audioCtx.state === 'suspended') AL.audioCtx.resume();
      // iOS Safari specifically: calling resume() alone can leave the
      // context reporting "running" while still producing no audible
      // output, until an actual buffer source has been created and
      // started synchronously inside this same real-gesture handler —
      // a documented WebKit quirk, not covered by resume() on its own.
      // A single silent sample does that unlock with nothing audible
      var silent = AL.audioCtx.createBuffer(1, 1, 22050);
      var src = AL.audioCtx.createBufferSource();
      src.buffer = silent;
      src.connect(AL.audioCtx.destination);
      src.start(0);
      document.removeEventListener('pointerdown', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('pointerdown', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
  }

  // iOS Safari tints its status bar and bottom bar to match whatever's
  // scrolled to the very top/bottom edge of the viewport, live, as you
  // scroll — not a flat theme-color. Every page here that's solid black
  // start to finish never shows this. The landing page isn't: its cream
  // Curiosity section and blue Cycle section can each sit pinned at that
  // edge for a long scroll stretch, which is what shows up there as a
  // stray colored bar. These two strips pin flat black exactly over the
  // safe-area insets so there's always solid black under Safari's chrome
  // regardless of what's scrolled beneath. Added here (JS-appended to
  // body) rather than as static markup in the landing page itself, since
  // support.js's own rebuild of the page strips markup placed outside
  // its recognized component structure — appending after the fact is
  // the same reason the audio toggle above is built this way too. Only
  // the landing page opts into viewport-fit=cover (needed for the insets
  // to be non-zero at all on iOS), so on every other page — and on every
  // non-iOS browser regardless — the insets resolve to 0px and these
  // strips take up no space
  var safeAreaBarCSS = 'position:fixed;left:0;right:0;height:env(safe-area-inset-top);background:#000;z-index:999999;pointer-events:none;';
  var safeAreaTop = document.createElement('div');
  safeAreaTop.setAttribute('aria-hidden', 'true');
  safeAreaTop.style.cssText = safeAreaBarCSS + 'top:0;';
  document.body.appendChild(safeAreaTop);
  var safeAreaBottom = document.createElement('div');
  safeAreaBottom.setAttribute('aria-hidden', 'true');
  safeAreaBottom.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:env(safe-area-inset-bottom);background:#000;z-index:999999;pointer-events:none;';
  document.body.appendChild(safeAreaBottom);
})();
