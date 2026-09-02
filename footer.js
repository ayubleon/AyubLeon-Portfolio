(function () {
  var CSS = [
    ".footer-kb-key{opacity:0;transition:opacity .12s ease;}",
    ".footer-kb-key:hover{opacity:1;}",
    // hover alone reveals these (opacity:0 at rest) but never covered
    // keyboard focus — a tabbing user got no visible feedback at all on
    // this whole keyboard-style nav. Same outline treatment used
    // everywhere else on the site (nav.js's tooltip trigger, the project
    // popup's cards), plus the same opacity reveal :hover already gets,
    // since an outline drawn around a fully transparent key would look
    // like a floating, unexplained box
    ".footer-kb-key:focus-visible{opacity:1;outline:2px solid var(--al-green,#EF4418);outline-offset:2px;border-radius:4px;}",
    ".footer-kb-figma-color{opacity:0;transition:opacity .12s ease;}",
    ".footer-kb:has(.footer-kb-key:last-child:hover) .footer-kb-figma-color{opacity:1;}",
    ".site-footer-link{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:400;color:rgba(244,238,235,0.88);text-decoration:none;transition:color .3s cubic-bezier(.22,1,.36,1),font-weight .3s cubic-bezier(.22,1,.36,1);}",
    ".site-footer-link:hover{color:#fff;}",
    ".footer-figma-mask,.footer-figma-color{position:absolute;inset:0;transition:opacity .2s ease;}",
    ".footer-figma-color{opacity:0;}",
    ".site-footer-link:hover .footer-figma-mask{opacity:0;}",
    ".site-footer-link:hover .footer-figma-color{opacity:1;}",
    // keyboard is the default on web/tablet; links are the only option on
    // touch/mobile, where the toggle itself is hidden below that width so
    // it never lands in keyboard mode with no way to switch back
    // minmax(0, max-content) rather than 1fr: a column sizes to fit its
    // longest link on one line whenever the row has room for that (its
    // max-content contribution is that link's natural, unwrapped width),
    // and only shrinks toward its 0 minimum — forcing a wrap — once the
    // row is genuinely too narrow to fit all three at that size
    ".footer-nav-cols{display:grid;grid-template-columns:repeat(3,minmax(0,max-content));gap:48px;}",
    ".footer-kb-col{display:none;}",
    ".footer-mode-toggle{display:none;}",
    "@media (min-width:701px){.footer-mode-toggle{display:inline-flex;}" +
      ".footer-right-group.footer-mode-keyboard .footer-nav-cols{display:none;}" +
      ".footer-right-group.footer-mode-keyboard .footer-kb-col{display:flex;}}",
    ".footer-mode-toggle{width:32px;height:32px;padding:0;border:1px solid var(--al-border,rgba(255,255,255,0.13));border-radius:999px;background:var(--al-card,#1C1C1E);color:rgba(239,232,229,0.66);align-items:center;justify-content:center;cursor:pointer;flex:0 0 auto;transition:color .25s ease,background .25s ease,border-color .25s ease;}",
    ".footer-mode-toggle svg{stroke:currentColor;stroke-width:2;}",
    ".footer-mode-toggle:hover{color:#fff;background:var(--al-card-hover,#2A2A2C);border-color:var(--al-border-strong,rgba(255,255,255,0.16));}",
    // below 701px links mode is the only option (no toggle to keyboard),
    // so equal-width columns take over here instead of max-content sizing:
    // a long single link like "Download Resume" wrapping to two lines is
    // preferable to it claiming extra column width and crowding its
    // neighbors' spacing
    "@media (max-width:700px){.footer-nav-cols{grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;}}",
    "@media (max-width:340px){.footer-nav-cols{grid-template-columns:1fr;gap:28px;}}"
  ].join('');
  var styleTag = document.createElement('style');
  styleTag.textContent = CSS;
  document.head.appendChild(styleTag);

  // same hover-tick sound as the close buttons/"More work" rows, gated the
  // same way: real hover support only (a touch tap fires a synthetic
  // mouseenter right before click, which would double up with a tap
  // sound), and ignored until a genuine mousemove has happened since load
  // (a click can leave the cursor resting over a freshly-laid-out element
  // at the same screen position with no actual mouse movement)
  // shared across every component file that needs it (see shared.js) —
  // each used to build its own independent player for the same sound
  var playSwitch = AL.playSwitch;
  var supportsHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var mouseHasMoved = false;
  window.addEventListener('mousemove', function () { mouseHasMoved = true; }, { once: true, passive: true });
  function playSwitchOnRealHover() { if (mouseHasMoved) playSwitch(); }

  // lives outside the DOM on purpose: support.js can tear down and rebuild
  // <main> (and this mount along with it) in more than one wave after
  // first paint, which wipes any state kept only as a class on the
  // rebuilt node — keeping the current mode here instead means fill()
  // can always re-apply it to whatever fresh markup shows up
  var footerMode = 'keyboard';

  // fill() can rebuild the footer mount more than once (same support.js
  // rebuild-wave behavior noted above), each time creating a fresh
  // [data-wordmark] element and wiring its own resize handling to it.
  // window and its ResizeObserver registry both outlive that rebuild, so
  // without tearing the previous pair down first here, every rebuild
  // stacks another permanent 'resize' listener and another live
  // ResizeObserver, both holding the now-detached previous wordmark node
  // in memory indefinitely
  var wordmarkResizeListener = null;
  var wordmarkResizeObserver = null;

  // sizes the wordmark so its rendered width is always exactly 80% of the
  // footer's content width, measured directly rather than approximated
  // with viewport units (font metrics don't scale linearly with vw)
  //
  // measured via canvas rather than DOM layout: a block-level element's
  // own getBoundingClientRect/scrollWidth both just report the container's
  // width regardless of its text content, so the only reliable way to get
  // the wordmark's true rendered width at a given font-size is to measure
  // it independently of layout
  var measureCanvas = null;
  function measureTextWidth(text, fontSizePx, fontFamily, fontWeight) {
    if (!measureCanvas) measureCanvas = document.createElement('canvas');
    var ctx = measureCanvas.getContext('2d');
    ctx.font = fontWeight + ' ' + fontSizePx + 'px ' + fontFamily;
    return ctx.measureText(text).width;
  }
  function sizeWordmark(el) {
    var container = el.parentElement;
    if (!container) return;
    var baseline = 200;
    // weight is part of the measurement since Poppins' bolder cuts run
    // measurably wider — leaving it out would size against the wrong
    // natural width
    var natural = measureTextWidth(el.textContent, baseline, 'Poppins, Helvetica, sans-serif', '600');
    if (!natural) return;
    var target = container.getBoundingClientRect().width * 0.8;
    el.style.fontSize = (baseline * (target / natural)) + 'px';
    el.style.opacity = '1';
  }

  // key rects lifted directly from the source SVGs' geometry (444x138
  // viewBox): each key's position/size as % of the widget, plus the
  // background-size/position needed to crop the hover SVG down to just
  // that key so every key gets its own independent hover state
  var FOOTER_KB_KEYS = [
    { l: 0.901, t: 2.899, w: 31.532, h: 45.652, bx: 1.316, by: 5.333, bsx: 317.143, bsy: 219.048, kind: 'home' },
    { l: 34.234, t: 2.899, w: 31.532, h: 45.652, bx: 50, by: 5.333, bsx: 317.143, bsy: 219.048, kind: 'copy-email' },
    { l: 67.568, t: 2.899, w: 31.532, h: 45.652, bx: 98.684, by: 5.333, bsx: 317.143, bsy: 219.048, kind: 'resume' },
    { l: 0.901, t: 51.449, w: 15.315, h: 45.652, bx: 1.064, by: 94.667, bsx: 652.941, bsy: 219.048, kind: 'work' },
    { l: 17.117, t: 51.449, w: 15.315, h: 45.652, bx: 20.213, by: 94.667, bsx: 652.941, bsy: 219.048, kind: 'about' },
    { l: 34.234, t: 51.449, w: 31.532, h: 45.652, bx: 50, by: 94.667, bsx: 317.143, bsy: 219.048, kind: 'linkedin' },
    { l: 67.568, t: 51.449, w: 15.315, h: 45.652, inactive: true },
    { l: 83.784, t: 51.449, w: 15.315, h: 45.652, bx: 98.936, by: 94.667, bsx: 652.941, bsy: 219.048, kind: 'figma' }
  ];

  // the three column titles sit directly above the matching key column
  // (home/about, copy email/linkedin, download resume) — same left/width
  // as the wide top-row key in that column, styled like the section
  // titles this replaced
  var FOOTER_KB_COLS = [
    { l: 0.901, w: 31.532, label: 'PAGES' },
    { l: 34.234, w: 31.532, label: 'CONTACTS' },
    { l: 67.568, w: 31.532, label: 'RESOURCES' }
  ];

  // the figma key's grey icon is baked into the default SVG itself now;
  // this overlay is the full-color version (extracted from the hover SVG's
  // pattern fill), positioned on the exact same rect, faded in on hover
  var FOOTER_KB_FIGMA = { l: 89.640, t: 68.478, w: 3.604, h: 11.594 };

  var FIGMA_URL = 'https://www.figma.com/design/T4ApnwFkFlZQZUWD7Op28M/AYUB-LEON-PORTFOLIO?node-id=118-2277&t=8rMF6Zi50yQt1cjK-1';

  var FOOTER_MODE_TOGGLE_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3h7"/><path d="M3 3h5.28a1 1 0 0 1 .948.684l5.544 16.632a1 1 0 0 0 .949.684H21"/></svg>';

  // shared by both of the footer's cursor-following tooltips (the Figma
  // triggers' and the layout toggle's) so the two can't drift apart —
  // position:fixed because AL.positionCursorTooltip writes viewport
  // coordinates, and parked off-screen until a hover moves it so it never
  // flashes at 0,0 on first paint
  var CURSOR_TOOLTIP_CSS = 'position:fixed;top:0;left:0;z-index:9999;padding:6px 12px;background:#0056FF;color:#ffffff;font-family:Poppins,Helvetica,sans-serif;font-size:12.5px;font-weight:500;white-space:nowrap;border-radius:0;opacity:0;pointer-events:none;transition:opacity .15s ease;transform:translate(-9999px,-9999px);';

  // the pale-to-color Figma icon crossfade, reused for the icon-only
  // Figma link (RESOURCES column) — same mask trick as the keyboard's
  // Figma key: a solid-color silhouette by default, the real logo faded
  // in on hover
  function figmaIconHTML(size) {
    return (
      '<span style="position:relative;width:' + size + 'px;height:' + size + 'px;flex:0 0 auto;display:inline-block;">' +
        '<span class="footer-figma-mask" style="background-color:rgba(244,238,235,0.88);-webkit-mask-image:url(images/figma-icon.png);mask-image:url(images/figma-icon.png);-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;"></span>' +
        '<span class="footer-figma-color" style="background-image:url(images/figma-icon.png);background-size:100% 100%;background-repeat:no-repeat;"></span>' +
      '</span>'
    );
  }

  function footerKeyboardKeyAttrs(k, links) {
    switch (k.kind) {
      case 'home': return ' href="' + links.home + '"';
      case 'work': return ' href="' + links.work + '"';
      case 'about': return ' href="' + links.about + '"';
      case 'copy-email': return ' href="mailto:ayubleon.pd@gmail.com" data-copy-email';
      case 'resume': return ' href="/resume" target="_blank" rel="noopener noreferrer"';
      case 'linkedin': return ' href="https://www.linkedin.com/in/ayubleon" target="_blank" rel="noopener noreferrer"';
      case 'figma': return ' href="' + FIGMA_URL + '" target="_blank" rel="noopener noreferrer" data-figma-key';
      default: return '';
    }
  }

  function footerKeyboardHTML(links) {
    var keys = FOOTER_KB_KEYS.filter(function (k) { return !k.inactive; }).map(function (k) {
      var attrs = footerKeyboardKeyAttrs(k, links);
      var tag = attrs ? 'a' : 'div';
      return '<' + tag + ' class="footer-kb-key"' + attrs + ' style="position:absolute;left:' + k.l + '%;top:' + k.t + '%;width:' + k.w + '%;height:' + k.h + '%;display:block;color:inherit;text-decoration:none;background-image:url(images/footer-keyboard-hover.svg);background-repeat:no-repeat;background-size:' + k.bsx + '% ' + k.bsy + '%;background-position:' + k.bx + '% ' + k.by + '%;"></' + tag + '>';
    }).join('');
    var titles = FOOTER_KB_COLS.map(function (c) {
      return '<p style="position:absolute;left:' + c.l + '%;top:0;width:' + c.w + '%;margin:0;text-align:center;font-family:Poppins;font-size:11px;color:var(--al-section-title,rgba(239,232,229,0.66))">' + c.label + '</p>';
    }).join('');
    return (
      '<div class="footer-kb-col" style="flex-direction:column;gap:14px;">' +
        '<div style="position:relative;width:400px;max-width:90vw;height:11px;">' + titles + '</div>' +
        '<div class="footer-kb" aria-hidden="true" style="position:relative;width:400px;max-width:90vw;aspect-ratio:444/138;flex:0 0 auto;">' +
          '<img src="images/footer-keyboard-default.svg" alt="" style="position:absolute;inset:0;width:100%;height:100%;display:block;">' +
          '<img src="images/figma-icon.png" alt="" class="footer-kb-figma-color" style="position:absolute;left:' + FOOTER_KB_FIGMA.l + '%;top:' + FOOTER_KB_FIGMA.t + '%;width:' + FOOTER_KB_FIGMA.w + '%;height:' + FOOTER_KB_FIGMA.h + '%;display:block;">' +
          keys +
        '</div>' +
      '</div>'
    );
  }

  var FOOTER_HTML_FN = function (links) {
    return (
      '<footer class="mobile-gutter" style="position:relative;z-index:10;max-width:1400px;margin:0 auto;padding:0 40px 140px;">' +
        '<div style="padding-top:56px;border-top:1px solid rgba(255,255,255,0.1);">' +
          '<div class="footer-top" style="display:flex;align-items:flex-start;justify-content:space-between;gap:40px;flex-wrap:wrap;">' +
            '<div style="display:flex;align-items:center;gap:16px;">' +
              '<img src="images/badge-name.svg" alt="Ayub Leon" style="width:16px;height:48px;display:block;flex:0 0 auto;">' +
              '<div style="display:flex;flex-direction:column;gap:3px;">' +
                '<p style="margin:0;font-family:Poppins,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#f4eeeb;">Ayub Leon</p>' +
                '<p style="margin:0;font-family:\'Schibsted Grotesk\',Helvetica,Arial,sans-serif;font-size:14px;font-weight:400;color:#0A84FF;">Product Designer</p>' +
              '</div>' +
            '</div>' +
            '<div class="footer-right-group" style="display:flex;align-items:flex-start;gap:20px;">' +
              '<button type="button" class="footer-mode-toggle" data-footer-mode-toggle aria-label="Switch footer layout">' + FOOTER_MODE_TOGGLE_ICON + '</button>' +
              '<div class="footer-nav-cols" style="flex:0 1 auto;min-width:0;">' +
                '<div style="display:flex;flex-direction:column;gap:14px;">' +
                  '<p style="margin:0;font-family:Poppins;font-size:11px;color:var(--al-section-title,rgba(239,232,229,0.66))">PAGES</p>' +
                  '<a class="site-footer-link" href="' + links.home + '">Home</a>' +
                  '<a class="site-footer-link" href="' + links.work + '">Work</a>' +
                  '<a class="site-footer-link" href="' + links.about + '">About</a>' +
                '</div>' +
                '<div style="display:flex;flex-direction:column;gap:14px;">' +
                  '<p style="margin:0;font-family:Poppins;font-size:11px;color:var(--al-section-title,rgba(239,232,229,0.66))">CONTACTS</p>' +
                  '<a class="site-footer-link" href="mailto:ayubleon.pd@gmail.com" data-copy-email>Copy Email</a>' +
                  '<a class="site-footer-link" href="https://www.linkedin.com/in/ayubleon" target="_blank" rel="noopener noreferrer">Linked In</a>' +
                '</div>' +
                '<div style="display:flex;flex-direction:column;gap:14px;">' +
                  '<p style="margin:0;font-family:Poppins;font-size:11px;color:var(--al-section-title,rgba(239,232,229,0.66))">RESOURCES</p>' +
                  '<a class="site-footer-link" href="/resume" target="_blank" rel="noopener noreferrer">Download Resume</a>' +
                  '<a class="site-footer-link" href="' + FIGMA_URL + '" target="_blank" rel="noopener noreferrer" aria-label="Figma" data-figma-key>' + figmaIconHTML(14) + '</a>' +
                '</div>' +
              '</div>' +
              footerKeyboardHTML(links) +
            '</div>' +
          '</div>' +
          '<p data-wordmark style="margin:56px 0 0;text-align:center;opacity:0;white-space:nowrap;font-family:Poppins,Helvetica,sans-serif;font-weight:600;line-height:1;color:rgba(239,232,229,0.12);">ayubleon</p>' +
          '<p style="margin:40px 0 0;font-family:Poppins,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:var(--al-text-muted,rgba(239,232,229,0.45));">©2026<br>Designed in Figma, Built with Claude</p>' +
        '</div>' +
      '</footer>' +
      '<span data-figma-tooltip aria-hidden="true" style="' + CURSOR_TOOLTIP_CSS + '">Website breakdown</span>' +
      '<span data-mode-tooltip aria-hidden="true" style="' + CURSOR_TOOLTIP_CSS + '">Click to switch</span>'
    );
  };

  function copyEmail(e) {
    e.preventDefault();
    AL.copyText(
      'ayubleon.pd@gmail.com',
      function () { AL.showToast('Copied to Clipboard'); },
      function () { AL.showToast("Couldn't copy — email is ayubleon.pd@gmail.com", { glow: false }); }
    );
  }

  // guarded by a flag on the actual wired toggle rather than plain
  // childElementCount — see the identical comment in nav.js's fill() for
  // why: something outside this file's control has been observed
  // re-populating this mount with matching-but-unwired markup, and a
  // childElementCount check alone can't tell that apart from this file's
  // own already-wired content
  function fill(el) {
    var probe = el.querySelector('[data-footer-mode-toggle]');
    if (probe && probe.__footerWired) return;
    el.innerHTML = FOOTER_HTML_FN(AL.pageLinks());

    el.querySelectorAll('[data-copy-email]').forEach(function (emailLink) {
      emailLink.addEventListener('click', copyEmail);
    });

    var modeToggle = el.querySelector('[data-footer-mode-toggle]');
    var rightGroup = el.querySelector('.footer-right-group');
    if (modeToggle && rightGroup) {
      rightGroup.classList.toggle('footer-mode-keyboard', footerMode === 'keyboard');
      modeToggle.addEventListener('click', function () {
        footerMode = footerMode === 'keyboard' ? 'links' : 'keyboard';
        rightGroup.classList.toggle('footer-mode-keyboard', footerMode === 'keyboard');
      });
      // a plain JS property, not a data-* attribute: set only now that
      // the click listener above is actually attached, and — unlike an
      // attribute — it can never end up on a node that only looks like
      // this one. If something outside this file ever recreates this
      // toggle from serialized HTML (which carries attributes but not JS
      // properties, and can't carry listeners either), the copy
      // correctly reads as unwired instead of falsely inheriting
      // "already done"
      modeToggle.__footerWired = true;
    }

    var wordmark = el.querySelector('[data-wordmark]');
    if (wordmark) {
      if (wordmarkResizeListener) window.removeEventListener('resize', wordmarkResizeListener);
      if (wordmarkResizeObserver) wordmarkResizeObserver.disconnect();
      var resize = function () { sizeWordmark(wordmark); };
      wordmarkResizeListener = resize;
      resize();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
      window.addEventListener('resize', resize);
      if (window.ResizeObserver) {
        wordmarkResizeObserver = new ResizeObserver(resize);
        wordmarkResizeObserver.observe(wordmark.parentElement);
      }
    }

    if (supportsHover) {
      el.querySelectorAll('.footer-kb-key').forEach(function (key) {
        key.addEventListener('mouseenter', playSwitchOnRealHover);
      });
      if (modeToggle) modeToggle.addEventListener('mouseenter', playSwitchOnRealHover);
      // same tactile click-switch sound as the keyboard's own keys, so the
      // plain-links layout gets the same hover feedback as the keyboard
      // one rather than feeling like a lesser fallback
      el.querySelectorAll('.site-footer-link').forEach(function (link) {
        link.addEventListener('mouseenter', playSwitchOnRealHover);
      });

      // same cursor-following tooltip treatment as the About page's
      // Behance trigger — blue tag beside the cursor, offset so it doesn't
      // sit directly under the pointer. Takes a list of triggers rather
      // than one, since the Figma tag answers to both of its triggers (the
      // keyboard's Figma key and the RESOURCES icon link each carry
      // data-figma-key)
      var bindCursorTooltip = function (tip, triggers) {
        if (!tip || !triggers.length) return;
        var move = function (e) { AL.positionCursorTooltip(tip, e, 18, 20, 'left'); };
        triggers.forEach(function (trigger) {
          trigger.addEventListener('mouseenter', function (e) {
            tip.style.opacity = '1';
            move(e);
          });
          trigger.addEventListener('mousemove', move);
          trigger.addEventListener('mouseleave', function () { tip.style.opacity = '0'; });
        });
      };
      bindCursorTooltip(
        el.querySelector('[data-figma-tooltip]'),
        Array.from(el.querySelectorAll('[data-figma-key]'))
      );
      // the layout toggle gives no hint what it does — the icon alone
      // doesn't read as "swap the footer between keyboard and links"
      bindCursorTooltip(
        el.querySelector('[data-mode-tooltip]'),
        modeToggle ? [modeToggle] : []
      );
    }
  }

  function fillAll() {
    document.querySelectorAll('[data-footer-mount]').forEach(fill);
  }

  AL.selfHeal(fillAll);
})();
