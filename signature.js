(function () {
  // only cap the boats photo's height above the site's own 700px breakpoint
  // (where .story-grid-1 switches to a single column and the side-by-side
  // row-height mismatch this fixes doesn't exist in the first place)
  var styleTag = document.createElement('style');
  styleTag.textContent = '@media (min-width:701px){.story-photo-wrap{max-height:340px;}}';
  document.head.appendChild(styleTag);

  // the About page's <main> content is rebuilt by support.js from its own
  // internal template on load, discarding any element placed there
  // directly in the static HTML (even an empty mount div, even a change to
  // an existing element's own style attribute) — but that rebuild is a
  // one-time pass, not continuous, so inserting via live DOM manipulation
  // after the fact persists fine, the same trick nav.js/footer.js use for
  // their own mount points, just targeting an existing paragraph instead
  // of a dedicated mount. support.js can rebuild in more than one wave
  // though, so keep re-placing (not just once) through the settle window
  // instead of disconnecting the moment it first succeeds — an early
  // disconnect can miss a later wave wiping the image back out.

  function place() {
    if (document.querySelector('[data-signature]')) return;
    var heading = Array.from(document.querySelectorAll('h3')).find(function (h) {
      return h.textContent.trim() === 'Thanks for Stopping By';
    });
    if (!heading) return;
    // sign off below the whole two-column row (Off the Clock + Thanks for
    // Stopping By), not just the column this heading happens to live in —
    // reads as one shared closing flourish for the story section, the way
    // a signature closes a letter, rather than an appendage to a single
    // paragraph
    var row = heading.closest('.story-grid-2') || heading.parentElement;

    // flanking fade-out lines, same gradient recipe as the "I am Ayub Leon"
    // byline on the homepage hero, just stretched to fill the row instead
    // of sitting as a short fixed-width tick
    var wrap = document.createElement('div');
    wrap.setAttribute('data-signature', '1');
    wrap.style.cssText = 'display:flex;align-items:center;gap:28px;margin:84px 0 0;';

    var lineLeft = document.createElement('span');
    lineLeft.style.cssText = 'flex:1 1 auto;height:1px;background:linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.45) 100%);';

    var img = document.createElement('img');
    img.src = 'images/signature.svg';
    img.alt = 'Ayub Leon signature';
    img.style.cssText = 'display:block;flex:0 0 auto;width:122px;height:42px;';

    var lineRight = document.createElement('span');
    lineRight.style.cssText = 'flex:1 1 auto;height:1px;background:linear-gradient(270deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.45) 100%);';

    wrap.appendChild(lineLeft);
    wrap.appendChild(img);
    wrap.appendChild(lineRight);
    row.insertAdjacentElement('afterend', wrap);
  }

  // same template-lock, same fix — "People I've built with" ships with the
  // page's serif heading font; match it to the footer's PAGES/CONTACTS/
  // RESOURCES eyebrow-label style instead
  function fixFriendsHeading() {
    var heading = Array.from(document.querySelectorAll('p')).find(function (p) {
      return p.textContent.trim() === "People I've built with";
    });
    if (!heading) return;
    heading.style.fontFamily = 'Poppins, Helvetica, sans-serif';
    heading.style.fontSize = '11px';
    heading.style.letterSpacing = '0.18em';
    heading.style.color = 'var(--al-section-title,rgba(239,232,229,0.66))';
    heading.style.textTransform = 'uppercase';
  }

  function patch() {
    place();
    fixFriendsHeading();
  }

  AL.selfHeal(patch, 5000);
})();
