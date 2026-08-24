(function () {
  var CSS = [
    "@keyframes siteNavRise{from{opacity:0;transform:translateX(-50%) translateY(16px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}",
    ".site-nav-dock{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:40;display:flex;align-items:center;gap:4px;padding:8px;border-radius:999px;border:1px solid var(--al-border,rgba(255,255,255,0.13));background:var(--al-card,#1C1C1E);box-shadow:inset 0 1px 0 var(--al-border-strong,rgba(255,255,255,0.16)),inset 0 -1px 0 rgba(0,0,0,0.35),0 22px 50px -28px rgba(0,0,0,0.9);animation:siteNavRise .8s cubic-bezier(.22,1,.36,1) .1s both;}",
    // same border-only cursor-tracked glow as the case-study "More work"
    // cards: a real sibling span (not ::before — see case-labels.js for
    // why), masked to just the border ring, lit by a radial-gradient
    // following --mx/--my, fixed to a tight 70px radius so the highlight
    // stays a localized point on this wide pill rather than spreading
    // edge-to-edge like the farthest-corner sizing used on the cards
    ".site-nav-glow{position:absolute;inset:0;border-radius:inherit;padding:1px;background:radial-gradient(70px circle at var(--mx,50%) var(--my,50%),rgba(255,255,255,0.95) 0%,transparent 65%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none;opacity:0;transition:opacity .3s ease;}",
    "@media (prefers-reduced-motion: reduce){.site-nav-glow{display:none;}}",
    ".site-nav-link{padding:12px 22px;border-radius:999px;font-size:14.5px;font-weight:500;color:rgba(244,238,235,0.7);transition:background .25s ease,color .25s ease;}",
    ".site-nav-link:hover{color:#fff;background:var(--al-card-hover,#2A2A2C);}",
    ".site-nav-link.is-active{color:#fff;background:var(--al-card-hover,#2A2A2C);font-weight:600;}",
    ".site-nav-divider{width:1px;align-self:stretch;margin:8px 6px;background:rgba(255,255,255,0.14);}",
    ".site-nav-avatar-btn{position:relative;border:0;padding:0;margin:0;background:none;cursor:pointer;border-radius:50%;flex:0 0 auto;display:flex;-webkit-tap-highlight-color:transparent;}",
    ".site-nav-avatar{width:42px;height:42px;border-radius:50%;background:#fff;display:block;flex:0 0 auto;padding:3px;pointer-events:none;}",
    ".site-nav-tooltip{position:absolute;bottom:calc(100% + 12px);left:50%;transform:translate(-50%,4px);background:var(--al-card,#1C1C1E);color:#f4eeeb;font-family:Poppins,Helvetica,sans-serif;font-size:12.5px;font-weight:500;letter-spacing:-0.005em;padding:6px 11px;border-radius:14px;white-space:nowrap;border:1px solid rgba(255,255,255,0.12);box-shadow:0 10px 24px -10px rgba(0,0,0,0.7);opacity:0;pointer-events:none;transition:opacity .2s ease,transform .2s ease;}",
    ".site-nav-tooltip::after{content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);border:5px solid transparent;border-top-color:var(--al-card,#1C1C1E);}",
    ".site-nav-avatar-btn:hover .site-nav-tooltip,.site-nav-avatar-btn:focus-visible .site-nav-tooltip{opacity:1;transform:translate(-50%,0);}",
    "@media (max-width:700px){.site-nav-dock{bottom:16px;gap:4px;}.site-nav-link{padding:11px 16px;font-size:13px;}}",
    ".site-contact-backdrop{position:fixed;inset:0;z-index:39;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;pointer-events:none;transition:opacity .35s ease;}",
    ".site-contact-backdrop.is-open{opacity:1;pointer-events:auto;}",
    ".site-contact-card{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%) rotate(2deg) scale(0.4);width:min(300px,calc(100vw - 32px));background:var(--al-card,#1C1C1E);border:1px solid var(--al-border,rgba(255,255,255,0.13));border-radius:18px;padding:68px 24px 24px;box-shadow:inset 0 1px 0 var(--al-border-strong,rgba(255,255,255,0.16)),inset 0 -1px 0 rgba(0,0,0,0.35),0 30px 70px -26px rgba(0,0,0,0.9);z-index:41;opacity:0;pointer-events:none;transition:opacity .35s cubic-bezier(.22,1,.36,1),transform .55s cubic-bezier(.16,1,.3,1);" +
    // nametag lanyard-hole: punch a fixed-size pill out of the card so
    // whatever sits behind it (the blurred page backdrop) shows through,
    // via the same dual-layer mask-composite:exclude technique used for
    // the border-ring glows elsewhere — layer A is an opaque full-box
    // rect, layer B is a small pill SVG at a fixed pixel size/position;
    // exclude keeps everything except where the two overlap
    "-webkit-mask:linear-gradient(#000 0 0) border-box,url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxMDAnIGhlaWdodD0nMTQnPjxyZWN0IHdpZHRoPScxMDAnIGhlaWdodD0nMTQnIHJ4PSc3JyBmaWxsPSdibGFjaycvPjwvc3ZnPg==) center 23px/100px 14px no-repeat;" +
    "mask:linear-gradient(#000 0 0) border-box,url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxMDAnIGhlaWdodD0nMTQnPjxyZWN0IHdpZHRoPScxMDAnIGhlaWdodD0nMTQnIHJ4PSc3JyBmaWxsPSdibGFjaycvPjwvc3ZnPg==) center 23px/100px 14px no-repeat;" +
    "-webkit-mask-composite:xor;mask-composite:exclude;}",
    ".site-contact-card.is-open{opacity:1;pointer-events:auto;}",
    "@media (max-width:700px){.site-contact-card{width:min(300px,calc(100vw - 64px));}}",
    ".site-contact-close{position:absolute;top:16px;right:16px;width:28px;height:28px;border:0;background:none;color:#8E8D8E;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:color .25s ease;}",
    ".site-contact-close:hover{color:#fff;}",
    ".site-contact-header{display:flex;align-items:center;gap:16px;}",
    ".site-contact-avatar-flip{position:relative;width:76px;height:76px;flex:0 0 auto;border:0;padding:0;margin:0;background:none;cursor:pointer;perspective:400px;-webkit-tap-highlight-color:transparent;}",
    ".site-contact-avatar-face{position:absolute;inset:0;border-radius:50%;backface-visibility:hidden;-webkit-backface-visibility:hidden;transition:transform .6s cubic-bezier(.22,1,.36,1);transform:rotateY(0deg);}",
    ".site-contact-avatar-face-back{transform:rotateY(180deg);}",
    ".site-contact-avatar-flip.is-flipped .site-contact-avatar-face-front{transform:rotateY(-180deg);}",
    ".site-contact-avatar-flip.is-flipped .site-contact-avatar-face-back{transform:rotateY(0deg);}",
    ".site-contact-avatar{width:76px;height:76px;border-radius:50%;background:#fff;display:block;object-fit:cover;}",
    ".site-contact-name{margin:0;font-family:'Gastroe','Instrument Serif',Georgia,serif;font-weight:400;font-size:20px;color:#fff;}",
    ".site-contact-role{margin:2px 0 0;font-family:Poppins,Helvetica,sans-serif;font-size:13px;font-weight:500;color:var(--al-green,#73C41E);}",
    ".site-contact-blurb{margin:18px 0 0;font-family:Poppins,Helvetica,sans-serif;font-size:13.5px;line-height:1.55;color:rgba(244,238,235,0.82);}",
    ".site-contact-link{display:block;color:var(--al-green,#73C41E);text-decoration:none;}",
    ".site-contact-link:hover{color:var(--al-green-hover,#8fe030);}",
    ".site-contact-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:20px;}",
    ".site-contact-action{display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 8px;border-radius:16px;background:var(--al-card-hover,#2A2A2C);text-decoration:none;color:var(--al-section-title,rgba(239,232,229,0.66));transition:background .25s ease,color .25s ease;}",
    ".site-contact-action:hover{background:#343438;color:#fff;}",
    ".site-contact-action span{font-family:Poppins,Helvetica,sans-serif;font-size:12px;color:rgba(244,238,235,0.75);transition:color .25s ease;}",
    ".site-contact-action:hover span{color:#fff;}",
    ".site-contact-action svg{display:block;}"
  ].join('');
  var styleTag = document.createElement('style');
  styleTag.textContent = CSS;
  document.head.appendChild(styleTag);

  var MAIL_SVG = '<svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M29.3333 9.33325L17.3453 16.9693C16.9385 17.2055 16.4764 17.33 16.006 17.33C15.5355 17.33 15.0734 17.2055 14.6666 16.9693L2.66663 9.33325" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M26.6666 5.33325H5.33329C3.86053 5.33325 2.66663 6.52716 2.66663 7.99992V23.9999C2.66663 25.4727 3.86053 26.6666 5.33329 26.6666H26.6666C28.1394 26.6666 29.3333 25.4727 29.3333 23.9999V7.99992C29.3333 6.52716 28.1394 5.33325 26.6666 5.33325Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var RESUME_SVG = '<svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.00004 29.3334C7.2928 29.3334 6.61452 29.0525 6.11442 28.5524C5.61433 28.0523 5.33337 27.374 5.33337 26.6668V5.33342C5.33337 4.62617 5.61433 3.9479 6.11442 3.4478C6.61452 2.9477 7.2928 2.66675 8.00004 2.66675H18.6667C19.0888 2.66607 19.5068 2.74889 19.8967 2.91044C20.2867 3.072 20.6408 3.3091 20.9387 3.60809L25.7227 8.39209C26.0225 8.69009 26.2603 9.04455 26.4223 9.43497C26.5843 9.82539 26.6674 10.244 26.6667 10.6668V26.6668C26.6667 27.374 26.3858 28.0523 25.8857 28.5524C25.3856 29.0525 24.7073 29.3334 24 29.3334H8.00004Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.6666 2.66675V9.33342C18.6666 9.68704 18.8071 10.0262 19.0572 10.2762C19.3072 10.5263 19.6463 10.6667 20 10.6667H26.6666" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 24V16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 20L16 24L20 20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var LINKEDIN_SVG = '<svg width="21" height="21" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.909239 26.7887H4.54928C5.05147 26.7887 5.45852 26.3816 5.45852 25.8794V9.96881C5.45852 9.46657 5.05147 9.05957 4.54928 9.05957H0.909239C0.407005 9.05957 0 9.46657 0 9.96881V25.8794C0 26.3815 0.407005 26.7887 0.909239 26.7887Z" fill="currentColor"/><path d="M0.909239 6.26229H4.54928C5.05147 6.26229 5.45852 5.85523 5.45852 5.35305V2.12066C5.45852 1.61848 5.05147 1.21143 4.54928 1.21143H0.909239C0.407005 1.21143 0 1.61848 0 2.12066V5.35305C0 5.85523 0.407005 6.26229 0.909239 6.26229Z" fill="currentColor"/><path d="M26.6304 10.905C26.1189 10.2317 25.3647 9.67797 24.3674 9.24396C23.3701 8.81026 22.2693 8.59326 21.0649 8.59326C18.6199 8.59326 16.5482 9.52636 14.8497 11.3929C14.5118 11.7643 14.266 11.6831 14.266 11.1809V9.96877C14.266 9.46654 13.8589 9.05953 13.3567 9.05953H10.1052C9.60293 9.05953 9.19592 9.46654 9.19592 9.96877V25.8793C9.19592 26.3815 9.60298 26.7886 10.1052 26.7886H13.7452C14.2474 26.7886 14.6544 26.3815 14.6544 25.8793V20.346C14.6544 18.0409 14.7936 16.4608 15.072 15.6062C15.3503 14.7515 15.8653 14.0652 16.6164 13.5471C17.3676 13.0291 18.2157 12.7699 19.1612 12.7699C19.8994 12.7699 20.5308 12.9513 21.0553 13.314C21.5799 13.6767 21.9587 14.1848 22.1918 14.8389C22.425 15.4929 22.5415 16.9336 22.5415 19.1612V25.8793C22.5415 26.3815 22.9485 26.7886 23.4507 26.7886H27.0908C27.5929 26.7886 27.9999 26.3815 27.9999 25.8793V16.8689C27.9999 15.276 27.8995 14.0521 27.699 13.1975C27.4985 12.3428 27.1422 11.5786 26.6304 10.905Z" fill="currentColor"/></svg>';
  var CLOSE_SVG = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
    '<path d="M1 1L13 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
  '</svg>';

  var playWhoosh = AL.makeSoundPlayer('sounds/whoosh.wav', 0.20);
  var playClick = AL.makeSoundPlayer('sounds/click.mp3', 0.6);
  var playIconTap = AL.makeSoundPlayer('sounds/icon-tap.mp3', 0.6);

  function copyEmail(e) {
    e.preventDefault();
    AL.copyText(
      'ayubleon9@gmail.com',
      function () { AL.showToast('Copied to Clipboard'); },
      function () { AL.showToast("Couldn't copy — email is ayubleon9@gmail.com", { glow: false }); }
    );
  }

  function navHTML(links) {
    function cls(key) { return 'site-nav-link' + (links.active === key ? ' is-active' : ''); }
    return (
      '<nav class="site-nav-dock" aria-label="Primary">' +
        '<span class="site-nav-glow" data-nav-glow aria-hidden="true"></span>' +
        '<a class="' + cls('home') + '" href="' + links.home + '">Home</a>' +
        '<a class="' + cls('work') + '" href="' + links.work + '">Work</a>' +
        '<a class="' + cls('about') + '" href="' + links.about + '">About</a>' +
        '<span class="site-nav-divider" aria-hidden="true"></span>' +
        '<button type="button" class="site-nav-avatar-btn" data-contact-toggle aria-haspopup="dialog" aria-expanded="false" aria-label="Contact Ayub Leon">' +
          '<span class="site-nav-tooltip" aria-hidden="true">Contact me</span>' +
          '<img class="site-nav-avatar" src="images/ayub-avatar.svg" alt="">' +
        '</button>' +
      '</nav>' +
      '<div class="site-contact-backdrop" data-contact-backdrop aria-hidden="true"></div>' +
      '<div class="site-contact-card" data-contact-card role="dialog" aria-modal="false" aria-label="Contact Ayub Leon">' +
        '<button type="button" class="site-contact-close" data-contact-close aria-label="Close">' + CLOSE_SVG + '</button>' +
        '<div class="site-contact-header">' +
          '<button type="button" class="site-contact-avatar-flip" data-avatar-flip aria-label="Flip photo">' +
            '<span class="site-contact-avatar-face site-contact-avatar-face-front"><img class="site-contact-avatar" src="images/ayub-avatar.svg" alt="Ayub Leon"></span>' +
            '<span class="site-contact-avatar-face site-contact-avatar-face-back"><img class="site-contact-avatar" src="images/ayub-photo.png" alt="Ayub Leon"></span>' +
          '</button>' +
          '<div>' +
            '<p class="site-contact-name">Ayub Leon</p>' +
            '<p class="site-contact-role">Product Designer</p>' +
          '</div>' +
        '</div>' +
        '<p class="site-contact-blurb">I\'m currently open to full time roles, contract work, and high impact product builds. If you need a designer who takes ownership from first sketch to final QA, <a class="site-contact-link" href="mailto:ayubleon9@gmail.com">let\'s talk.</a></p>' +
        '<div class="site-contact-actions">' +
          '<a class="site-contact-action" href="mailto:ayubleon9@gmail.com" data-contact-copy-email>' + MAIL_SVG + '<span>Email</span></a>' +
          '<a class="site-contact-action" href="Ayub%20Leon%20-%20Resume.pdf" target="_blank" rel="noopener noreferrer">' + RESUME_SVG + '<span>Resume</span></a>' +
          '<a class="site-contact-action" href="https://www.linkedin.com/in/ayubleon" target="_blank" rel="noopener noreferrer">' + LINKEDIN_SVG + '<span>Linked in</span></a>' +
        '</div>' +
      '</div>'
    );
  }

  function initContactCard(el) {
    var toggleBtn = el.querySelector('[data-contact-toggle]');
    var card = el.querySelector('[data-contact-card]');
    var backdrop = el.querySelector('[data-contact-backdrop]');
    var closeBtn = el.querySelector('[data-contact-close]');
    if (!toggleBtn || !card) return;

    // the transform transition is always active on this element, so simply
    // writing the avatar-position "closed" transform would itself animate
    // smoothly from wherever the card last rested — leaving almost nothing
    // for the actual open transition to travel. Disable the transition for
    // that one instant jump, force it to commit, then re-enable before
    // setting the open target so only that move is animated.
    var OPEN_TRANSFORM = 'translate(-50%,-50%) rotate(2deg) scale(1)';
    var closedTransformFromAvatar = function () {
      var r = toggleBtn.getBoundingClientRect();
      var ox = (r.left + r.width / 2) - window.innerWidth / 2;
      var oy = (r.top + r.height / 2) - window.innerHeight / 2;
      return 'translate(-50%,-50%) translate(' + ox + 'px,' + oy + 'px) rotate(2deg) scale(0.4)';
    };

    var setOpen = function (open) {
      playWhoosh();
      if (open) {
        card.style.transition = 'none';
        card.style.transform = closedTransformFromAvatar();
        card.offsetHeight;
        card.style.transition = '';
        requestAnimationFrame(function () {
          card.style.transform = OPEN_TRANSFORM;
          card.classList.add('is-open');
        });
        if (backdrop) backdrop.classList.add('is-open');
      } else {
        // reverse the entrance: travel back toward the avatar's current
        // position (recomputed fresh in case the page scrolled/resized)
        // instead of just fading out in place
        card.style.transform = closedTransformFromAvatar();
        card.classList.remove('is-open');
        if (backdrop) backdrop.classList.remove('is-open');
      }
      toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    el.querySelectorAll('.site-nav-link').forEach(function (link) {
      link.addEventListener('click', function (e) {
        playClick();
        var href = link.getAttribute('href') || '';
        // in-page anchors (e.g. "#work") don't unload the document, so
        // there's nothing to race — only links to another page need a
        // brief hold so the click sound isn't cut off by the navigation
        if (href.charAt(0) === '#') return;
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        setTimeout(function () { window.location.href = href; }, 140);
      });
    });

    toggleBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      playClick();
      setOpen(!card.classList.contains('is-open'));
    });
    if (closeBtn) closeBtn.addEventListener('click', function () { setOpen(false); });
    if (backdrop) backdrop.addEventListener('click', function () { setOpen(false); });

    var avatarFlip = el.querySelector('[data-avatar-flip]');
    if (avatarFlip) {
      // touch devices fire a synthetic mouseenter right before click on
      // first tap, so with both handlers always active a tap added
      // is-flipped via mouseenter and then immediately removed it again
      // via click's toggle — leaving the photo needing a second tap to
      // actually flip. Splitting on real hover support avoids the two
      // handlers fighting over the same tap: hover-capable pointers get
      // the mouseenter/mouseleave behavior, everything else (touch) gets
      // a plain click toggle
      var supportsHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      avatarFlip.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!supportsHover) avatarFlip.classList.toggle('is-flipped');
      });
      if (supportsHover) {
        avatarFlip.addEventListener('mouseenter', function () {
          playIconTap();
          avatarFlip.classList.add('is-flipped');
        });
        avatarFlip.addEventListener('mouseleave', function () {
          avatarFlip.classList.remove('is-flipped');
        });
      }
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });

    var emailLink = el.querySelector('[data-contact-copy-email]');
    if (emailLink) emailLink.addEventListener('click', copyEmail);
  }

  function initNavGlow(el) {
    var dock = el.querySelector('.site-nav-dock');
    var glow = el.querySelector('[data-nav-glow]');
    if (!dock || !glow) return;
    dock.addEventListener('mousemove', function (e) {
      var rect = dock.getBoundingClientRect();
      glow.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width) * 100 + '%');
      glow.style.setProperty('--my', ((e.clientY - rect.top) / rect.height) * 100 + '%');
    });
    dock.addEventListener('mouseenter', function () {
      glow.style.opacity = '1';
    });
    dock.addEventListener('mouseleave', function () {
      glow.style.opacity = '0';
    });
  }

  function fill(el) {
    if (el.childElementCount > 0) return;
    el.innerHTML = navHTML(AL.pageLinks());
    initContactCard(el);
    initNavGlow(el);
  }

  function fillAll() {
    document.querySelectorAll('[data-nav-mount]').forEach(fill);
  }

  AL.selfHeal(fillAll);
})();
