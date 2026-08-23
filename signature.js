(function () {
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
    var target = Array.from(document.querySelectorAll('p')).find(function (p) {
      return p.textContent.trim() === 'Thanks for stopping by!';
    });
    if (!target) return;
    var img = document.createElement('img');
    img.src = 'images/signature.svg';
    img.alt = 'Ayub Leon signature';
    img.setAttribute('data-signature', '1');
    img.style.cssText = 'display:block;margin-top:20px;width:122px;height:42px;';
    target.insertAdjacentElement('afterend', img);
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
    heading.style.color = 'rgba(239,232,229,0.45)';
    heading.style.textTransform = 'uppercase';
  }

  function patch() {
    place();
    fixFriendsHeading();
  }

  patch();

  var observer = new MutationObserver(patch);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('load', function () {
    patch();
    setTimeout(function () { observer.disconnect(); }, 5000);
  });
})();
