(function () {
  var CSS = [
    "@font-face{font-family:'Gastroe';src:url('fonts/Gastroe-Demo.otf') format('opentype');font-weight:400;font-style:normal;font-display:swap;}",
    "@keyframes footerToastSpin{from{transform:translate(-50%,-50%) rotate(0deg);}to{transform:translate(-50%,-50%) rotate(360deg);}}",
    ".site-footer-link{color:rgba(244,238,235,0.88);text-decoration:none;transition:color .3s cubic-bezier(.22,1,.36,1);}",
    ".site-footer-link:hover{color:#73C41E;}",
    "@media (max-width:700px){.footer-nav-cols{gap:32px!important;}}"
  ].join('');
  var styleTag = document.createElement('style');
  styleTag.textContent = CSS;
  document.head.appendChild(styleTag);

  function pageLinks() {
    var root = document.querySelector('[data-screen-label]');
    var label = root ? root.getAttribute('data-screen-label') : '';
    if (label === 'Hero') {
      return { home: '#top', work: '#work', about: 'Ayub Leon - About.dc.html' };
    }
    if (label === 'About') {
      return { home: 'Ayub%20Leon%20-%20Landing%20Page.dc.html', work: 'Ayub%20Leon%20-%20Landing%20Page.dc.html#work', about: '#top' };
    }
    return { home: 'Ayub%20Leon%20-%20Landing%20Page.dc.html', work: 'Ayub%20Leon%20-%20Landing%20Page.dc.html#work', about: 'Ayub Leon - About.dc.html' };
  }

  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (err) {}
    document.body.removeChild(ta);
  }

  // built once per page, independent of how many times the footer markup
  // itself gets (re)injected
  var showToast = (function () {
    var wrap = document.createElement('div');
    wrap.setAttribute('role', 'status');
    wrap.setAttribute('aria-live', 'polite');
    wrap.style.cssText = 'position:fixed;left:50%;bottom:34px;z-index:60;padding:1.6px;border-radius:999px;overflow:hidden;isolation:isolate;box-shadow:0 30px 70px -26px rgba(0,0,0,0.98);opacity:0;transform:translate(-50%,18px);pointer-events:none;transition:opacity .45s cubic-bezier(.22,1,.36,1),transform .55s cubic-bezier(.22,1,.36,1);';
    wrap.innerHTML =
      '<div aria-hidden="true" style="position:absolute;left:50%;top:50%;width:260%;aspect-ratio:1;background:conic-gradient(from 0deg, rgba(255,255,255,0) 0deg, rgba(255,255,255,0) 200deg, #ff5a2b 292deg, #ffd0b8 330deg, #ffffff 348deg, rgba(255,255,255,0) 360deg);animation:footerToastSpin 2.6s linear infinite;"></div>' +
      '<div style="position:relative;display:flex;align-items:center;padding:14px 24px;border-radius:999px;background:#100908;font-family:\'Schibsted Grotesk\',Helvetica,sans-serif;font-size:14px;letter-spacing:-0.005em;color:#fdf9f7;">' +
        '<span data-toast-text style="font-family:Poppins">Copied to Clipboard</span>' +
      '</div>';
    document.body.appendChild(wrap);
    var timer;
    return function showToast(msg) {
      var textEl = wrap.querySelector('[data-toast-text]');
      if (textEl) textEl.textContent = msg;
      wrap.style.opacity = '1';
      wrap.style.transform = 'translate(-50%, 0)';
      clearTimeout(timer);
      timer = setTimeout(function () {
        wrap.style.opacity = '0';
        wrap.style.transform = 'translate(-50%, 18px)';
      }, 2600);
    };
  })();

  function copyEmail(e) {
    e.preventDefault();
    var email = 'ayubleon9@gmail.com';
    var done = function () { showToast('Copied to Clipboard'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).then(done).catch(function () { fallbackCopy(email, done); });
    } else {
      fallbackCopy(email, done);
    }
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
      '<footer class="mobile-gutter" style="position:relative;z-index:10;max-width:1400px;margin:0 auto;padding:0 40px 64px;">' +
        '<div style="padding-top:56px;border-top:1px solid rgba(255,255,255,0.1);">' +
          '<div class="footer-top" style="display:flex;align-items:flex-start;justify-content:space-between;gap:40px;flex-wrap:wrap;">' +
            '<div style="display:flex;align-items:center;gap:16px;">' +
              '<img src="images/ayub-avatar.svg" alt="Ayub Leon" style="width:64px;height:64px;border-radius:50%;background:#fff;display:block;flex:0 0 auto;">' +
              '<div style="display:flex;flex-direction:column;gap:3px;">' +
                '<p style="margin:0;font-family:Poppins,Helvetica,sans-serif;font-size:16px;font-weight:600;color:#f6f0ed;">Ayub Leon</p>' +
                '<p style="margin:0;font-family:Poppins,Helvetica,sans-serif;font-size:15px;font-weight:500;color:#73C41E;">Product Designer</p>' +
              '</div>' +
            '</div>' +
            '<div class="footer-nav-cols" style="display:grid;grid-template-columns:repeat(2,minmax(150px,1fr));gap:64px;">' +
              '<div style="display:flex;flex-direction:column;gap:14px;">' +
                '<p style="margin:0;font-family:Poppins;font-size:11px;letter-spacing:0.18em;color:rgba(239,232,229,0.45)">PAGES</p>' +
                '<a class="site-footer-link" href="' + links.home + '">Home</a>' +
                '<a class="site-footer-link" href="' + links.work + '">Work</a>' +
                '<a class="site-footer-link" href="' + links.about + '">About</a>' +
              '</div>' +
              '<div style="display:flex;flex-direction:column;gap:14px;">' +
                '<p style="margin:0;font-family:Poppins;font-size:11px;letter-spacing:0.18em;color:rgba(239,232,229,0.45)">CONTACT &amp; RESOURCES</p>' +
                '<a class="site-footer-link" href="mailto:ayubleon9@gmail.com" data-copy-email>Copy Email</a>' +
                '<a class="site-footer-link" href="https://www.linkedin.com/in/ayubleon" target="_blank" rel="noopener noreferrer">Linked In</a>' +
                '<a class="site-footer-link" href="Ayub%20Leon%20-%20Resume.pdf" target="_blank" rel="noopener noreferrer">Download Resume</a>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<p data-wordmark style="margin:56px 0 0;text-align:center;opacity:0;white-space:nowrap;font-family:\'Gastroe\',\'Instrument Serif\',Georgia,serif;font-weight:400;line-height:1;color:#f6f0ed;">ayubleon</p>' +
          '<p style="margin:16px 0 0;font-family:Poppins,Helvetica,sans-serif;font-size:13px;color:rgba(239,232,229,0.45);">©2026 Ayub Leon</p>' +
        '</div>' +
      '</footer>'
    );
  };

  function fill(el) {
    if (el.childElementCount > 0) return;
    el.innerHTML = FOOTER_HTML_FN(pageLinks());

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
