(function () {
  // case study pages are rebuilt by support.js from its own internal
  // template on load, discarding raw style edits — so patch the "More
  // work" nav cards via live DOM manipulation instead, and keep
  // re-patching through the settle window since support.js can rebuild in
  // more than one wave. The section/meta labels this file used to restyle
  // here are now handled by the .al-eyebrow rule in shared.js, which needs
  // no patching at all.

  // border-only glow that tracks the cursor: a real span (not a ::before —
  // this exact card element inexplicably wouldn't pick up class- or
  // var()-driven opacity changes on a pseudo-element while a plain test
  // div with identical rules worked fine, so a real, directly-styleable
  // element sidesteps whatever that was) clipped to just the border band
  // via the double-mask "exclude" technique (padding-box minus
  // content-box), lit by a radial-gradient centered on --mx/--my (updated
  // from mousemove below). "farthest-corner" sizing means the glow's reach
  // always scales to the card's own dimensions, so it still touches the
  // border even when the cursor is near the middle, instead of a fixed
  // pixel radius that falls short on larger cards.
  // Fill/border are solid (no blur) — the same #1C1C1E card grey used by
  // the nav dock — and stay the same color on hover (the cursor-tracked
  // border glow is the only hover feedback). Locked with !important so the
  // card's own built-in style-hover attribute (which used to fade the
  // background and turn the border green) can't touch them. Removing that
  // attribute at the source isn't enough on its own — support.js compiles
  // it into a real ".scp1:hover{...!important}" rule in its OWN stylesheet,
  // injected later (React mounts after this script runs), and with equal
  // specificity the later rule wins ties regardless of !important on both
  // sides. Doubling the class selector here bumps specificity above
  // ".scp1:hover" so this wins outright, independent of insertion order.
  var shimmerStyle = document.createElement('style');
  shimmerStyle.textContent = [
    ".al-glass-card{position:relative;}",
    ".al-glass-glow{position:absolute;inset:0;border-radius:inherit;padding:1px;background:radial-gradient(farthest-corner circle at var(--mx,50%) var(--my,50%),rgba(255,255,255,0.95) 0%,transparent 65%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none;opacity:0;transition:opacity .3s ease;}",
    ".al-glass-card.al-glass-card, .al-glass-card.al-glass-card:hover{background:var(--al-card,#1C1C1E) !important;border:1px solid var(--al-border-strong,rgba(255,255,255,0.16)) !important;}",
    "@media (prefers-reduced-motion: reduce){.al-glass-glow{display:none;}}"
  ].join('');
  document.head.appendChild(shimmerStyle);

  // the "More work" nav cards (next/previous project) currently have no
  // fill at all — just a hairline border — so give them the site's
  // standard solid card treatment plus a cursor-tracked border glow
  function glassifyMoreWorkCards() {
    document.querySelectorAll('a[style*="border: 1px solid rgba(255, 255, 255, 0.09)"]').forEach(function (card) {
      if (card.dataset.glassCard) return;
      card.dataset.glassCard = '1';
      card.classList.add('al-glass-card');
      card.style.setProperty('box-shadow', '0 8px 32px -8px rgba(0,0,0,0.5)');
      // this is the card's own built-in hover directive (fades the
      // background, turns the border green) — drop it at the source so
      // there's nothing left to fight the !important rule above
      card.removeAttribute('style-hover');

      var glow = document.createElement('span');
      glow.className = 'al-glass-glow';
      glow.setAttribute('aria-hidden', 'true');
      card.insertBefore(glow, card.firstChild);

      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        glow.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width) * 100 + '%');
        glow.style.setProperty('--my', ((e.clientY - rect.top) / rect.height) * 100 + '%');
      });
      card.addEventListener('mouseenter', function () {
        glow.style.opacity = '1';
      });
      card.addEventListener('mouseleave', function () {
        glow.style.opacity = '0';
      });
    });
  }

  AL.selfHeal(glassifyMoreWorkCards, 5000);

  // glassifyMoreWorkCards() keys off an exact framework-generated inline-
  // style substring rather than a class, since support.js gives that
  // content no hook of its own — if it ever changes how it serializes
  // those styles, or the underlying source values shift, the selector can
  // stop matching anything with nothing to notice the regression: the
  // cards just silently keep their unpatched styling. A one-time check 5s
  // after load (matching AL.selfHeal's own settle window above) is a cheap
  // tripwire for exactly that — every case-study page that loads this
  // script has at least one card, so finding none by the time everything
  // should have settled means the selector is out of sync with the current
  // markup, not that this page legitimately has nothing to patch
  window.addEventListener('load', function () {
    setTimeout(function () {
      if (!document.querySelector('[data-glass-card]')) {
        console.warn('more-work-cards.js: found no More-work cards to patch on this page — its inline-style selector may be out of sync with the current markup');
      }
    }, 5000);
  });
})();
