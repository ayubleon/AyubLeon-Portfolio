(function () {
  var CSS = [
    "@font-face{font-family:'Gastroe';src:url('fonts/Gastroe-Demo.otf') format('opentype');font-weight:400;font-style:normal;font-display:swap;}",
    ".site-footer-link{font-size:14px;font-weight:400;color:rgba(244,238,235,0.88);text-decoration:none;transition:color .3s cubic-bezier(.22,1,.36,1),font-weight .3s cubic-bezier(.22,1,.36,1);}",
    ".site-footer-link:hover{color:#fff;font-weight:600;}",
    "@media (max-width:700px){.footer-nav-cols{gap:24px!important;}}",
    "@media (max-width:340px){.footer-nav-cols{grid-template-columns:1fr!important;gap:28px!important;}}"
  ].join('');
  var styleTag = document.createElement('style');
  styleTag.textContent = CSS;
  document.head.appendChild(styleTag);

  function copyEmail(e) {
    e.preventDefault();
    AL.copyText(
      'ayubleon9@gmail.com',
      function () { AL.showToast('Copied to Clipboard'); },
      function () { AL.showToast("Couldn't copy — email is ayubleon9@gmail.com", { glow: false }); }
    );
  }

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
  function measureTextWidth(text, fontSizePx, fontFamily) {
    if (!measureCanvas) measureCanvas = document.createElement('canvas');
    var ctx = measureCanvas.getContext('2d');
    ctx.font = fontSizePx + 'px ' + fontFamily;
    return ctx.measureText(text).width;
  }
  function sizeWordmark(el) {
    var container = el.parentElement;
    if (!container) return;
    var baseline = 200;
    var natural = measureTextWidth(el.textContent, baseline, "Gastroe, 'Instrument Serif', Georgia, serif");
    if (!natural) return;
    var target = container.getBoundingClientRect().width * 0.8;
    el.style.fontSize = (baseline * (target / natural)) + 'px';
    el.style.opacity = '1';
  }

  var FOOTER_HTML_FN = function (links) {
    return (
      '<footer class="mobile-gutter" style="position:relative;z-index:10;max-width:1400px;margin:0 auto;padding:0 40px 140px;">' +
        '<div style="padding-top:56px;border-top:1px solid rgba(255,255,255,0.1);">' +
          '<div class="footer-top" style="display:flex;align-items:flex-start;justify-content:space-between;gap:40px;flex-wrap:wrap;">' +
            '<div style="display:flex;align-items:center;gap:16px;">' +
              '<img src="images/ayub-avatar.svg" alt="Ayub Leon" style="width:64px;height:64px;border-radius:50%;background:#fff;display:block;flex:0 0 auto;">' +
              '<div style="display:flex;flex-direction:column;gap:3px;">' +
                '<p style="margin:0;font-family:Poppins,Helvetica,sans-serif;font-size:16px;font-weight:600;color:#f4eeeb;">Ayub Leon</p>' +
                '<p style="margin:0;font-family:Poppins,Helvetica,sans-serif;font-size:15px;font-weight:400;color:#73C41E;">Product Designer</p>' +
              '</div>' +
            '</div>' +
            '<div class="footer-nav-cols" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:48px;flex:0 1 380px;min-width:0;">' +
              '<div style="display:flex;flex-direction:column;gap:14px;">' +
                '<p style="margin:0;font-family:Poppins;font-size:11px;color:var(--al-section-title,rgba(239,232,229,0.66))">PAGES</p>' +
                '<a class="site-footer-link" href="' + links.home + '">Home</a>' +
                '<a class="site-footer-link" href="' + links.work + '">Work</a>' +
                '<a class="site-footer-link" href="' + links.about + '">About</a>' +
              '</div>' +
              '<div style="display:flex;flex-direction:column;gap:14px;">' +
                '<p style="margin:0;font-family:Poppins;font-size:11px;color:var(--al-section-title,rgba(239,232,229,0.66))">CONTACTS</p>' +
                '<a class="site-footer-link" href="mailto:ayubleon9@gmail.com" data-copy-email>Copy Email</a>' +
                '<a class="site-footer-link" href="https://www.linkedin.com/in/ayubleon" target="_blank" rel="noopener noreferrer">Linked In</a>' +
              '</div>' +
              '<div style="display:flex;flex-direction:column;gap:14px;">' +
                '<p style="margin:0;font-family:Poppins;font-size:11px;color:var(--al-section-title,rgba(239,232,229,0.66))">RESOURCES</p>' +
                '<a class="site-footer-link" href="Ayub%20Leon%20-%20Resume.pdf" target="_blank" rel="noopener noreferrer">Download Resume</a>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<p data-wordmark style="margin:56px 0 0;text-align:center;opacity:0;white-space:nowrap;font-family:\'Gastroe\',\'Instrument Serif\',Georgia,serif;font-weight:400;line-height:1;color:#f4eeeb;">ayubleon</p>' +
          '<p style="margin:16px 0 0;font-family:Poppins,Helvetica,sans-serif;font-size:12px;color:var(--al-text-muted,rgba(239,232,229,0.45));">©2026 Ayub Leon</p>' +
        '</div>' +
      '</footer>'
    );
  };

  function fill(el) {
    if (el.childElementCount > 0) return;
    el.innerHTML = FOOTER_HTML_FN(AL.pageLinks());

    var emailLink = el.querySelector('[data-copy-email]');
    if (emailLink) emailLink.addEventListener('click', copyEmail);

    var wordmark = el.querySelector('[data-wordmark]');
    if (wordmark) {
      var resize = function () { sizeWordmark(wordmark); };
      resize();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
      window.addEventListener('resize', resize);
      if (window.ResizeObserver) {
        new ResizeObserver(resize).observe(wordmark.parentElement);
      }
    }
  }

  function fillAll() {
    document.querySelectorAll('[data-footer-mount]').forEach(fill);
  }

  AL.selfHeal(fillAll);
})();
