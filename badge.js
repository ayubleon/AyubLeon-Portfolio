(function () {
  // a real 4-sided rectangular prism: each face is exactly as wide as the
  // source SVGs (47:140 ratio), so the square-cross-section radius is just
  // half that face width — the two SVGs are duplicated onto opposite faces
  // (front/back = name, left/right = portrait) so every quarter-turn lands
  // on a flush, gapless edge
  var CSS = [
    ".al-badge{position:fixed;top:28px;left:28px;z-index:45;perspective:900px;--face-h:130px;--face-w:43.64px;--r:21.82px;}",
    ".al-badge-inner{position:relative;width:var(--face-w);height:var(--face-h);transform-style:preserve-3d;will-change:transform;}",
    ".al-badge-inner.is-spinning{animation:alBadgeSpin 1s cubic-bezier(.65,0,.35,1);}",
    "@keyframes alBadgeSpin{from{transform:rotateY(0deg);}to{transform:rotateY(360deg);}}",
    ".al-badge-face{position:absolute;top:0;left:0;width:var(--face-w);height:var(--face-h);backface-visibility:hidden;}",
    ".al-badge-face img{display:block;width:100%;height:100%;}",
    ".al-badge-face-front{transform:translateZ(var(--r));}",
    ".al-badge-face-right{transform:rotateY(90deg) translateZ(var(--r));}",
    ".al-badge-face-back{transform:rotateY(180deg) translateZ(var(--r));}",
    ".al-badge-face-left{transform:rotateY(270deg) translateZ(var(--r));}",
    "@media (max-width:700px){.al-badge{top:18px;left:18px;--face-h:92px;--face-w:30.89px;--r:15.44px;}}",
    "@media (prefers-reduced-motion: reduce){.al-badge-inner.is-spinning{animation:none;}}",
    "@media (max-width:1400px){.al-badge{display:none;}}"
  ].join('');
  var styleTag = document.createElement('style');
  styleTag.textContent = CSS;
  document.head.appendChild(styleTag);

  var BADGE_HTML =
    '<div class="al-badge" aria-hidden="true">' +
      '<div class="al-badge-inner" data-badge-inner>' +
        '<div class="al-badge-face al-badge-face-front"><img src="images/badge-name.svg" alt=""></div>' +
        '<div class="al-badge-face al-badge-face-right"><img src="images/badge-portrait.svg" alt=""></div>' +
        '<div class="al-badge-face al-badge-face-back"><img src="images/badge-name.svg" alt=""></div>' +
        '<div class="al-badge-face al-badge-face-left"><img src="images/badge-portrait.svg" alt=""></div>' +
      '</div>' +
    '</div>';

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
    var spinning = false;
    var scrollTriggered = false;
    var lockUntil = 0;

    function spinOnce() {
      if (spinning) return;
      spinning = true;
      inner.classList.add('is-spinning');
      setTimeout(function () {
        spinning = false;
        inner.classList.remove('is-spinning');
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
  }

  function fill(el) {
    if (el.childElementCount > 0) return;
    el.innerHTML = BADGE_HTML;
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
