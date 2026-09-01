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

  var SWIPE_MIN_PX = 60; // shorter horizontal drags read as scroll wobble, not an intentional swipe
  var MOVE_MS = 480; // duration of the slot-shift scroll on a project change

  // shared across every component file that needs it (see shared.js) —
  // each used to build its own independent player for the same sound
  var playSwitch = AL.playSwitch;
  // touch devices fire a synthetic mouseenter right before click on first
  // tap, so a hover-triggered sound would double up with a click sound on
  // a real tap — gating behind real hover support keeps touch to one sound
  var supportsHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  // the "More work" rows are torn down and rebuilt on every project
  // change (see rebuildMoreWork), so a click that leaves the cursor
  // resting over the freshly-created row at the same screen position can
  // get a genuine but phantom mouseenter for it with no actual mouse
  // movement — which played the hover sound a second time right after
  // the click. Ignoring hover sound until a real mousemove has happened
  // since load filters that out
  var mouseHasMoved = false;
  window.addEventListener('mousemove', function () { mouseHasMoved = true; }, { once: true, passive: true });
  function playSwitchOnRealHover() { if (mouseHasMoved) playSwitch(); }

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
  // the (?<!-) guards against matching inside background-color/border-color/
  // stop-color — without it, any future case-study markup using one of
  // these exact rgba tuples on a -color property (not just plain `color`)
  // would get silently rewritten to solid black/grey instead of left alone
  var TEXT_COLOR_RE = /(?<!-)color:\s*(?:#f4eeeb\b|rgba\(\s*(244,\s*238,\s*235|239,\s*232,\s*229)\s*,\s*[\d.]+\s*\))/gi;
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

  // the section headings (h2, e.g. "The advantage that made it work"),
  // the bold intro statement under "Overview", and the in-body
  // subheadings (e.g. "Protecting system integrity") all run oversized
  // for this card — sized (with the h2/statement pair fluid up to
  // 1.55rem/1.62rem via vw) for the source pages' own wide desktop
  // columns, not this narrower card. Fixed, smaller sizes here instead
  // of just capping the clamp(), consistent with how the rest of this
  // card's typography (body copy, meta-grid values) is already fixed
  // rather than fluid. Headings match the About page's own numbered
  // story titles exactly — 1.16rem at -0.015em tracking — kept
  // deliberately above the 0.95rem subheadings so the two tiers stay
  // visually distinct
  function shrinkCardHeadings(html) {
    return html
      .replace(/font-size:\s*clamp\(1\.2rem,\s*1\.9vw,\s*1\.55rem\);(\s*font-weight:\s*500;\s*line-height:\s*1\.4;\s*)letter-spacing:\s*-0\.022em/gi, 'font-size: 1.16rem;$1letter-spacing: -0.015em')
      .replace(/font-size:\s*clamp\(1\.2rem,\s*1\.9vw,\s*1\.62rem\);(\s*font-weight:\s*500;\s*line-height:\s*1\.4;\s*)letter-spacing:\s*-0\.022em/gi, 'font-size: 1.16rem;$1letter-spacing: -0.015em')
      .replace(/font-size:\s*1\.08rem(;\s*font-weight:\s*500;\s*letter-spacing:\s*-0\.015em;)/gi, 'font-size: 0.95rem$1');
  }

  // the source's 1px, 55%-opacity accent left-border (the callout list in
  // BuzzIQ/Danadana's "My role" section) reads as a soft accent against
  // the dark page it was tuned for, but is nearly invisible at that
  // width/opacity against this card's light background. Thickened and
  // brought to full opacity so it still reads as an accent, just a
  // visible one here
  function thickenAccentBorders(html) {
    return html.replace(/border-left:\s*1px solid rgba\(10,\s*132,\s*255,\s*0\.55\)/gi, 'border-left: 4px solid #0A84FF');
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

        // same reasoning as heroP just above: case-field-label/case-
        // section-label/case-body-text/case-figcaption (the shared classes
        // the four case-study pages use for their repeated typography) get
        // their color from that class, not an inline style, so darkenText
        // Colors' regex has nothing in the fetched HTML string to match —
        // set directly here instead, before this element is ever
        // serialized to a string. Every one of these classes was always
        // the muted 239,232,229 tier on its source page (never the bright
        // 244,238,235 one), so they all take the same #636262 darkenText
        // Colors would have given them anyway. Letter-spacing gets the
        // same normalize-at-card-scale treatment normalizeLabelSpacing
        // gives every other 0.18em-tracked label, for the same reason
        var sharedLabels = main.querySelectorAll('.case-field-label, .case-section-label, .case-body-text, .case-figcaption');
        for (var i = 0; i < sharedLabels.length; i++) {
          sharedLabels[i].style.color = '#636262';
        }
        var sharedTrackedLabels = main.querySelectorAll('.case-field-label, .case-section-label');
        for (var j = 0; j < sharedTrackedLabels.length; j++) {
          sharedTrackedLabels[j].style.letterSpacing = 'normal';
        }
      }

      return {
        title: h1 ? h1.textContent.trim() : '',
        descHTML: descHTML,
        // the center card is white, so its embedded content needs its
        // text recolored dark — see darkenTextColors above — and its
        // label tracking normalized — see normalizeLabelSpacing above
        bodyHTML: main ? thickenAccentBorders(shrinkCardHeadings(normalizeLabelSpacing(darkenTextColors(main.innerHTML)))) : ''
      };
    }).catch(function () {
      // a failed fetch shouldn't poison this href forever — deleting the
      // cache entry here means the NEXT call retries fresh, instead of
      // every future open of this project silently returning the same
      // permanently-empty result from one transient network hiccup
      delete cache[href];
      return { title: '', descHTML: '', bodyHTML: '' };
    });
    return cache[href];
  }

  var style = document.createElement('style');
  style.textContent = [
    // solid instead of a black tint over the real page — the cards behind
    // it are now fully opaque in their own right, so there's nothing left
    // to tint through. --al-cw/--al-peek-scale/--al-gap are the shared
    // geometry every card and slot position below is derived from, so
    // resizing the viewport or retuning either constant automatically
    // keeps everything (card size, peek position, close button) in sync
    // --al-cw is defined in vw, not %: a custom property's internal %
    // resolves against whatever property ends up consuming it — the
    // containing block's width when it lands in `width`, but the
    // element's OWN width when the same variable lands inside a
    // translateX() calc() on that same element — so the exact same
    // --al-cw value would silently mean two different pixel numbers
    // depending on which rule below reads it. vw is always relative to
    // the viewport regardless of which property consumes it, so every
    // rule agrees on the same card width
    ".al-pv-overlay{position:fixed;inset:0;z-index:200;overflow:hidden;background:#000;opacity:0;pointer-events:none;transition:opacity .35s ease;--al-cw:min(1440px, calc(100vw - 80px));--al-peek-scale:0.8;--al-gap:16px;}",
    ".al-pv-overlay.al-pv-open{opacity:1;pointer-events:auto;}",
    // caps how far apart the two peek cards' clip edges can drift on very
    // wide screens — without this, the peek cards' offsets stop growing
    // once --al-cw hits its own max, but the viewport (and its clipping
    // edge) keeps growing, so past ~3800px wide a peek card clears the
    // screen edge entirely and stops looking clipped/off-screen at all
    ".al-pv-stage{position:relative;width:100%;height:100%;max-width:1920px;margin:0 auto;overflow:hidden;}",
    // every card is the exact same shape at all times — a peeking card
    // isn't a differently-sized box, it's this same card scaled down (see
    // the data-slot rules below), the way pressing K and dragging in
    // Figma scales a whole layer uniformly rather than resizing it.
    // Wider than the embedded content's own 1400px column on purpose —
    // that gap is exactly where the close button lives, so it sits beside
    // the title/text instead of over it. Height is a definite 90vh (not a
    // max-height): a percentage height on the scrolling inner wrapper
    // below only resolves against a definite parent height, not a capped
    // auto one. transform is the only thing that ever differs per slot,
    // so it's the only property transitioned — a single native CSS
    // transition drives the whole move, no per-frame JS needed. Every
    // slot below keeps the exact same transform-origin (the box's own
    // center, the default) and the exact same three-function transform
    // shape (translateX, then the standard center-the-box translate,
    // then scale) — only the numbers differ. Matching shape matters: two
    // states with a different *number* of transform functions (or a
    // transform-origin that itself moves) can't be interpolated function-
    // by-function, so the browser falls back to decomposing both into
    // matrices and interpolating those instead — which briefly bulges the
    // box larger than either end state along the way, flashing white
    // (this card's own color) outside where either card should be
    ".al-pv-card{position:absolute;top:50%;left:50%;width:var(--al-cw);height:90vh;margin:0;padding:0;border-radius:24px;background:var(--al-card-light,#FDFBF8);border:1px solid var(--al-border-strong,rgba(255,255,255,0.16));box-shadow:0 50px 110px -40px rgba(0,0,0,0.9);overflow:hidden;font:inherit;text-align:left;cursor:default;transition:transform " + MOVE_MS + "ms cubic-bezier(.65,0,.35,1);}",
    // the close button's own containing block — sized like the card, but
    // as a fixed fifth element rather than a child of whichever card
    // currently holds the center slot, since that rotates between the
    // four real cards on every navigation
    ".al-pv-close-anchor{position:absolute;top:50%;left:50%;width:var(--al-cw);height:90vh;transform:translate(-50%,-50%);pointer-events:none;z-index:7;}",
    // taller on desktop only — phone's 90vh already reads correctly, and
    // the mobile media query below has its own header/padding numbers
    // tuned to that height, not worth retuning for a screen where the
    // extra room isn't needed
    "@media (min-width: 701px){.al-pv-card,.al-pv-close-anchor{height:94vh;}}",
    // center: the resting point every transform below is built from — a
    // no-op translateX(0), then translate(-50%,-50%) to center the full-
    // size box on the screen, then scale(1) — full opacity, full scale.
    // The leading translateX(0) and trailing scale(1) don't do anything
    // here, but keep this rule's transform the same three-function shape
    // every other slot below uses, which is what keeps a transition
    // between any two of them a plain per-function interpolation
    ".al-pv-card[data-slot=center]{transform:translateX(0) translate(-50%,-50%) scale(1);opacity:1;z-index:3;}",
    // left/right sit fully beside center, never behind it. Both scale
    // around the box's own center (the shared default above, never
    // overridden), so translateX has to place the box's *center* far
    // enough out that its near edge — half its own scaled width closer
    // in — lands exactly --al-gap past center's own edge: half of
    // center's own width (to clear center's box) + the gap + half of
    // this card's own scaled width (half of it extends back inward from
    // its own center). The far edge is then free to extend past the
    // screen's own boundary and get clipped by the overlay, rather than
    // by the center card sitting on top of it. Dimmed to read as a
    // receded, same object rather than a differently-colored one;
    // brightens to full strength on hover as a click affordance, since
    // these carry no visible content of their own to hint they're
    // interactive
    ".al-pv-card[data-slot=left]{transform:translateX(calc(-1 * (var(--al-cw) / 2 + var(--al-gap) + var(--al-cw) * var(--al-peek-scale) / 2))) translate(-50%,-50%) scale(var(--al-peek-scale));opacity:0.35;z-index:1;cursor:pointer;}",
    ".al-pv-card[data-slot=right]{transform:translateX(calc(var(--al-cw) / 2 + var(--al-gap) + var(--al-cw) * var(--al-peek-scale) / 2)) translate(-50%,-50%) scale(var(--al-peek-scale));opacity:0.35;z-index:1;cursor:pointer;}",
    ".al-pv-card[data-slot=left]:hover,.al-pv-card[data-slot=right]:hover{opacity:1;}",
    // offLeft/offRight: the fourth card waiting just past each edge,
    // clipped by the overlay's own overflow:hidden — but "past the edge"
    // has to mean past where left/right's own far edge already sits, not
    // just past the viewport boundary. left's own far (outer) edge is
    // already most of the way off-screen (at --al-peek-scale 0.8 it's a
    // 960px-wide card showing a sliver at most 24px onto the screen), so
    // a fixed viewport-relative buffer that was comfortable at a smaller
    // --al-peek-scale stops being enough once the card is this big:
    // offLeft would land well short of left's own far edge, and the two
    // visibly overlap while both are still on screen mid-transition. This
    // instead places offLeft's *near* edge --al-gap past left's own *far*
    // edge — one full center-card-width, one full peek-card-width, and
    // the gap between them, all beyond center's own left edge — so the
    // two can never overlap while on screen, regardless of scale
    ".al-pv-card[data-slot=offLeft]{transform:translateX(calc(-1 * (var(--al-cw) / 2 + var(--al-gap) * 2 + var(--al-cw) * var(--al-peek-scale) * 1.5))) translate(-50%,-50%) scale(var(--al-peek-scale));opacity:0.35;z-index:0;}",
    ".al-pv-card[data-slot=offRight]{transform:translateX(calc(var(--al-cw) / 2 + var(--al-gap) * 2 + var(--al-cw) * var(--al-peek-scale) * 1.5)) translate(-50%,-50%) scale(var(--al-peek-scale));opacity:0.35;z-index:0;}",
    // the scroll container is this inner wrapper, not the card itself —
    // .al-pv-close lives in its own anchor entirely outside the card tree
    // (see .al-pv-close-anchor above), so it never scrolls along
    // regardless of which card the scrolling content happens to be in.
    // Unconditional rather than scoped to the center slot: only the
    // center card is ever actually carrying content, so styling that
    // would-be-center-only content has nothing to affect on the other
    // three, which stay empty regardless of which slot they're in
    ".al-pv-card-inner{height:100%;box-sizing:border-box;pointer-events:none;overflow-y:auto;overflow-x:hidden;color:#000;font-family:'Schibsted Grotesk',Helvetica,Arial,sans-serif;touch-action:pan-y;opacity:0;transition:opacity .4s ease;}",
    ".al-pv-card-inner.al-pv-inner-visible{opacity:1;}",
    // pointer-events:auto only while open AND only for the card actually
    // holding the center slot — this scrollable inner needs it re-enabled
    // since the closed overlay's pointer-events:none wouldn't otherwise
    // reach through a nested pointer-events override, and only the
    // center card should ever be a click target for its own embedded
    // links rather than whichever card happens to be mid-transition
    // through that slot
    ".al-pv-overlay.al-pv-open .al-pv-card[data-slot=center] .al-pv-card-inner{pointer-events:auto;}",
    // reproductions of the case-study pages' own document-level defaults,
    // so links/selection inside the embedded body look the same as they
    // do on the real page instead of falling back to browser defaults
    ".al-pv-card a{color:#636262;text-decoration:none;transition:color .35s cubic-bezier(.22,1,.36,1);}",
    ".al-pv-card a:hover{color:#000;}",
    ".al-pv-card a:focus-visible,.al-pv-card button:focus-visible{outline:2px solid var(--al-green,#EF4418);outline-offset:3px;border-radius:4px;}",
    // the peek cards themselves (role=button, see setSlotA11y) are focusable
    // but weren't covered by the rule above, which only targets real <a>/
    // <button> descendants — falling back to the browser default outline
    // instead of this site's own focus treatment
    ".al-pv-card:focus-visible{outline:2px solid var(--al-green,#EF4418);outline-offset:-3px;border-radius:24px;}",
    ".al-pv-card ::selection{background:#54A9FF;color:#0a0606;}",
    // the case-study pages' body copy runs a size or two larger than the
    // About page's own — 17.5px/15.5px/15px against About's consistent
    // 14.5px body-paragraph size. Matched here at every width, not just
    // mobile, by targeting the exact inline font-size values the source
    // markup uses (attribute substring selectors on raw, unnormalized
    // inline styles — reliable here since these pages don't vary that
    // value) rather than by role/selector, since the same size shows up
    // across differently-purposed elements (hero subhead, body
    // paragraphs, meta-grid values) that don't share a class
    ".al-pv-card [data-pv-inner] [style*=\"font-size: 17.5px\"],.al-pv-card [data-pv-inner] [style*=\"font-size: 15px\"]{font-size:14.5px !important;}",
    ".al-pv-card [data-pv-inner] [style*=\"font-size: 15.5px\"]{font-size:14.5px !important;line-height:1.72 !important;}",
    // the "More work" section is rebuilt into a plain list of all four
    // projects (see rebuildMoreWork below) rather than the source's own
    // prev/next card pair, so it needs its own row styling instead of the
    // glow-card treatment those used to get
    ".al-pv-more-row{display:flex;align-items:center;gap:20px;padding:22px 4px;border-bottom:1px solid rgba(0,0,0,0.1);color:inherit;text-decoration:none;}",
    ".al-pv-more-row:first-child{border-top:1px solid rgba(0,0,0,0.1);}",
    "[data-pv-more-title]{display:inline-block;transition:transform .25s cubic-bezier(.22,1,.36,1);}",
    ".al-pv-more-row:hover [data-pv-more-title]{transform:translateX(6px);}",
    // the row for whatever project is already open — clicking it is a
    // no-op (the document click handler below returns early when the
    // clicked href matches currentIndex), so it's marked inert rather
    // than left looking like every other navigable row
    ".al-pv-more-row-current{cursor:default;}",
    // black-on-white, the reverse of the dark-card close button elsewhere
    // on the site — this one only ever sits on the white center card.
    // pointer-events:auto only while open, same reasoning as the card-
    // inner rule above: its anchor is pointer-events:none so it doesn't
    // block clicks through to whatever card is underneath it, but without
    // the .al-pv-open gate this alone would re-enable the button even
    // while the overlay is closed and invisible
    ".al-pv-close{position:absolute;top:20px;right:20px;z-index:4;width:36px;height:36px;border-radius:50%;border:0;padding:0;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .3s cubic-bezier(.22,1,.36,1);}",
    ".al-pv-overlay.al-pv-open .al-pv-close{pointer-events:auto;}",
    // every page's own base stylesheet has a blanket
    // `button:focus-visible { border-radius: 4px }` (for square-ish
    // buttons elsewhere on the site) that would otherwise reshape this
    // button's own black circle into a rounded-square the moment it's
    // focused — which happens immediately on open, since open() below
    // moves focus straight to this button. That's not a deliberate
    // keyboard-navigation moment from the visitor's own perspective, so
    // the ring itself reads as a stray visual glitch rather than an
    // affordance — dropped outright rather than just reshaped. This
    // class-scoped rule outranks that plain-tag one on specificity alone,
    // so it wins without needing !important; border-radius still needs
    // overriding on its own even with no visible ring, since it'd
    // otherwise reshape the button's actual black circle, not just a ring
    ".al-pv-close:focus-visible{outline:none;border-radius:50%;}",
    // the circle itself just scales and rotates — stays solid black, no
    // color shift — while the X inside does its own crossing animation
    // (below)
    ".al-pv-close:hover{transform:scale(1.1) rotate(90deg);}",
    // the two strokes swap places on hover rather than the whole glyph
    // just spinning along with the button above — transform-origin at
    // (7,7), the icon's own center in its 14x14 viewBox, so each stroke
    // pivots in place. Rotating one +90deg and the other -90deg lands
    // each exactly on the other's original line (a diagonal rotated 90
    // degrees maps onto the other diagonal), so the end state looks like
    // a plain X again — the animation is in the two strokes visibly
    // sweeping through and crossing each other on the way there, not in
    // the resting shape, which is unchanged
    ".al-pv-close-stroke{transform-origin:7px 7px;transition:transform .3s cubic-bezier(.22,1,.36,1);}",
    ".al-pv-close:hover .al-pv-close-stroke:first-child{transform:rotate(90deg);}",
    ".al-pv-close:hover .al-pv-close-stroke:last-child{transform:rotate(-90deg);}",
    // frosted glass: a translucent tint + backdrop-filter blur, masked so
    // the blur itself fades out toward the bottom edge instead of cutting
    // off in a hard line. backdrop-filter behind a transformed ancestor
    // (this overlay's whole slot-shift carousel is built on transformed
    // cards) is a known cross-browser trouble spot, Safari especially —
    // untested there, so if it renders wrong or stays frozen on an actual
    // iOS/macOS Safari, that's the first thing to suspect and the plain
    // gradient-fade version (solid-to-transparent, no blur) is the fallback.
    // The header lives in the close-anchor, fixed at the center slot's
    // final position/size — during the slide it just sits there statically
    // while the actual cards scale/translate underneath it, so it visibly
    // detaches from whatever's animating in. Faded out for the move and
    // back in once the new card has settled (see go()) rather than left
    // on-screen the whole time
    ".al-pv-header{position:absolute;top:0;left:0;right:0;height:96px;z-index:3;pointer-events:none;background:rgba(253,251,248,0.55);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);-webkit-mask-image:linear-gradient(180deg,#000 0%,#000 45%,rgba(0,0,0,0) 100%);mask-image:linear-gradient(180deg,#000 0%,#000 45%,rgba(0,0,0,0) 100%);border-radius:24px 24px 0 0;opacity:1;transition:opacity .18s ease;}",
    // backdrop-filter behind a transformed ancestor (this whole carousel)
    // can leave a stale, frozen blur rendered through an opacity fade
    // instead of cleanly disappearing with it — turning the filter off
    // outright while hidden, not just fading it, avoids that lingering trace
    ".al-pv-header.al-pv-header-hidden{opacity:0;backdrop-filter:none;-webkit-backdrop-filter:none;}",
    ".al-pv-counter{position:absolute;top:20px;left:0;right:0;margin:0;text-align:center;font-family:Poppins,Helvetica,sans-serif;font-size:11px;letter-spacing:0.06em;color:#636262;}",
    // hidden until scrolling actually starts (see the scroll handler in
    // build()) — a bar reading 0% at rest just looks like an unexplained
    // decoration; it only earns its place once there's real progress on it
    ".al-pv-progress-track{position:absolute;top:26px;left:20px;width:90px;height:3px;border-radius:999px;background:rgba(0,0,0,0.1);overflow:hidden;opacity:0;transition:opacity .25s ease;}",
    ".al-pv-progress-track.al-pv-progress-active{opacity:1;}",
    ".al-pv-progress-fill{width:0%;height:100%;background:#000;}",
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
    ".al-pv-card [data-pv-inner] div:has(> img),.al-pv-card [data-pv-inner] div:has(> video){box-shadow:0 6px 24px -6px rgba(0,0,0,0.14);background:var(--al-card-light,#FDFBF8) !important;border:none !important;}",
    // the four case-study pages' own shared label/body-text classes
    // (case-field-label/case-section-label/case-body-text/case-figcaption,
    // defined once here since this file is the one thing every page —
    // including this popup's own host page — always loads) reproduced at
    // their SOURCE-page appearance: darkenTextColors() below still does the
    // actual light-on-dark -> dark-on-white recolor for this card, the same
    // way it always has for every other muted-tier element on the page
    ".al-pv-card .case-field-label{margin:0;font-family:Poppins;font-size:11px;letter-spacing:0.18em;text-transform:none;color:rgba(239,232,229,0.45);}",
    ".al-pv-card .case-section-label{margin:0;font-family:Poppins;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(239,232,229,0.66);}",
    ".al-pv-card .case-body-text{margin:0;font-size:15.5px;line-height:1.78;color:rgba(239,232,229,0.86);text-wrap:pretty;}",
    ".al-pv-card .case-figcaption{margin:0;font-family:Poppins,Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;letter-spacing:0.02em;color:rgba(239,232,229,0.5);}",
    // phones get the opposite treatment from desktop: screen space is
    // scarce, so the center card claims as much of it as possible (a
    // slim 12px margin per side instead of desktop's 40px) and the gap
    // to each peeking card shrinks to match, rather than eating further
    // into that reclaimed width. The close button follows to the bottom
    // corner, out of the way of a thumb reaching for it one-handed at
    // the top of a tall screen
    "@media (max-width: 700px){.al-pv-overlay{--al-cw:calc(100vw - 24px);--al-gap:8px;}.al-pv-close{top:auto;bottom:20px;}" +
      // the sticky header (counter + progress bar) still sits at the top
      // on mobile even though the close button moves to the bottom — it
      // just shrinks, since the 96px desktop height was sized to give the
      // decorative fade room to run, which scarce phone screen space can't
      // spare. Content's own top padding is matched to this shorter height
      // so the title clears it, rather than the leftover 24px from when
      // this override only had to clear the (now relocated) close button
      ".al-pv-header{height:64px !important;}" +
      ".al-pv-card [data-pv-inner]>section:first-child{padding-top:64px !important;}" +
      // each case-study page's own mobile stacking rules (.case-label-grid
      // etc. dropping from a two-column layout to one) live in that page's
      // <style> block, in <head> — outside <main>, so they never come
      // along with the rest of what gets extracted into this card.
      // Reproduced here rather than lost, so text stacks the same way it
      // always did on a narrow screen instead of staying jammed into the
      // desktop column layout
      ".al-pv-card .case-label-grid{grid-template-columns:1fr !important;gap:14px 0 !important;}" +
      ".al-pv-card .case-split-grid{grid-template-columns:1fr !important;gap:56px 0 !important;}" +
      ".al-pv-card .case-figure-grid{grid-template-columns:1fr !important;}" +
      ".al-pv-card .mobile-gutter{padding-left:16px !important;padding-right:16px !important;}" +
      // the Role/Client/Timeline/Platforms/Project contributors grid has
      // no class of its own — it already auto-fits into however many
      // 190px-minimum columns fit, no override needed for that part on
      // its own. That minimum is just too wide for 2 to ever fit on a
      // narrow phone, so it's lowered here — same auto-fit behavior,
      // just with room to place a pair side by side when the screen
      // allows it, matching the source pages' own equivalent rule
      ".al-pv-card [data-pv-inner] div[style*=\"grid-template-columns: repeat(auto-fit, minmax(190px, 1fr))\"]{grid-template-columns:repeat(auto-fit,minmax(130px,1fr)) !important;}}",
    "@media (prefers-reduced-motion: reduce){.al-pv-overlay,.al-pv-card,.al-pv-card-inner{transition:none !important;}}"
  ].join('');
  document.head.appendChild(style);

  var CLOSE_SVG = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path class="al-pv-close-stroke" d="M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
    '<path class="al-pv-close-stroke" d="M1 1L13 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
  '</svg>';

  var overlay = null;
  var currentIndex = 0;
  var animating = false;
  var lastFocused = null;
  // the pending "clear the outgoing card + reveal the header again" timer
  // from an in-flight go() — tracked so close() can cancel it (see close())
  var moveTimer = null;

  // four identical plain divs — none of them can be a <button>, since
  // whichever one is currently 'center' needs to host real nested
  // interactive content (links, the "More work" list, videos), and
  // nesting interactive elements inside a <button> is invalid HTML.
  // Which slot is clickable-to-navigate vs. not is expressed instead
  // through role/tabindex/aria-label, kept in sync with each card's
  // current data-slot by setSlotA11y — see go(), where that slot rotates
  // between the four physical cards on every navigation
  function cardHTML() {
    return '<div class="al-pv-card"><div class="al-pv-card-inner" data-pv-inner></div></div>';
  }
  function setSlotA11y(card, slot) {
    if (slot === 'left' || slot === 'right') {
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', slot === 'left' ? 'Previous project' : 'Next project');
    } else {
      card.removeAttribute('role');
      card.removeAttribute('tabindex');
      card.removeAttribute('aria-label');
    }
  }
  function mod(i) {
    return (i + ORDER.length) % ORDER.length;
  }

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'al-pv-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Project details');
    overlay.innerHTML = '<div class="al-pv-stage">' + cardHTML() + cardHTML() + cardHTML() + cardHTML() +
      '<div class="al-pv-close-anchor">' +
        '<div class="al-pv-header" aria-hidden="true">' +
          '<div class="al-pv-progress-track"><div class="al-pv-progress-fill" data-pv-progress></div></div>' +
          '<p class="al-pv-counter" data-pv-counter></p>' +
        '</div>' +
        '<button type="button" class="al-pv-close" data-pv-close aria-label="Close">' + CLOSE_SVG + '</button>' +
      '</div></div>';
    document.body.appendChild(overlay);
    var stage = overlay.querySelector('.al-pv-stage');

    var closeBtn = overlay.querySelector('[data-pv-close]');
    closeBtn.addEventListener('click', close);
    if (supportsHover) closeBtn.addEventListener('mouseenter', playSwitchOnRealHover);
    // delegated rather than bound per-card at build time — which physical
    // card is clickable-to-navigate changes as slots rotate, so the
    // handler has to read each card's CURRENT slot at click time rather
    // than assume whichever slot it was wired to when the cards were built
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target === stage) { close(); return; }
      var card = e.target.closest('.al-pv-card');
      if (!card) return;
      if (card.dataset.slot === 'left') go(-1);
      else if (card.dataset.slot === 'right') go(1);
    });
    overlay.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var card = e.target.closest('.al-pv-card');
      if (!card) return;
      if (card.dataset.slot === 'left') { e.preventDefault(); go(-1); }
      else if (card.dataset.slot === 'right') { e.preventDefault(); go(1); }
    });

    // fills the header's progress bar as the center card's own content
    // scrolls. Delegated on the overlay in capture phase — scroll doesn't
    // bubble, so this is the only way to catch it from the [data-pv-inner]
    // descendant without binding a listener per physical card — and
    // gated to whichever card currently holds the center slot, since
    // that's the only one a user can actually scroll (peek cards' content
    // is emptied by assignSlot)
    var progressFill = overlay.querySelector('[data-pv-progress]');
    var progressTrack = progressFill.parentElement;
    overlay.addEventListener('scroll', function (e) {
      var card = e.target.closest && e.target.closest('.al-pv-card');
      if (!card || card.dataset.slot !== 'center') return;
      var inner = e.target;
      var span = inner.scrollHeight - inner.clientHeight;
      var pct = span > 0 ? Math.min(Math.max(inner.scrollTop / span, 0), 1) * 100 : 0;
      progressFill.style.width = pct + '%';
      progressTrack.classList.toggle('al-pv-progress-active', inner.scrollTop > 0);
    }, true);

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

  // no card other than 'center' ever shows visible content — just its
  // own white surface, scaled and positioned per its slot — so this is
  // all any of the other three slots ever need: the right position/size
  // (driven entirely by the data-slot attribute change itself) and no
  // leftover content from whatever it was showing before
  function assignSlot(card, slot) {
    card.dataset.slot = slot;
    setSlotA11y(card, slot);
    if (slot === 'center') return;
    var inner = card.querySelector('[data-pv-inner]');
    inner.classList.remove('al-pv-inner-visible');
    inner.innerHTML = '';
  }

  // replaces the source's own "More work" prev/next card pair with a
  // plain list of all four projects in the same canonical order used
  // everywhere else — identified by the "More work" label itself rather
  // than a class, since the source markup doesn't give that grid one
  function rebuildMoreWork(inner, currentHref) {
    var label = Array.from(inner.querySelectorAll('p')).find(function (p) {
      return p.textContent.trim() === 'More work';
    });
    var grid = label ? label.nextElementSibling : null;
    if (!grid) return;
    grid.innerHTML = '';
    grid.style.display = 'block';
    ORDER.forEach(function (projectHref, i) {
      var isCurrent = projectHref === currentHref;
      var row = document.createElement('a');
      row.href = projectHref;
      row.className = 'al-pv-more-row' + (isCurrent ? ' al-pv-more-row-current' : '');
      if (isCurrent) row.setAttribute('aria-current', 'true');
      row.innerHTML =
        '<span style="flex:0 0 auto;width:28px;font-family:Poppins,Helvetica,sans-serif;font-size:13px;color:#636262;">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span data-pv-more-title style="flex:1 1 auto;font-family:Poppins,Helvetica,sans-serif;font-size:1rem;font-weight:500;color:' + (isCurrent ? '#007AFF' : '#000') + ';"></span>' +
        (isCurrent ?
          '<span aria-hidden="true" style="flex:0 0 auto;font-family:Poppins,Helvetica,sans-serif;font-size:12px;color:#007AFF;">Currently viewing</span>' :
          '<span aria-hidden="true" style="flex:0 0 auto;color:#636262;">&rarr;</span>');
      if (supportsHover) row.addEventListener('mouseenter', playSwitchOnRealHover);
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
    var card = overlay.querySelector('[data-slot="center"]');
    card.dataset.href = href;
    // both only depend on href's own fixed spot in ORDER, never on the
    // fetch below, so they update immediately on every slide instead of
    // waiting on (and briefly showing stale state until) that resolves
    var counter = overlay.querySelector('[data-pv-counter]');
    var progress = overlay.querySelector('[data-pv-progress]');
    var pos = ORDER.indexOf(href);
    if (counter) counter.textContent = pos === -1 ? '' : 'Project ' + (pos + 1) + ' / ' + ORDER.length;
    if (progress) {
      progress.style.width = '0%';
      progress.parentElement.classList.remove('al-pv-progress-active');
    }
    var inner = card.querySelector('[data-pv-inner]');
    inner.classList.remove('al-pv-inner-visible');
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
      rebuildMoreWork(inner, href);
      fixMediaCrops(inner);
      fixCaseStudyLinkLayout(inner);
      // the reveal: content starts at opacity 0 (see .al-pv-card-inner)
      // and fades in once it's actually ready, rather than popping in the
      // instant the fetch resolves — a rAF tick so the class addition
      // lands on its own frame and actually transitions instead of
      // applying before the browser's first paint of the new content
      requestAnimationFrame(function () {
        inner.classList.add('al-pv-inner-visible');
      });
    });
  }

  function render() {
    var cards = Array.from(overlay.querySelectorAll('.al-pv-card'));
    assignSlot(cards[0], 'left');
    assignSlot(cards[1], 'center');
    assignSlot(cards[2], 'right');
    assignSlot(cards[3], 'offRight');
    // prev/next/the-one-after-next carry no visible content, but fetching
    // them now means the request has likely already resolved by the time
    // any of them becomes the center card
    loadProject(ORDER[mod(currentIndex - 1)]);
    loadProject(ORDER[mod(currentIndex + 1)]);
    loadProject(ORDER[mod(currentIndex + 2)]);
    fillCenter(ORDER[currentIndex]);
  }

  // a single continuous scroll of the whole strip by one slot, in the
  // direction clicked — not two separately-choreographed shrink/grow
  // animations. Every card's transform is driven entirely by its
  // data-slot attribute (see the stylesheet above), so moving four cards
  // at once is just reassigning four attributes; the browser's own CSS
  // transition handles the actual interpolation on the compositor thread,
  // which is both simpler and smoother than animating width/height/top/
  // left by hand ever was. The fourth card — always waiting just past one
  // edge, clipped and invisible — slides into the vacated peek slot at
  // the same time the clicked card grows into center and the old center
  // shrinks into the opposite peek slot; the card that peek slot just
  // displaced becomes the new waiting one on the far side
  function go(delta) {
    if (animating) return;
    var cards = Array.from(overlay.querySelectorAll('.al-pv-card'));
    var leftCard = cards.find(function (c) { return c.dataset.slot === 'left'; });
    var centerCard = cards.find(function (c) { return c.dataset.slot === 'center'; });
    var rightCard = cards.find(function (c) { return c.dataset.slot === 'right'; });
    var offCard = cards.find(function (c) { return c.dataset.slot === 'offLeft' || c.dataset.slot === 'offRight'; });

    currentIndex = mod(currentIndex + delta);
    loadProject(ORDER[mod(currentIndex - 1)]);
    loadProject(ORDER[mod(currentIndex + 1)]);

    // the waiting card sits wherever it last exited to — the correct side
    // if the last navigation went the same direction, the wrong one if it
    // just reversed. Since it's clipped and invisible either way, snapping
    // it across with no transition before this scroll starts is imperceptible
    var neededOffSlot = delta > 0 ? 'offRight' : 'offLeft';
    if (offCard.dataset.slot !== neededOffSlot) {
      offCard.style.transition = 'none';
      offCard.dataset.slot = neededOffSlot;
      offCard.offsetWidth; // flush the snap before re-enabling the transition
      offCard.style.transition = '';
    }

    // the outgoing center card keeps its real content through the move —
    // assignSlot below would otherwise blank it out instantly, before the
    // fade-out (just started above) or the shrink itself ever plays — so
    // its own slot/a11y are set directly here instead, and its content is
    // only actually cleared once the move finishes, in the timeout below
    var outgoingInner = centerCard.querySelector('[data-pv-inner]');
    outgoingInner.classList.remove('al-pv-inner-visible');

    if (delta > 0) {
      centerCard.dataset.slot = 'left';
      setSlotA11y(centerCard, 'left');
      assignSlot(leftCard, 'offLeft');
      assignSlot(rightCard, 'center');
      assignSlot(offCard, 'right');
    } else {
      centerCard.dataset.slot = 'right';
      setSlotA11y(centerCard, 'right');
      assignSlot(rightCard, 'offRight');
      assignSlot(leftCard, 'center');
      assignSlot(offCard, 'left');
    }
    fillCenter(ORDER[currentIndex]);

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      outgoingInner.innerHTML = '';
      return;
    }
    var header = overlay.querySelector('.al-pv-header');
    if (header) header.classList.add('al-pv-header-hidden');
    animating = true;
    // cancels any timer still pending from a previous go() — can only
    // actually be one (this function's own `if (animating) return;` guard
    // blocks re-entry while animating), but close() can reset `animating`
    // out from under a still-pending timer (see close()), so a stale one
    // could otherwise survive into whatever this next go() schedules
    clearTimeout(moveTimer);
    moveTimer = setTimeout(function () {
      outgoingInner.innerHTML = '';
      animating = false;
      if (header) header.classList.remove('al-pv-header-hidden');
    }, MOVE_MS);
  }

  // every element inside the overlay a keyboard user could legitimately
  // land on right now — recomputed on each Tab press rather than cached
  // once, since the center card's real content (links, the "More work"
  // list) loads in asynchronously after open() and changes on every go().
  // Non-center cards are excluded implicitly: assignSlot() empties their
  // [data-pv-inner] and only left/right (never offLeft/offRight) carry
  // their own role=button/tabindex, so there's nothing stray to filter out
  function getFocusable() {
    return Array.from(overlay.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter(function (el) { return el.offsetParent !== null; });
  }

  function onKeydown(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowLeft') { go(-1); return; }
    if (e.key === 'ArrowRight') { go(1); return; }
    if (e.key !== 'Tab') return;
    // a focus trap: only intervenes right at the two ends of the tab
    // order, wrapping back to the other end, rather than fighting the
    // browser's own tab order in between — without this, tabbing past
    // either end escapes the modal into the page still sitting behind it
    var focusable = getFocusable();
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
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
      // moves keyboard focus into the dialog itself rather than leaving it
      // on the trigger link now sitting behind an inert-looking overlay —
      // the close button rather than the card content, since that content
      // is still an in-flight fetch at this exact point
      var closeBtn = overlay.querySelector('[data-pv-close]');
      if (closeBtn) closeBtn.focus();
    });
  }

  function close() {
    if (!overlay) return;
    // a go() transition can still be in flight when the overlay closes —
    // without this, its pending timeout fires later (up to MOVE_MS after
    // close), and by then `animating` is still true from that stale timer
    // never having run, so the very first peek-card click after reopening
    // is silently swallowed by go()'s own guard. Worse, if the same
    // physical card the stale timeout targets has already become the
    // center card again by the time it fires, its `innerHTML = ''` wipes
    // out content fillCenter() only just finished loading. Running the
    // same cleanup synchronously instead of just cancelling it also keeps
    // the header's hidden class from surviving into the next open()
    if (moveTimer) {
      clearTimeout(moveTimer);
      moveTimer = null;
      var header = overlay.querySelector('.al-pv-header');
      if (header) header.classList.remove('al-pv-header-hidden');
      animating = false;
    }
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
