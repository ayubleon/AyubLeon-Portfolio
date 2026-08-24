(function () {
  // full-screen project detail overlay: opens over whichever page linked
  // to it instead of navigating away, showing the clicked project as a
  // center card with its circular neighbors peeking from behind on either
  // side. Intercepts clicks on any <a> pointing at one of the four case
  // study pages, on every page that loads this script, so it behaves the
  // same whether triggered from the Landing page's work grid or a case
  // study's own "More work" cards. Runs on every viewport size — the
  // card's own width is expressed as a calc()/min() value throughout, so
  // it naturally narrows down to a phone screen along with everything
  // else; see the mobile media query in the stylesheet below and the
  // touchstart/touchend swipe handlers further down, which give phones a
  // gesture to move between projects alongside tapping the peeking sides.
  //
  // Card order matches both the Landing page's 01-04 work list and the
  // Previous/Next links each case study page already ships with (which
  // form the same loop) — one canonical order, not re-decided here.
  var ORDER = [
    'BuzzIQ.dc.html',
    'Danadana.dc.html',
    'Building a shadcn System from Scratch.dc.html',
    'Kenyan Banking Redesign.dc.html'
  ];

  var PEEK_PCT = 20; // side cards show at most this much of their own width
  var SWIPE_MIN_PX = 60; // shorter horizontal drags read as scroll wobble, not an intentional swipe
  var FADE_MS = 380; // per phase — a fade-out then fade-in, not one round trip

  // the case-study pages' text colors are all tuned for light-on-black;
  // the center card is now white, so every one of those needs to flip
  // dark. The source uses two base colors, not one, and they carry
  // different meaning: 244,238,235 (plus solid #f4eeeb) is the
  // bright/primary tier — headings, meta-grid values like "IGNITEAMZ" or
  // "Sole Product Designer", contributor links — and goes solid black;
  // 239,232,229 is the muted tier — section-title labels, body
  // paragraphs — and goes to #636262. Both hold regardless of the
  // original alpha, since alpha alone was tuned for the old dark
  // background, not for meaning
  var TEXT_COLOR_RE = /color:\s*(?:#f4eeeb\b|rgba\(\s*(244,\s*238,\s*235|239,\s*232,\s*229)\s*,\s*[\d.]+\s*\))/gi;
  function darkenTextColors(html) {
    return html.replace(TEXT_COLOR_RE, function (match) {
      var bright = match.indexOf('#f4eeeb') !== -1 || /244,\s*238,\s*235/.test(match);
      return 'color:' + (bright ? '#000000' : '#636262');
    });
  }

  // the section-title/meta-grid labels ("Role", "Client", "Overview", …)
  // already set font-family: Poppins inline, but also carry the wide
  // 0.18em tracking tuned for their all-caps treatment on the original
  // dark page — reads as oddly spaced at this card's smaller scale, so
  // it's normalized here. This exact "font-size: 11px; letter-spacing:
  // 0.18em;" pairing is unique to that one label style across the
  // source markup, so it's safe to target as a plain string replace
  function normalizeLabelSpacing(html) {
    return html.replace(/font-size:\s*11px;\s*letter-spacing:\s*0\.18em;/gi, 'font-size: 11px; letter-spacing: normal;');
  }

  // each project's own page is the single source of truth for its title,
  // description, and full case-study body — fetched and cached here
  // instead of duplicating any of that copy into a second, driftable copy
  var cache = {};
  function loadProject(href) {
    if (cache[href]) return cache[href];
    cache[href] = fetch(href).then(function (r) { return r.text(); }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var main = doc.querySelector('main');
      var h1 = main ? main.querySelector('h1') : null;
      var heroP = main ? main.querySelector('p') : null;
      // captured before any of the mutations below, which target this
      // same paragraph — the peeking side-card summary needs the
      // original light-on-dark two-tone treatment, not the center card's
      // black/grey one
      var descHTML = heroP ? heroP.innerHTML : '';

      // the WebGL/canvas hero glow ("the shader") only ever renders via
      // that page's own componentDidMount, which never runs against this
      // parsed-but-undisplayed document — so it and its paired vignette
      // overlay would just sit there as dead, invisible weight. Drop both.
      if (main) {
        var canvas = main.querySelector('canvas');
        if (canvas) {
          var vignette = canvas.nextElementSibling;
          canvas.remove();
          if (vignette && vignette.tagName === 'DIV' && /linear-gradient/.test(vignette.getAttribute('style') || '')) {
            vignette.remove();
          }
        }
        // the hero section's 148px top padding exists to clear the real
        // page's fixed nav bar sitting over it — this card has its own
        // close button instead, not a full nav, so that much clearance
        // just reads as a gap between it and the title
        var hero = main.querySelector('section');
        if (hero) hero.style.paddingTop = '64px';

        // the hero subheading needs a split the generic dark/grey regex
        // below can't express: the sentence itself goes solid black, but
        // the trailing client/date clause — already its own <span> in the
        // source, e.g. "IGNITEAMZ, Sep 2025 – 2026." — stays the grey
        // tier and drops to its own line instead of trailing inline.
        // Setting .style.color here (rather than leaving the original
        // rgba in place) also means darkenTextColors won't touch it below:
        // it only matches the light-on-dark colors the source ships with
        if (heroP) {
          heroP.style.color = '#000000';
          var trailingSpan = heroP.querySelector('span');
          if (trailingSpan) {
            trailingSpan.style.color = '#636262';
            trailingSpan.style.display = 'block';
            trailingSpan.style.marginTop = '6px';
          }
        }
      }

      return {
        title: h1 ? h1.textContent.trim() : '',
        descHTML: descHTML,
        // the center card is white, so its embedded content needs its
        // text recolored dark — see darkenTextColors above — and its
        // label tracking normalized — see normalizeLabelSpacing above
        bodyHTML: main ? normalizeLabelSpacing(darkenTextColors(main.innerHTML)) : ''
      };
    }).catch(function () { return { title: '', descHTML: '', bodyHTML: '' }; });
    return cache[href];
  }

  var style = document.createElement('style');
  style.textContent = [
    // solid instead of a black tint over the real page — the cards behind
    // it are now fully opaque in their own right, so there's nothing left
    // to tint through
    ".al-pv-overlay{position:fixed;inset:0;z-index:200;overflow:hidden;background:#000;opacity:0;pointer-events:none;transition:opacity .35s ease;}",
    ".al-pv-overlay.al-pv-open{opacity:1;pointer-events:auto;}",
    // wider than the embedded content's own 1400px column on purpose —
    // that gap is exactly where the close button lives, so it sits beside
    // the title/text instead of over it. Height is a definite 90vh (not a
    // max-height): a percentage height on the scrolling inner wrapper
    // below only resolves against a definite parent height, not a capped
    // auto one. Navigating between projects fades opacity only — the
    // positions below are static, nothing here ever animates a transform
    ".al-pv-card{position:absolute;top:50%;left:50%;width:min(1480px,calc(100% - 80px));height:90vh;margin:0;padding:0;border-radius:24px;background:var(--al-card,#1C1C1E);border:1px solid var(--al-border-strong,rgba(255,255,255,0.16));box-shadow:0 50px 110px -40px rgba(0,0,0,0.9);overflow:hidden;font:inherit;text-align:left;cursor:default;transition:opacity " + FADE_MS + "ms ease;}",
    // percentages here resolve against each card's own width, not the
    // viewport, so offsetting prev/next by (50 + PEEK_PCT)% / (50 -
    // PEEK_PCT)% always leaves exactly PEEK_PCT% of that card's own width
    // showing beyond the center card's edge, regardless of how wide the
    // card itself ends up being. Center is white — the focused project
    // reads as a bright surface lifted above the black page — while
    // prev/next keep the dark card grey, receding behind it
    ".al-pv-card[data-role=center]{transform:translate(-50%,-50%);opacity:1;z-index:3;background:#fff;}",
    // shorter than center — top:50% + translateY(-50%) still centers each
    // card on its own (smaller) box, so this alone is enough to inset it
    // evenly top and bottom, matching a stacked-behind card rather than
    // just a same-height card peeking out sideways
    ".al-pv-card[data-role=prev]{height:calc(90vh - 80px);transform:translate(-" + (50 + PEEK_PCT) + "%,-50%);opacity:1;z-index:1;cursor:pointer;}",
    ".al-pv-card[data-role=next]{height:calc(90vh - 80px);transform:translate(-" + (50 - PEEK_PCT) + "%,-50%);opacity:1;z-index:1;cursor:pointer;}",
    // the scroll container is this inner wrapper, not the card itself —
    // .al-pv-close is a sibling of it, not a descendant, so it never
    // scrolls along: an absolutely positioned element scrolls with
    // whichever ancestor is its containing block, and keeping the close
    // button's containing block (.al-pv-card) separate from the element
    // that actually scrolls is what keeps it in place
    ".al-pv-card-inner{height:100%;box-sizing:border-box;pointer-events:none;}",
    // most paragraphs in the source don't set their own font-family — on
    // the real page they inherit Schibsted Grotesk from a wrapper div
    // outside <main>, which isn't part of what gets extracted and injected
    // here, so without this they'd fall back to the browser default
    // instead. Headings that DO set Poppins inline are unaffected either way
    // touch-action:pan-y reserves the horizontal axis for the swipe
    // handlers below instead of leaving it to the browser's own gesture
    // recognizer, which can otherwise claim a horizontal drag started
    // over this scrollable content as an ambiguous scroll gesture and
    // swallow it before touchmove ever reports it as a deliberate swipe
    ".al-pv-card[data-role=center] .al-pv-card-inner{overflow-y:auto;overflow-x:hidden;color:#000;font-family:Poppins,Helvetica,Arial,sans-serif;touch-action:pan-y;}",
    // pointer-events:auto only while open — this scrollable inner needs
    // it re-enabled since the closed overlay's pointer-events:none
    // wouldn't otherwise reach through a nested pointer-events override.
    // Without the .al-pv-open condition, this rule alone re-enables
    // clicks on the card's whole content area even after closing, which
    // sits centered over most of the viewport and silently swallows
    // every click landing within it instead of letting it reach the
    // real page underneath
    ".al-pv-overlay.al-pv-open .al-pv-card[data-role=center] .al-pv-card-inner{pointer-events:auto;}",
    // side cards are plain surfaces now — no title/description peek, just
    // the card grey itself (the same --al-card the About page's friend
    // cards use), same as a stack of cards showing only their backs
    // scoped reproductions of the case-study pages' own document-level
    // defaults, so links/selection inside the embedded body look the same
    // as they do on the real page instead of falling back to browser
    // defaults — kept scoped to .al-pv-card so nothing leaks site-wide
    ".al-pv-card[data-role=center] a{color:#636262;text-decoration:none;transition:color .35s cubic-bezier(.22,1,.36,1);}",
    ".al-pv-card[data-role=center] a:hover{color:#000;}",
    ".al-pv-card[data-role=center] a:focus-visible,.al-pv-card[data-role=center] button:focus-visible{outline:2px solid #73C41E;outline-offset:3px;border-radius:4px;}",
    ".al-pv-card[data-role=center] ::selection{background:#ff3b12;color:#fff;}",
    // the "More work" section is rebuilt into a plain list of all four
    // projects (see rebuildMoreWork below) rather than the source's own
    // prev/next card pair, so it needs its own row styling instead of the
    // glow-card treatment those used to get
    ".al-pv-more-row{display:flex;align-items:center;gap:20px;padding:22px 4px;border-bottom:1px solid rgba(0,0,0,0.1);color:inherit;text-decoration:none;transition:opacity .2s ease;}",
    ".al-pv-more-row:first-child{border-top:1px solid rgba(0,0,0,0.1);}",
    ".al-pv-more-row:hover{opacity:0.6;}",
    // black-on-white, the reverse of the dark-card close button elsewhere
    // on the site — this one only ever sits on the white center card
    ".al-pv-close{position:absolute;top:20px;right:20px;z-index:4;width:36px;height:36px;border-radius:50%;border:0;padding:0;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .2s ease;}",
    ".al-pv-close:hover{transform:scale(1.08);}",
    // very subtle elevation on the case-study's own photography/screenshots
    // — box-shadow on the same element as its own overflow:hidden still
    // renders outside the clip, so this is safe to add directly to the
    // rounded image-wrapper divs already in the source markup. :has()
    // targets only wrappers whose direct child is actual media, not every
    // rounded div in the body. Also overrides their #0e0c0b fill and hairline
    // border — a near-black placeholder tuned for the dark page background,
    // it shows through as a visible dark edge wherever the cover-fit image
    // doesn't fully hide it, and as an outright letterboxed bar around the
    // prototype video, which uses object-fit:contain instead of cover
    ".al-pv-card[data-role=center] [data-pv-inner] div:has(> img),.al-pv-card[data-role=center] [data-pv-inner] div:has(> video){box-shadow:0 6px 24px -6px rgba(0,0,0,0.14);background:#fff !important;border:none !important;}",
    // the center card takes almost the full screen, only trimmed enough
    // to leave a slim margin on each side — the same existing PEEK_PCT
    // math naturally clips prev/next down to a thin grey sliver in just
    // that margin (the overlay's own overflow:hidden takes care of it,
    // no separate mobile-specific peek size needed), rather than hiding
    // them outright. Swipe is still the primary way to move between
    // projects here; see the touchstart/touchend handlers below. The
    // close button follows to the bottom corner, out of the way of a
    // thumb reaching for it one-handed at the top of a tall screen
    "@media (max-width: 700px){.al-pv-card[data-role=center]{width:calc(100% - 24px);}.al-pv-close{top:auto;bottom:20px;}" +
      // each case-study page's own mobile stacking rules (.case-label-grid
      // etc. dropping from a two-column layout to one) live in that page's
      // <style> block, in <head> — outside <main>, so they never come
      // along with the rest of what gets extracted into this card.
      // Reproduced here rather than lost, so text stacks the same way it
      // always did on a narrow screen instead of staying jammed into the
      // desktop column layout
      ".al-pv-card[data-role=center] .case-label-grid{grid-template-columns:1fr !important;gap:14px 0 !important;}" +
      ".al-pv-card[data-role=center] .case-split-grid{grid-template-columns:1fr !important;gap:56px 0 !important;}" +
      ".al-pv-card[data-role=center] .case-figure-grid{grid-template-columns:1fr !important;}" +
      ".al-pv-card[data-role=center] .mobile-gutter{padding-left:16px !important;padding-right:16px !important;}" +
      // the case-study pages' body copy runs a size or two larger than
      // the About page's own — 17.5px/15.5px/15px against About's
      // consistent 14.5px body-paragraph size — which barely reads as a
      // difference on these pages' own wide desktop columns but stands
      // out once both are seen at the same phone width. Matched here by
      // targeting the exact inline font-size values the source markup
      // uses (attribute substring selectors on raw, unnormalized inline
      // styles — reliable here since these pages don't vary that value)
      // rather than by role/selector, since the same size shows up
      // across differently-purposed elements (hero subhead, body
      // paragraphs, meta-grid values) that don't share a class
      ".al-pv-card[data-role=center] [data-pv-inner] [style*=\"font-size: 17.5px\"],.al-pv-card[data-role=center] [data-pv-inner] [style*=\"font-size: 15px\"]{font-size:14.5px !important;}" +
      ".al-pv-card[data-role=center] [data-pv-inner] [style*=\"font-size: 15.5px\"]{font-size:14.5px !important;line-height:1.72 !important;}}",
    "@media (prefers-reduced-motion: reduce){.al-pv-overlay,.al-pv-card{transition:none !important;}}"
  ].join('');
  document.head.appendChild(style);

  var CLOSE_SVG = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
    '<path d="M1 1L13 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
  '</svg>';

  var overlay = null;
  var currentIndex = 0;
  var animating = false;
  var lastFocused = null;

  function cardHTML(role) {
    var closeBtn = role === 'center' ? '<button type="button" class="al-pv-close" data-pv-close aria-label="Close">' + CLOSE_SVG + '</button>' : '';
    var tag = role === 'center' ? 'div' : 'button';
    var typeAttr = role === 'center' ? '' : ' type="button"';
    var label = role === 'prev' ? ' aria-label="Previous project"' : role === 'next' ? ' aria-label="Next project"' : '';
    return (
      '<' + tag + ' class="al-pv-card" data-role="' + role + '"' + typeAttr + label + '>' +
        closeBtn +
        '<div class="al-pv-card-inner" data-pv-inner></div>' +
      '</' + tag + '>'
    );
  }

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'al-pv-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = cardHTML('prev') + cardHTML('center') + cardHTML('next');
    document.body.appendChild(overlay);

    overlay.querySelector('[data-pv-close]').addEventListener('click', close);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    overlay.querySelector('[data-role="prev"]').addEventListener('click', function () { go(-1); });
    overlay.querySelector('[data-role="next"]').addEventListener('click', function () { go(1); });

    // swipe stands in for the peeking side cards on mobile, where they're
    // hidden entirely — a left swipe advances the same way tapping the
    // (now-invisible) next card used to, right swipe goes back. Detected
    // on touchmove rather than waiting for touchend: a real finger drag
    // starting over the card's scrollable content lets the browser's own
    // gesture recognizer decide this is a scroll partway through, which
    // on some mobile browsers ends the gesture in touchcancel instead of
    // a clean touchend — so waiting for touchend silently missed swipes
    // that a synthetic/desktop test (dispatching touchstart+touchend
    // directly) never would have caught. Firing as soon as the
    // horizontal threshold is crossed sidesteps that. touchHandled
    // guards against firing more than once per gesture as the finger
    // keeps moving past the threshold. Passive throughout: this only
    // ever reads the gesture, never blocks the page's own scrolling
    var touchStartX = null;
    var touchStartY = null;
    var touchHandled = false;
    function resetTouch() {
      touchStartX = null;
      touchStartY = null;
      touchHandled = false;
    }
    overlay.addEventListener('touchstart', function (e) {
      var t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchHandled = false;
    }, { passive: true });
    overlay.addEventListener('touchmove', function (e) {
      if (touchStartX === null || touchHandled) return;
      var t = e.touches[0];
      var dx = t.clientX - touchStartX;
      var dy = t.clientY - touchStartY;
      // requires a clearly horizontal drag — otherwise an ordinary
      // vertical scroll through the card's own content would trigger it
      if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      touchHandled = true;
      go(dx < 0 ? 1 : -1);
    }, { passive: true });
    overlay.addEventListener('touchend', resetTouch, { passive: true });
    overlay.addEventListener('touchcancel', resetTouch, { passive: true });
  }

  function fillSide(role, href) {
    var card = overlay.querySelector('[data-role="' + role + '"]');
    card.dataset.href = href;
    var inner = card.querySelector('[data-pv-inner]');
    inner.innerHTML = '';
    // no visible content on a side card — just its own card-grey surface
    // — but still worth fetching now: by the time this becomes the
    // center card the request has likely already resolved
    loadProject(href);
  }

  // replaces the source's own "More work" prev/next card pair with a
  // plain list of all four projects in the same canonical order used
  // everywhere else — identified by the "More work" label itself rather
  // than a class, since the source markup doesn't give that grid one
  function rebuildMoreWork(inner) {
    var label = Array.from(inner.querySelectorAll('p')).find(function (p) {
      return p.textContent.trim() === 'More work';
    });
    var grid = label ? label.nextElementSibling : null;
    if (!grid) return;
    grid.innerHTML = '';
    grid.style.display = 'block';
    ORDER.forEach(function (projectHref, i) {
      var row = document.createElement('a');
      row.href = projectHref;
      row.className = 'al-pv-more-row';
      row.innerHTML =
        '<span style="flex:0 0 auto;width:28px;font-family:Poppins,Helvetica,sans-serif;font-size:13px;color:#636262;">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span data-pv-more-title style="flex:1 1 auto;font-family:Poppins,Helvetica,sans-serif;font-size:1.15rem;font-weight:600;color:#000;"></span>' +
        '<span aria-hidden="true" style="flex:0 0 auto;color:#636262;">&rarr;</span>';
      grid.appendChild(row);
      loadProject(projectHref).then(function (data) {
        row.querySelector('[data-pv-more-title]').textContent = data.title;
      });
    });
  }

  // a few of each project's own images/videos carry a faint 1-10px black
  // border baked into the asset file itself (an export artifact, not a
  // CSS background) — invisible on the original dark page, but a stray
  // dark edge now that this card is white. A slight zoom crops it out
  // instead of trying to paint over it, since it's part of the pixels
  // themselves, not a CSS layer this card controls
  function fixMediaCrops(inner) {
    var heroImg = inner.querySelector('img[src*="work-banking"]');
    if (heroImg) heroImg.style.transform = 'scale(1.02)';
    var buzziqVideo = inner.querySelector('video[src*="buzziq-prototype"]');
    if (buzziqVideo) buzziqVideo.style.transform = 'scale(1.03)';
    // the banking prototype video is left uncropped, at the requester's
    // preference — no transform applied here
  }

  // the Kenyan Banking page's Behance link sits beside its paragraph in a
  // wrapping flex row on the real page; moved to sit below it here instead
  function fixCaseStudyLinkLayout(inner) {
    var link = inner.querySelector('a[href*="behance.net"]');
    var row = link ? link.parentElement : null;
    if (row) {
      row.style.flexDirection = 'column';
      // the source sets align-items:baseline for the row layout this
      // replaces — meaningless on a column axis, and left the link
      // indented under the paragraph's own left edge
      row.style.alignItems = 'flex-start';
    }
  }

  function fillCenter(href) {
    var card = overlay.querySelector('[data-role="center"]');
    card.dataset.href = href;
    var inner = card.querySelector('[data-pv-inner]');
    inner.innerHTML = '';
    inner.scrollTop = 0;
    loadProject(href).then(function (data) {
      if (card.dataset.href !== href) return;
      inner.innerHTML = data.bodyHTML;
      inner.scrollTop = 0;
      // componentDidMount on the real page sets these directly on the DOM
      // node (bare boolean attributes get dropped by the page's own
      // template renderer) — replicated here since that code never runs
      // against this injected copy
      inner.querySelectorAll('video[autoplay]').forEach(function (v) {
        v.muted = true;
        v.loop = true;
        v.play().catch(function () {});
      });
      rebuildMoreWork(inner);
      fixMediaCrops(inner);
      fixCaseStudyLinkLayout(inner);
    });
  }

  function render() {
    var prevIdx = (currentIndex - 1 + ORDER.length) % ORDER.length;
    var nextIdx = (currentIndex + 1) % ORDER.length;
    fillSide('prev', ORDER[prevIdx]);
    fillCenter(ORDER[currentIndex]);
    fillSide('next', ORDER[nextIdx]);
  }

  // a plain crossfade: fade the trio out, swap in the new center/prev/next
  // content while invisible, fade back in at the same (static) positions.
  // A shifting-transform version of this read as jittery — likely the cost
  // of animating three large, scroll-bearing boxes' position at once —
  // where opacity alone is cheap to animate regardless of what's under it
  function go(delta) {
    if (animating) return;
    animating = true;
    var cards = overlay.querySelectorAll('.al-pv-card');
    cards.forEach(function (c) { c.style.opacity = '0'; });
    setTimeout(function () {
      currentIndex = (currentIndex + delta + ORDER.length) % ORDER.length;
      render();
      // clears the inline override so each card fades back in to its own
      // resting opacity, not a forced value
      cards.forEach(function (c) { c.style.opacity = ''; });
      animating = false;
    }, FADE_MS);
  }

  function onKeydown(e) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'ArrowRight') go(1);
  }

  function open(href) {
    if (!overlay) build();
    var idx = ORDER.indexOf(href);
    currentIndex = idx === -1 ? 0 : idx;
    render();
    lastFocused = document.activeElement;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeydown);
    requestAnimationFrame(function () {
      overlay.classList.add('al-pv-open');
      overlay.setAttribute('aria-hidden', 'false');
    });
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove('al-pv-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKeydown);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function isOpen() {
    return !!overlay && overlay.classList.contains('al-pv-open');
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[href]');
    if (!link) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var href = link.getAttribute('href');
    var idx = ORDER.indexOf(href);
    if (idx === -1) return;
    e.preventDefault();

    // a "More work" link embedded in the center card's own content points
    // at the same adjacent project a peeking side card would — route it
    // through the same slide instead of an instant, jarring content swap
    if (isOpen()) {
      var prevIdx = (currentIndex - 1 + ORDER.length) % ORDER.length;
      var nextIdx = (currentIndex + 1) % ORDER.length;
      if (idx === nextIdx) { go(1); return; }
      if (idx === prevIdx) { go(-1); return; }
      if (idx === currentIndex) return;
    }
    open(href);
  });
})();
