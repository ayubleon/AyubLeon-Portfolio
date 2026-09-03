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
    // sign off below the whole two-column closing row, not inside either
    // column — it reads as one shared flourish for the story section, the
    // way a signature closes a letter, rather than an appendage to a single
    // paragraph. Matched on the row's own class rather than by finding a
    // heading by its exact text: that text is copy, and renaming the
    // heading (it was "Thanks for Stopping By") silently dropped the
    // signature from the page with nothing to indicate why
    var row = document.querySelector('.story-grid-2');
    if (!row) return;

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
  // page's serif heading font; give it the site's shared .al-eyebrow label
  // style (defined in shared.js) instead
  function fixFriendsHeading() {
    // p, h1-h6: this label is an <h2> now, but the selector stays broad so
    // it keeps matching if the tag changes again — losing it silently
    // leaves the label at its inline clamp() size instead of the eyebrow
    var heading = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6')).find(function (p) {
      return p.textContent.trim() === "People I've built with";
    });
    if (!heading) return;
    // the class carries the type; the template's own inline styles would
    // otherwise outrank it, so drop exactly the properties it defines
    heading.classList.add('al-eyebrow');
    ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'text-transform', 'color']
      .forEach(function (property) { heading.style.removeProperty(property); });
  }

  function patch() {
    place();
    fixFriendsHeading();
  }

  AL.selfHeal(patch, 5000);
})();
