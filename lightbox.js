(function () {
  var CSS = [
    // desktop/tablet only — openGalleryFor() itself re-checks the same
    // 700px cutoff at click time before ever opening, so a touch device
    // tapping one of these (which still fires a click event) is a no-op
    // there too; this cursor is just the visual hint for the pointer that
    // can actually hover it
    "[data-lightbox]{cursor:zoom-in;}",
    ".al-lightbox{position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center;padding:40px;opacity:0;pointer-events:none;transition:opacity .3s ease;}",
    // the image is centered in whatever space this padding leaves, so
    // reserving extra room at the bottom (rather than just relying on the
    // image's own max-height below) is what actually guarantees a real,
    // comfortable gap above the now fixed-position filmstrip row instead
    // of the two only sometimes ending up close together depending on the
    // current image's own height. 128px = the filmstrip row's own ~56px
    // height, plus the 40px it sits above the viewport's bottom edge,
    // plus a further 32px of breathing room above that
    ".al-lightbox.has-filmstrip{padding-bottom:128px;}",
    ".al-lightbox.is-open{opacity:1;pointer-events:auto;}",
    // split into a plain color tint (this) and a separate blur-only layer
    // below (.al-lightbox-blur) rather than one element doing both —
    // blurring the entire page behind this popup is genuinely expensive
    // to compute the first time it's asked for, on the order of several
    // hundred ms on a busy page like this one, and no amount of pre-
    // warming (building the overlay early, will-change) closes that gap
    // — it's real compute cost, not just a timing/ordering issue. Once
    // that's accepted as a real delay rather than a bug to eliminate, the
    // fix is to make the delayed arrival itself look deliberate: this
    // tint fades in immediately and cheaply, while the blur layer (below)
    // fades in on its own slower schedule whenever it actually finishes,
    // so it reads as a graceful reveal arriving on its own beat rather
    // than a broken, sudden pop the moment the browser gets to it
    ".al-lightbox-backdrop{position:absolute;inset:0;background:rgba(10,6,6,0.55);opacity:0;transition:opacity .3s ease;}",
    ".al-lightbox.is-open .al-lightbox-backdrop{opacity:1;}",
    // the delay is the important part here, not the duration — opacity
    // starting to rise before the blur itself has actually finished
    // computing exposes a brief flash of the plain, unblurred backdrop at
    // low opacity, then it "resolves" once the real blur catches up. This
    // holds the reveal at 0 opacity (invisible either way, so nothing to
    // see) for a beat first, giving the blur a hidden head start to
    // finish computing before it's ever asked to actually show anything
    ".al-lightbox-blur{position:absolute;inset:0;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);opacity:0;pointer-events:none;transition:opacity .5s ease-out .2s;}",
    ".al-lightbox.is-open .al-lightbox-blur{opacity:1;}",
    // a row rather than a column — when the navigator is showing (see
    // below), it's a flex sibling of the imgwrap right here, so centering
    // this row centers the image+navigator pair as a single unit. A
    // version that instead computed the navigator's own fixed screen
    // position from the image's box left the pair off-center as a whole
    // (the image landed dead-center same as always, but the navigator
    // then had to extend further right of that, with nothing making room
    // for it — it just ran past the image's own share of screen width,
    // reading as the whole thing pushed off toward the right edge).
    // Letting flexbox center them together, with the image's own zoomed
    // width shrunk to leave the navigator real room (see .is-zoomed
    // below), is what actually keeps the pair centered as a whole
    ".al-lightbox-stage{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;gap:20px;max-width:min(88vw,1400px);}",
    // overflow:hidden is load-bearing once zoom is in play — the plain,
    // unzoomed image never exceeds this box (it's already sized to fit
    // via max-width/max-height + object-fit:contain), but a zoomed image
    // is deliberately scaled past it, and without this the scaled content
    // just renders past the wrap's own edges in every direction instead
    // of being cropped to the reserved viewing area it's meant to stay
    // inside — which is exactly what "not cropped, spilling past the
    // screen's own top/bottom" looks like
    // the transform transition here is only ever used for the enterZoom
    // FLIP entrance (see its comment) — the wrap's width/height jump to
    // their zoomed values instantly (never transitioned) so the pan/zoom
    // math always measures true final geometry, and a transform on top
    // fakes the resize as a smooth animation instead: enterZoom snaps the
    // wrap to its real final size, then visually re-poses it back to its
    // pre-zoom size/position with an inverse transform and immediately
    // releases it, so this transition eases it back to identity — a
    // compositor-only resize animation with no per-frame layout reflow
    // column, not row — a no-op for every ordinary image (still one
    // centered child either way), but it's what lets the zoom hint below
    // sit as a real row above the image instead of overlaid on top of it.
    // display:none on the hint for non-zoomable images means it takes no
    // part in this layout at all, so this costs nothing there
    ".al-lightbox-imgwrap{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;max-width:100%;overflow:hidden;transition:transform 420ms cubic-bezier(.22,1,.36,1);}",
    ".al-lightbox-img{max-width:min(88vw,1400px);max-height:88vh;width:auto;height:auto;display:block;object-fit:contain;border-radius:12px;box-shadow:0 40px 100px -30px rgba(0,0,0,0.7);transform:scale(0.96);transition:transform 420ms cubic-bezier(.22,1,.36,1);}",
    // matches the padding-bottom override above exactly (100vh minus the
    // 40px top padding minus the 128px bottom padding) rather than the
    // rougher 88vh-based guess this used before that decoupling the
    // filmstrip from the image's own layout made inexact — without this,
    // an image tall enough to want the full 88vh could still overflow
    // into the padding this reserves for the filmstrip
    ".al-lightbox.has-filmstrip .al-lightbox-img{max-height:calc(100vh - 168px);}",
    // shrinks the image just enough to leave room for the zoom hint's own
    // row above it (its height plus the gap above) — scoped to zoomable
    // images only, since a non-zoomable image never renders the hint and
    // has nothing to make room for
    ".al-lightbox-imgwrap.is-zoomable .al-lightbox-img{max-height:calc(88vh - 44px);}",
    ".al-lightbox.has-filmstrip .al-lightbox-imgwrap.is-zoomable .al-lightbox-img{max-height:calc(100vh - 168px - 44px);}",
    ".al-lightbox.is-open .al-lightbox-img{transform:scale(1);}",
    // pinned to a fixed spot on screen rather than flowing directly under
    // the image inside the stage — different images in the same gallery
    // vary in height, and stacking the strip right after the image meant
    // the whole row (prev/next buttons included) shifted up or down every
    // time the image changed, forcing the cursor to chase the next button
    // to a new position on every click. Anchored to the overlay itself
    // (position:fixed, covers the whole viewport) rather than the stage,
    // so this stays exactly where it is no matter what the image does.
    // Only rendered/shown when a case study has more than one lightbox
    // image on the page (see renderFilmstrip) — a single-image gallery
    // never gets an empty row of controls taking up space at the bottom
    // width left to shrink-wrap its own content (prev button + thumbnails
    // + next button) rather than stretching to max-width — a `width:100%`
    // here let the filmstrip's own flex:1 (below) expand to fill all that
    // extra space, dragging the next button out to the row's far right
    // edge instead of sitting right next to the last thumbnail
    ".al-lightbox-filmstrip-row{display:none;position:absolute;left:50%;bottom:40px;transform:translateX(-50%);z-index:2;align-items:center;gap:10px;max-width:min(88vw,1400px);}",
    ".al-lightbox.has-filmstrip .al-lightbox-filmstrip-row{display:flex;}",
    // min-width:0 is load-bearing here — without it a flex child with
    // overflow-x:auto refuses to shrink below its content width, which
    // would push the prev/next buttons off the edge of the stage instead
    // of letting the strip itself scroll
    ".al-lightbox-filmstrip{flex:1 1 auto;min-width:0;display:flex;gap:10px;overflow-x:auto;padding:4px;}",
    ".al-lightbox-thumb{flex:0 0 auto;width:64px;height:48px;padding:0;border-radius:6px;border:2px solid transparent;background:none;overflow:hidden;cursor:pointer;opacity:.5;transition:opacity .2s ease,border-color .2s ease;}",
    ".al-lightbox-thumb img{width:100%;height:100%;object-fit:cover;display:block;}",
    ".al-lightbox-thumb:hover{opacity:.8;}",
    // active/focus share the same border color rather than each inventing
    // its own — matches this control's own close-button rule of reusing
    // an existing token instead of a new one
    ".al-lightbox-thumb.is-active{opacity:1;border-color:rgba(255,255,255,0.7);}",
    ".al-lightbox-thumb:focus-visible{outline:none;border-color:rgba(255,255,255,0.7);}",
    // same frosted-glass treatment as the close button below, just smaller
    // — a matching pair of controls either side of the strip rather than a
    // new visual language just for these two
    ".al-lightbox-filmstrip-nav{flex:0 0 auto;width:32px;height:32px;border-radius:50%;border:1px solid var(--al-border,rgba(255,255,255,0.13));background:rgba(255,255,255,0.1);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);color:#f4eeeb;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .25s ease;}",
    ".al-lightbox-filmstrip-nav:hover{background:rgba(255,255,255,0.2);}",
    ".al-lightbox-filmstrip-nav:focus-visible{outline:none;border-color:rgba(255,255,255,0.7);}",
    // frosted glass, not the site's usual solid-fill close buttons — the
    // backdrop behind it is already the darkest, busiest part of the page,
    // so a solid button would just read as another opaque block on top of
    // it; the blur lets it sit as a control floating over the image itself.
    // Border matches the nav dock's own (.site-nav-dock in nav.js) —
    // var(--al-border) with the identical fallback — rather than a new
    // color invented just for this button
    // appearance:none is load-bearing — without it some browsers render
    // this as a native OS button (their own ~4px corner radius and
    // padding baked in), which silently overrides the 50% radius below
    // and paints as a rounded square instead of a circle
    ".al-lightbox-close{appearance:none;-webkit-appearance:none;padding:0;position:fixed;top:24px;right:24px;z-index:2;width:44px;height:44px;border-radius:50%;border:1px solid var(--al-border,rgba(255,255,255,0.13));background:rgba(255,255,255,0.1);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);color:#f4eeeb;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .25s ease,transform .3s cubic-bezier(.22,1,.36,1);}",
    ".al-lightbox-close:hover{background:rgba(255,255,255,0.2);}",
    // outline:none only, no added ring color of its own — the button's
    // always-visible border above is treated as enough of a focus
    // indicator here, rather than inventing a separate highlight color
    // border-radius restated here, not just on the base rule above — this
    // button is focused programmatically the instant the popup opens
    // (see openGalleryFor), so it's always in :focus-visible, and the
    // site's global `button:focus-visible{border-radius:4px}` outranks
    // the base .al-lightbox-close rule on pure specificity (a type
    // selector plus the same pseudo-class beats a plain class), squaring
    // off this button's corners the moment it's focused unless repeated
    // here at equal footing
    ".al-lightbox-close:focus-visible{outline:none;border-radius:50%;}",
    ".al-lightbox-close-stroke{transform-origin:7px 7px;transition:transform .3s cubic-bezier(.22,1,.36,1);}",
    ".al-lightbox-close:hover .al-lightbox-close-stroke:first-child{transform:rotate(90deg);}",
    ".al-lightbox-close:hover .al-lightbox-close-stroke:last-child{transform:rotate(-90deg);}",
    "@media (max-width:700px){.al-lightbox{display:none;}}",
    // zoom, scoped per-image via data-lightbox-zoom (see gallery's own
    // `zoomable` flag in openGalleryFor) — most gallery images just open
    // at fit-to-screen size, but a couple of dense dashboard screenshots
    // also support clicking to zoom to full resolution and panning
    // through them. Zoomed gets its own, more generous margins than plain
    // browsing does (see enterZoom/exitZoom toggling is-zoom-active) — a
    // real comfortable gap above the filmstrip and below the viewport's
    // top edge, not just enough to avoid the two ever touching
    ".al-lightbox.is-zoom-active{padding-top:64px;}",
    ".al-lightbox.is-zoom-active.has-filmstrip{padding-bottom:160px;}",
    ".al-lightbox.is-zoom-active .al-lightbox-stage{gap:40px;}",
    // the wrap claims the full width that leaves (minus room for the
    // navigator beside it, 182px — its own 140px image, ~2px border, and
    // the stage's 40px gap above, rounded up) rather than staying pinned
    // to whatever footprint the image happened to render at pre-zoom —
    // enterZoom's own comment covers why. Height matches the padding
    // above exactly: 100vh minus the 64px top and 160px bottom margins
    ".al-lightbox-imgwrap.is-zoomable{cursor:zoom-in;}",
    // a row in the imgwrap's own column flow now (see .al-lightbox-imgwrap
    // above), not an overlay pinned to the image's corner — flex-shrink:0
    // keeps it at its natural size rather than being squeezed by the
    // column's own height constraints
    ".al-lightbox-zoom-hint{display:none;flex-shrink:0;align-items:center;gap:6px;background:#0A84FF;color:#fff;font-family:'Schibsted Grotesk',Helvetica,sans-serif;font-size:0.75rem;font-weight:500;padding:6px 12px 6px 10px;border-radius:999px;box-shadow:0 10px 22px -10px rgba(10,132,255,0.6);pointer-events:none;}",
    ".al-lightbox-zoom-hint svg{width:13px;height:13px;flex-shrink:0;}",
    // shown for the whole time the image sits zoomable (not on hover
    // only) since hover discovery isn't guaranteed, and a visitor
    // scanning the popup should see this without probing for it
    ".al-lightbox-imgwrap.is-zoomable .al-lightbox-zoom-hint{display:flex;}",
    ".al-lightbox-imgwrap.is-zoomed .al-lightbox-zoom-hint{display:none;}",
    // flush to the top-left corner rather than the base rule's centering
    // — enterZoom's whole translateY/scale math assumes the image's own
    // un-transformed top-left sits exactly at the wrap's own (0,0).
    // Centered (the default), a narrower-than-wrap image starts partway
    // in from the left; scaling it up from THAT position pushed its right
    // edge out past the wrap's own right edge by the same amount the left
    // side was originally inset — overflow:hidden then clipped that
    // overflow, cropping the image's right side rather than showing it
    // in full
    ".al-lightbox-imgwrap.is-zoomed{cursor:grab;width:calc(min(88vw,1400px) - 182px);height:calc(100vh - 224px);justify-content:flex-start;align-items:flex-start;}",
    ".al-lightbox-imgwrap.is-panning{cursor:grabbing;}",
    ".al-lightbox-imgwrap.is-panning .al-lightbox-img{transition:none;}",
    // square corners while zoomed — the rounding reads as an odd inset
    // frame once the image is filling the reserved viewing area edge to
    // edge rather than sitting smaller within visible page padding
    ".al-lightbox-imgwrap.is-zoomed .al-lightbox-img{border-radius:0;}",
    // a flex sibling of the imgwrap in the stage (see the stage comment
    // above) rather than independently positioned — display:none when
    // not showing so it takes up no row space at all the rest of the
    // time, which matters even for non-zoomable images sharing this same
    // stage: if this took up space whether visible or not, every image's
    // own centering would shift to make room for an invisible navigator
    // it'll never actually use
    // opacity/transform live on the base rule (not gated behind
    // .is-visible) so enter can commit display:block on its own frame
    // first, then trigger this transition on a separate frame after —
    // toggling display and opacity in the very same class application
    // gives the browser no prior rendered frame to transition from, so
    // it would otherwise just pop straight to the end state (see the
    // two-step is-visible/is-revealed toggle in enterZoom)
    // overflow isn't hidden here (the nav image gets its own border-radius
    // below instead) so the drag-hint arrow can sit just outside the
    // panel's own right edge without being clipped
    ".al-lightbox-navigator{display:none;position:relative;z-index:2;border-radius:10px;box-shadow:0 16px 34px -16px rgba(0,0,0,0.7);border:1px solid var(--al-border,rgba(255,255,255,0.13));background:var(--al-card,#1C1C1E);opacity:0;transform:translateX(14px);transition:opacity 420ms cubic-bezier(.22,1,.36,1),transform 420ms cubic-bezier(.22,1,.36,1);}",
    ".al-lightbox-navigator.is-visible{display:block;}",
    ".al-lightbox-navigator.is-revealed{opacity:1;transform:translateX(0);}",
    ".al-lightbox-navigator img{display:block;width:140px;height:auto;border-radius:10px;user-select:none;-webkit-user-drag:none;}",
    // full width always, no horizontal drag — see updateNavBox. Left/right
    // arrow keys stay reserved for stepping between images (step()); up/
    // down move this box instead, which only ever needs to move
    // vertically since it always spans the navigator's own full width
    ".al-lightbox-navbox{position:absolute;left:0;width:100%;border:2px solid #ffd60a;background:rgba(255,214,10,0.14);cursor:grab;box-sizing:border-box;}",
    ".al-lightbox-navbox.is-dragging{cursor:grabbing;}",
    // sits just outside the navigator panel rather than on top of the
    // thumbnail — overlapping the little image would compete with the
    // yellow box it's trying to explain, right where a visitor is meant
    // to look
    ".al-lightbox-navigator-hint{position:absolute;top:50%;right:-34px;transform:translateY(-50%);z-index:1;display:flex;align-items:center;justify-content:center;width:22px;height:44px;border-radius:999px;background:#0A84FF;color:#fff;pointer-events:none;}",
    ".al-lightbox-navigator-hint svg{width:14px;height:14px;}",
    // acts like a toast morphing out of the popup's own close button
    // rather than a bar laid over the image — it never actually travels
    // down to the image at all (an earlier version did, and sliding a
    // shape diagonally down across the photo on the way there just looked
    // like it was dragging over the content). Anchored via `right`/`top`
    // rather than `left` so it can grow leftward, out from under the
    // button, while that anchor edge itself never moves — the button
    // stays exactly where it is the whole time, this just reveals and
    // retracts from it.
    //
    // Its real width is measured once (see maybeScheduleHint) and never
    // changes again — the grow/shrink is done entirely with clip-path,
    // not by animating width itself. width (and padding, which used to
    // animate alongside it) are layout properties: changing either forces
    // the browser to recompute the page's layout on every single frame,
    // which is exactly what was reading as jagged rather than smooth.
    // clip-path only affects what's painted, never triggers layout, so
    // the same reveal reads as genuinely smooth.
    //
    // clip-path itself isn't left to a CSS transition here — animateHintShape
    // below drives it frame-by-frame instead, because the corner rounding
    // needs to shrink in direct proportion to how much is revealed at
    // every instant (round = revealed-width/2, easing toward 0 as it
    // finishes) rather than as a separate step once the reveal is done.
    // Two independent CSS transitions (reveal, then a delayed border-radius)
    // read as two separate motions glued together; a single JS-driven
    // value where the corner IS a function of the current reveal width
    // is what actually reads as one continuous, unforced-looking motion
    ".al-lightbox-hint{box-sizing:border-box;position:fixed;z-index:250;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 10px 10px 16px;background:#0A84FF;color:#fff;font-family:'Schibsted Grotesk',Helvetica,sans-serif;font-size: 0.8125rem;letter-spacing:-0.005em;box-shadow:0 16px 34px -16px rgba(0,0,0,0.4);opacity:0;pointer-events:none;transition:opacity .3s ease;}",
    ".al-lightbox-hint.is-visible{opacity:1;pointer-events:auto;}",
    ".al-lightbox-hint-text{white-space:nowrap;}",
    ".al-lightbox-hint-text,.al-lightbox-hint-close{transition:opacity .16s ease;}",
    // a manual close rather than relying only on the timeout/scroll/click
    // dismissal in maybeScheduleHint — that auto-dismiss is a judgment
    // call about when the visitor's likely done reading it, and this is
    // the guaranteed way out if that judgment call is wrong for them
    ".al-lightbox-hint-close{flex:0 0 auto;width:22px;height:22px;border:0;border-radius:50%;background:rgba(255,255,255,0.14);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .2s ease;}",
    ".al-lightbox-hint-close:hover{background:rgba(255,255,255,0.26);}",
    ".al-lightbox-hint-close:focus-visible{outline:none;box-shadow:0 0 0 2px rgba(255,255,255,0.5);}"
  ].join('');
  var styleTag = document.createElement('style');
  styleTag.textContent = CSS;
  document.head.appendChild(styleTag);

  var HINT_CLOSE_SVG = '<svg width="10" height="10" viewBox="0 0 14 14" fill="none">' +
    '<path d="M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
    '<path d="M1 1L13 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
  '</svg>';

  var CLOSE_SVG = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none">' +
    '<path class="al-lightbox-close-stroke" d="M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
    '<path class="al-lightbox-close-stroke" d="M1 1L13 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
  '</svg>';

  var PREV_SVG = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none">' +
    '<path d="M9 3L5 7L9 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>';
  var NEXT_SVG = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none">' +
    '<path d="M5 3L9 7L5 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>';

  var MOBILE_MAX_WIDTH = 700;
  // matches .al-lightbox's own opacity transition (.3s) plus a small
  // buffer — see close()
  var CLOSE_FADE_MS = 340;

  var overlay = null;
  var imgEl = null;
  var imgWrapEl = null;
  var filmstripEl = null;
  var closeBtn = null;
  var backdrop = null;
  var navigatorEl = null;
  var navImgEl = null;
  var navBoxEl = null;
  var gallery = [];
  var currentIndex = 0;
  var lastFocused = null;

  // zoom state — always reset by exitZoom whenever the gallery moves to a
  // different image (see show()), so none of this persists across images
  var zoomActive = false;
  var zoomRatio = 1;
  var panY = 0;
  var zoomImgRect = null;
  var zoomWrapRect = null;
  var zoomDragging = false;

  function close() {
    // exitZoom is normally instant everywhere else it's called (see its
    // own comment) — deliberate, since navigating away should always
    // reset without lingering motion. Closing is the one exception: if
    // the image is zoomed in when this fires, resetting first would snap
    // the whole layout back to its small, un-zoomed size right before the
    // fade even starts, so the visitor would see an abrupt jump followed
    // by a fade rather than one clean motion. Deferring the reset until
    // after the fade finishes instead lets whatever's currently on
    // screen — zoomed or not — fade out exactly as it looks
    var wasZoomed = zoomActive;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocused && lastFocused.focus) lastFocused.focus();
    if (wasZoomed) {
      setTimeout(exitZoom, CLOSE_FADE_MS);
    } else {
      exitZoom();
    }
  }

  function clampZoomPan() {
    var scaledH = zoomImgRect.height * zoomRatio;
    var minY = Math.min(0, zoomWrapRect.height - scaledH);
    panY = Math.max(minY, Math.min(0, panY));
  }

  // the yellow box only ever needs a vertical position/height — it always
  // spans the navigator's full width by design (see the CSS), since
  // zoomRatio itself is chosen so the image's scaled width exactly fills
  // the wrap with nothing left over on either side (see enterZoom)
  function updateNavBox() {
    if (!zoomActive) return;
    var scaledH = zoomImgRect.height * zoomRatio;
    var visFracY = zoomWrapRect.height / scaledH;
    var offsetFracY = -panY / scaledH;
    var navH = navImgEl.getBoundingClientRect().height;
    navBoxEl.style.top = (offsetFracY * navH) + 'px';
    navBoxEl.style.height = (visFracY * navH) + 'px';
  }

  function applyZoomTransform() {
    imgEl.style.transform = 'translateY(' + panY + 'px) scale(' + zoomRatio + ')';
    updateNavBox();
  }

  // a single discrete step, e.g. from an arrow key — reuses is-panning's
  // transition:none (see the CSS and the navBoxEl drag handler) for the
  // same reason a drag needs it: without it, this step would animate over
  // the image's own open/close pop-in transition instead of moving
  // instantly, reading as a sluggish delay rather than a direct nudge.
  // Removed on the next frame rather than the same tick, since a class
  // removed before the browser has actually resolved styles with it
  // applied doesn't reliably suppress the transition
  function panZoomBy(deltaY) {
    imgWrapEl.classList.add('is-panning');
    panY += deltaY;
    clampZoomPan();
    applyZoomTransform();
    requestAnimationFrame(function () { imgWrapEl.classList.remove('is-panning'); });
  }

  function enterZoom() {
    // captured before any zoom class goes on — this is the wrap's plain,
    // centered, pre-zoom box, used below as the FLIP entrance's start
    // point (see the comment further down)
    var startRect = imgWrapEl.getBoundingClientRect();

    // adds the zoomed view's own more generous margins (see the CSS
    // comment on .is-zoom-active) and switches the wrap to flush
    // top-left alignment (see .is-zoomed) before anything is measured —
    // both the image's on-screen position and the wrap's own size change
    // once these go on, so measuring either before this point would
    // capture stale, pre-zoom geometry
    overlay.classList.add('is-zoom-active');
    imgWrapEl.classList.add('is-zoomed');
    void imgWrapEl.offsetWidth; // commit the changes above before measuring them next
    zoomImgRect = imgEl.getBoundingClientRect();
    zoomWrapRect = imgWrapEl.getBoundingClientRect();

    // FLIP entrance: the wrap is already at its true final (zoomed) size
    // at this point — width/height themselves are never transitioned, so
    // the pan/zoom math above always measures real, settled geometry
    // instead of a value mid-animation. To still make the resize itself
    // look smooth, re-pose the wrap back to look like its pre-zoom
    // startRect with an inverse transform (instant, no transition), then
    // clear that transform on the very next frame so the CSS transition
    // on .al-lightbox-imgwrap eases it back to identity — a cheap,
    // compositor-only animation standing in for animating width/height
    // directly, which would force a layout reflow on every frame
    var scaleX = startRect.width / zoomWrapRect.width;
    var scaleY = startRect.height / zoomWrapRect.height;
    var dx = startRect.left - zoomWrapRect.left;
    var dy = startRect.top - zoomWrapRect.top;
    imgWrapEl.style.transition = 'none';
    imgWrapEl.style.transformOrigin = '0 0';
    imgWrapEl.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + scaleX + ',' + scaleY + ')';
    void imgWrapEl.offsetWidth;
    imgWrapEl.style.transition = '';
    imgWrapEl.style.transform = '';
    // fit-width, not native resolution — scales the image up just enough
    // to exactly fill the zoomed wrap's own width, with nothing left over
    // on either side. That's what guarantees the box on the navigator
    // always spans edge to edge and moving through the image is a purely
    // vertical motion, leaving the left/right arrow keys free to mean
    // "next/previous image" instead of horizontal pan
    zoomRatio = Math.max(1, zoomWrapRect.width / zoomImgRect.width);
    // always starts at the very top of the image, regardless of where it
    // was clicked to get here — a version that instead centered the zoom
    // on the click point could look like it was "remembering" a previous
    // scroll position whenever a click happened to land in a similar
    // spot, when it was really just coincidence. Always landing at the
    // top makes every zoom-in predictable: it never depends on anything
    // from a previous visit to this image, panned or not
    panY = 0;
    zoomActive = true;
    clampZoomPan();
    imgEl.style.transformOrigin = '0 0';
    navImgEl.src = imgEl.src;
    // two-step reveal — see the CSS comment on .al-lightbox-navigator for
    // why this can't just be one class toggling display and opacity
    // together
    navigatorEl.classList.add('is-visible');
    void navigatorEl.offsetWidth;
    navigatorEl.classList.add('is-revealed');
    applyZoomTransform();
  }

  function exitZoom() {
    if (!zoomActive) return;
    zoomActive = false;
    panY = 0;
    overlay.classList.remove('is-zoom-active');
    imgWrapEl.classList.remove('is-zoomed', 'is-panning');
    navigatorEl.classList.remove('is-visible', 'is-revealed');
    imgEl.style.transform = '';
    imgEl.style.transformOrigin = '';
  }

  function show(index) {
    exitZoom();
    currentIndex = index;
    var item = gallery[index];
    if (!item) return;
    imgEl.src = item.src;
    imgEl.alt = item.alt || '';
    imgWrapEl.classList.toggle('is-zoomable', !!item.zoomable);
    Array.prototype.forEach.call(filmstripEl.children, function (thumb, i) {
      thumb.classList.toggle('is-active', i === index);
    });
    var activeThumb = filmstripEl.children[index];
    if (activeThumb && activeThumb.scrollIntoView) {
      activeThumb.scrollIntoView({ inline: 'center', block: 'nearest' });
    }
  }

  function step(delta) {
    if (gallery.length < 2) return;
    show((currentIndex + delta + gallery.length) % gallery.length);
  }

  function renderFilmstrip() {
    filmstripEl.innerHTML = '';
    var hasFilmstrip = gallery.length > 1;
    // the row's own display (and so the prev/next buttons alongside the
    // strip) follows this same class in CSS, rather than being toggled
    // here separately — one flag, one place, for whether there's anything
    // to page through at all
    overlay.classList.toggle('has-filmstrip', hasFilmstrip);
    if (!hasFilmstrip) return;
    gallery.forEach(function (item, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'al-lightbox-thumb';
      btn.setAttribute('aria-label', 'Image ' + (i + 1) + ' of ' + gallery.length);
      btn.innerHTML = '<img src="' + item.src + '" alt="">';
      btn.addEventListener('click', function () { show(i); });
      filmstripEl.appendChild(btn);
    });
  }

  // built lazily on first open rather than at script load — most page
  // visits never open a lightbox at all
  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'al-lightbox';
    overlay.setAttribute('data-lightbox-overlay', '');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML =
      '<div class="al-lightbox-backdrop" data-lightbox-backdrop></div>' +
      '<div class="al-lightbox-blur"></div>' +
      '<div class="al-lightbox-stage">' +
        '<div class="al-lightbox-imgwrap" data-lightbox-imgwrap>' +
          '<span class="al-lightbox-zoom-hint"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>Click to zoom</span>' +
          '<img class="al-lightbox-img" data-lightbox-img decoding="async" alt="">' +
        '</div>' +
        '<div class="al-lightbox-navigator" data-lightbox-navigator>' +
          '<img data-lightbox-navimg alt="">' +
          '<div class="al-lightbox-navbox" data-lightbox-navbox></div>' +
          '<span class="al-lightbox-navigator-hint"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="4" x2="12" y2="20"></line><polyline points="8 8 12 4 16 8"></polyline><polyline points="8 16 12 20 16 16"></polyline></svg></span>' +
        '</div>' +
      '</div>' +
      '<div class="al-lightbox-filmstrip-row">' +
        '<button type="button" class="al-lightbox-filmstrip-nav" data-lightbox-prev aria-label="Previous image">' + PREV_SVG + '</button>' +
        '<div class="al-lightbox-filmstrip" data-lightbox-filmstrip></div>' +
        '<button type="button" class="al-lightbox-filmstrip-nav" data-lightbox-next aria-label="Next image">' + NEXT_SVG + '</button>' +
      '</div>' +
      '<button type="button" class="al-lightbox-close" data-lightbox-close aria-label="Close">' + CLOSE_SVG + '</button>';
    document.body.appendChild(overlay);

    backdrop = overlay.querySelector('[data-lightbox-backdrop]');
    imgEl = overlay.querySelector('[data-lightbox-img]');
    imgWrapEl = overlay.querySelector('[data-lightbox-imgwrap]');
    filmstripEl = overlay.querySelector('[data-lightbox-filmstrip]');
    closeBtn = overlay.querySelector('[data-lightbox-close]');
    navigatorEl = overlay.querySelector('[data-lightbox-navigator]');
    navImgEl = overlay.querySelector('[data-lightbox-navimg]');
    navBoxEl = overlay.querySelector('[data-lightbox-navbox]');
    var prevBtn = overlay.querySelector('[data-lightbox-prev]');
    var nextBtn = overlay.querySelector('[data-lightbox-next]');

    backdrop.addEventListener('click', close);
    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', function () { step(-1); });
    nextBtn.addEventListener('click', function () { step(1); });

    // click toggles zoom, but only for an image tagged data-lightbox-zoom
    // (see gallery's own `zoomable` flag) — everything else in the
    // gallery just opens at its regular fit-to-screen size, with no
    // click behavior of its own on the image itself
    imgWrapEl.addEventListener('click', function () {
      if (zoomDragging) return; // a real drag shouldn't also toggle zoom on release
      var item = gallery[currentIndex];
      if (!item || !item.zoomable) return;
      if (!zoomActive) enterZoom();
      else exitZoom();
    });
    imgWrapEl.addEventListener('mousedown', function (e) {
      if (!zoomActive) return;
      zoomDragging = false;
      var dragStartY = e.clientY;
      var dragStartPanY = panY;
      function onMove(e2) {
        var dy = e2.clientY - dragStartY;
        if (Math.abs(dy) > 3) { zoomDragging = true; imgWrapEl.classList.add('is-panning'); }
        panY = dragStartPanY + dy;
        clampZoomPan();
        applyZoomTransform();
      }
      function onUp() {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        imgWrapEl.classList.remove('is-panning');
        setTimeout(function () { zoomDragging = false; }, 0);
      }
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
    // dragging the yellow box pans the big view — moving the box down on
    // the thumbnail should reveal content further down in the zoomed
    // view, which means panning the actual image up, the inverse of the
    // box's own movement
    navBoxEl.addEventListener('mousedown', function (e) {
      e.stopPropagation();
      var startY = e.clientY;
      var startPanY = panY;
      var navH = navImgEl.getBoundingClientRect().height;
      var scaledH = zoomImgRect.height * zoomRatio;
      navBoxEl.classList.add('is-dragging');
      // reuses is-panning's own transition:none (see the CSS) — without
      // it, this fights the image's open/close pop-in transition on the
      // same transform property, and every drag update ends up chasing a
      // constantly-moving 350ms animation target instead of tracking the
      // cursor directly, reading as laggy and mushy rather than responsive
      imgWrapEl.classList.add('is-panning');
      function onMove(e2) {
        var dy = e2.clientY - startY;
        panY = startPanY - dy * (scaledH / navH);
        clampZoomPan();
        applyZoomTransform();
      }
      function onUp() {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        navBoxEl.classList.remove('is-dragging');
        imgWrapEl.classList.remove('is-panning');
      }
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });

    // one persistent listener rather than adding/removing per open — it's
    // a no-op whenever the overlay isn't actually open
    var ZOOM_PAN_STEP = 60;
    document.addEventListener('keydown', function (e) {
      if (!overlay.classList.contains('is-open')) return;
      if (e.key === 'Escape') { if (zoomActive) exitZoom(); else close(); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); return; }
      // reserved for moving the yellow box while zoomed, rather than the
      // page or anything else reacting to them — left/right above already
      // means "next/previous image" regardless of zoom state, so up/down
      // is what's left for panning through the currently zoomed one
      if (!zoomActive) return;
      if (e.key === 'ArrowUp') { e.preventDefault(); panZoomBy(ZOOM_PAN_STEP); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); panZoomBy(-ZOOM_PAN_STEP); return; }
    });
    // resizing down to mobile mid-view would otherwise leave the page
    // scroll-locked forever — the CSS hides the overlay itself at this
    // width already, this just releases the scroll lock along with it
    window.addEventListener('resize', function () {
      if (overlay.classList.contains('is-open') && window.innerWidth < MOBILE_MAX_WIDTH) { close(); return; }
      // zoomImgRect/zoomWrapRect were measured once, at zoom-in time —
      // a resize invalidates both, and there's nothing worth trying to
      // preserve across a resize the visitor didn't do to navigate the
      // image, so this just drops back to the plain fit-to-screen view
      // rather than panning/clamping against now-stale geometry
      exitZoom();
    });
  }

  // click-to-enlarge isn't a pattern visitors expect by default on a
  // portfolio site, so the cursor:zoom-in hover cue alone is easy to miss
  // entirely. Shown fresh on every page load that has a lightbox image
  // (not just the visitor's first ever visit) — hintDone below only stops
  // it from firing more than once per page view, e.g. after the visitor
  // has already opened the gallery or dismissed it
  //
  // First version of this used the site's shared bottom-of-screen toast —
  // technically fired correctly, but a disconnected pill next to the nav
  // dock is exactly where nobody is looking the instant a page loads, and
  // it was gone in 3.2s. A version after that anchored a bar directly over
  // the first clickable image instead, but that meant recomputing its
  // position against a moving target (the image scrolls, the popup's
  // slide-transitions resize things) and a wrong measurement there just
  // showed the bar floating over nothing in particular. This instead lives
  // as a toast morphing out of the popup's own close button — a fixed
  // point that isn't going anywhere — timed to when a lightbox image
  // actually scrolls into view, with its own close button rather than
  // relying only on the timeout/scroll/click dismissal below to clear it
  var hintTimer = null;
  var hintDone = false;
  var hintEl = null;
  var hintAnimFrame = null;
  // the anchor button's actual size at the moment the hint appeared, and
  // the bar's own full natural width (text + button + padding) measured
  // the same moment — hideHint reveals/hides between these two rather
  // than re-measuring either, since by the time it's dismissed the popup
  // could plausibly be mid slide-transition or gone altogether
  var hintCollapsedSize = 36;
  var hintFullWidth = 0;
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  // drives the whole reveal/hide as one continuous value rather than two
  // separate CSS transitions (a plain reveal, then a delayed border-radius
  // change) — those read as two glued-together motions even once each was
  // individually smooth. Here the corner radius is calculated as a direct
  // function of how much is currently revealed (roughly revealedWidth/2,
  // eased toward 0 as the motion finishes rather than lingering at a full
  // pill until the reveal is done) — since it's derived from the actual
  // revealed width at every frame instead of animating on its own
  // schedule, it can never end up rounder than that width would allow,
  // so there's nothing to visibly snap once the true shape catches up to
  // the declared radius. `growing` true reveals collapsed->full and eases
  // the roundness out from full to 0; false runs the same motion in
  // reverse for hideHint
  function animateHintShape(el, growing, durationMs, onDone) {
    cancelAnimationFrame(hintAnimFrame);
    var from = growing ? hintCollapsedSize : hintFullWidth;
    var to = growing ? hintFullWidth : hintCollapsedSize;
    var start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var raw = Math.min((ts - start) / durationMs, 1);
      var eased = easeOutCubic(raw);
      var revealed = from + (to - from) * eased;
      // 1 at the collapsed circle end of this motion, 0 at the full-bar
      // end, regardless of which direction is playing
      var roundness = growing ? (1 - eased) : eased;
      var hidden = Math.max(hintFullWidth - revealed, 0);
      el.style.clipPath = 'inset(0 0 0 ' + hidden + 'px round ' + (revealed / 2 * roundness) + 'px)';
      if (raw < 1) {
        hintAnimFrame = requestAnimationFrame(frame);
      } else if (onDone) {
        onDone();
      }
    }
    hintAnimFrame = requestAnimationFrame(frame);
  }
  function ensureHintEl() {
    if (hintEl) return hintEl;
    var el = document.createElement('div');
    el.className = 'al-lightbox-hint';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<span class="al-lightbox-hint-text">Click an image to view full size</span>' +
      '<button type="button" class="al-lightbox-hint-close" aria-label="Dismiss">' + HINT_CLOSE_SVG + '</button>';
    el.querySelector('.al-lightbox-hint-close').addEventListener('click', function (e) {
      e.stopPropagation();
      hideHint();
    });
    document.body.appendChild(el);
    hintEl = el;
    return el;
  }
  // dismissal — separate from stopScheduling below, which is the "don't
  // try to show this again this page view" bookkeeping and fires the
  // moment the hint is shown, not only once it's gone again. Retracts back
  // into the close button it grew out of rather than just fading out in
  // place — is-visible only comes off once that shape change has actually
  // finished, so the fade-out starts from the collapsed pill rather than
  // cutting the retraction short
  var HINT_HIDE_MS = 320;
  function hideHint() {
    if (!hintEl || !hintEl.classList.contains('is-visible') || hintEl.classList.contains('is-collapsing')) return;
    window.removeEventListener('scroll', hideHint);
    document.removeEventListener('click', hideHint, true);
    hintEl.classList.add('is-collapsing');
    hintEl.querySelector('.al-lightbox-hint-text').style.opacity = '0';
    hintEl.querySelector('.al-lightbox-hint-close').style.opacity = '0';
    animateHintShape(hintEl, false, HINT_HIDE_MS, function () {
      hintEl.classList.remove('is-visible', 'is-collapsing');
    });
  }
  function stopScheduling() {
    hintDone = true;
    clearTimeout(hintTimer);
  }
  // the fixed point this toast lives at for its whole life — the project
  // popup's own close button when one is open (getBoundingClientRect
  // gives viewport coordinates regardless of that button's own
  // position:absolute), or a fixed top-right point matching the site's
  // other floating close buttons' own convention (see .al-lightbox-close)
  // for a standalone case-study page, which has no popup close button to
  // anchor to at all
  function hintAnchorRect() {
    var closeBtn = document.querySelector('.al-pv-close');
    if (closeBtn) {
      var r = closeBtn.getBoundingClientRect();
      if (r.width > 0) return { top: r.top, right: r.right, size: r.width };
    }
    return { top: 24, right: window.innerWidth - 24, size: 44 };
  }
  // held back so it reads as a considered tip rather than firing the
  // instant an image scrolls into the DOM. Deliberately doesn't close
  // over the `img` passed in for the whole 1800ms wait — support.js's
  // React boot() can tear down and replace this entire subtree with
  // fresh nodes shortly after first parse (see its own comment in
  // support.js), which would leave a captured reference pointing at an
  // already-detached element by the time this fires. Re-querying fresh
  // at fire time sidesteps that regardless of exactly when the swap
  // happens, rather than depending on winning a timing race against it.
  // hintTimer is always reset to null before returning — a stale, still-
  // truthy hintTimer from a fire that bailed early (nothing left to show,
  // reduced motion, etc.) would otherwise block every future retry for
  // the rest of the page's life, since the guard above treats any
  // non-null hintTimer as "already scheduled".
  //
  // scopeRoot carries through the same root wireIn() was called with —
  // without it, the re-query above fell back to searching the whole
  // document, which inside the project popup could land on a
  // [data-lightbox] image belonging to a different (hidden or off-screen)
  // card instead of the one actually visible in the open popup, pointing
  // the hint at nothing the visitor could see
  // requires the image's own top edge to be on screen, not just some
  // fraction of the image somewhere — this is the "has the visitor
  // actually scrolled to it yet" signal the toast waits for, even though
  // the toast itself always appears anchored to the close button rather
  // than the image (see hintAnchorRect)
  function isInViewport(el) {
    var r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0 || r.left >= window.innerWidth || r.right <= 0) return false;
    return r.top >= 0 && r.top < window.innerHeight - 40;
  }
  // the first DOM match isn't necessarily the right one to point at — a
  // case study's first lightbox image can sit well down the page (or, in
  // the project popup, below the fold of a card that opens scrolled to
  // the top), and anchoring a hint to an image nobody can currently see
  // defeats the entire point of it. This picks the first match that's
  // actually on screen right now
  function firstVisibleLightboxImg(scopeRoot) {
    var imgs = (scopeRoot || document).querySelectorAll('[data-lightbox]');
    for (var i = 0; i < imgs.length; i++) {
      if (isInViewport(imgs[i])) return imgs[i];
    }
    return null;
  }
  // retried rather than given up on after one miss — the visitor may
  // simply not have scrolled a lightbox image into view yet 1800ms after
  // the page/popup settled. Capped so a page or popup the visitor closes
  // before ever scrolling one into view doesn't leave this polling forever
  var HINT_RETRY_MS = 600;
  var HINT_MAX_ATTEMPTS = 20;
  function maybeScheduleHint(scopeRoot) {
    if (hintDone || hintTimer) return;
    var attempts = 0;
    var fire = function () {
      var freshImg = firstVisibleLightboxImg(scopeRoot);
      attempts++;
      if (!freshImg) {
        if (attempts >= HINT_MAX_ATTEMPTS) { hintTimer = null; return; }
        hintTimer = setTimeout(fire, HINT_RETRY_MS);
        return;
      }
      hintTimer = null;
      hintDone = true;
      // freshImg only gated WHEN this fires (an image has to actually be
      // on screen) — WHERE the toast appears doesn't depend on it at all,
      // it always anchors to the close button (see hintAnchorRect)
      var el = ensureHintEl();
      var textEl = el.querySelector('.al-lightbox-hint-text');
      var closeBtn = el.querySelector('.al-lightbox-hint-close');
      var anchor = hintAnchorRect();
      hintCollapsedSize = anchor.size;
      el.style.left = 'auto';
      el.style.right = (window.innerWidth - anchor.right) + 'px';
      el.style.top = anchor.top + 'px';
      // the bar's real width is measured once here and fixed for the rest
      // of its life — width can't transition to/from "auto" anyway, and
      // more importantly this box never needs to change size again: the
      // whole reveal/hide from here on is done with clip-path (see the
      // CSS comment above and animateHintShape), which paints without
      // ever touching layout
      el.style.transition = 'none';
      el.style.clipPath = 'none';
      el.style.width = '';
      void el.offsetWidth;
      hintFullWidth = el.getBoundingClientRect().width;
      el.style.width = hintFullWidth + 'px';
      textEl.style.opacity = '0';
      closeBtn.style.opacity = '0';
      void el.offsetWidth; // commit the width/opacity above before anything transitions
      el.style.transition = '';
      el.classList.add('is-visible');
      animateHintShape(el, true, 420, function () {
        textEl.style.opacity = '';
        closeBtn.style.opacity = '';
      });
      window.addEventListener('scroll', hideHint, { passive: true, once: true });
      document.addEventListener('click', hideHint, { capture: true, once: true });
      setTimeout(hideHint, 4500);
    };
    hintTimer = setTimeout(fire, 1800);
  }

  // the gallery is whatever [data-lightbox] images share the clicked
  // image's own case study: [data-pv-inner] scopes it to one card inside
  // the sliding project popup (see project-viewer.js), so browsing one
  // project there never mixes in another card's images; plain <main>
  // scopes it the same way on a standalone case-study page
  function openGalleryFor(img) {
    // clicking an image is itself proof the visitor already found the
    // feature — cancels the hint if it hasn't fired yet, and skips it for
    // the rest of this page view either way
    stopScheduling();
    ensureOverlay();
    var scopeRoot = img.closest('[data-pv-inner]') || img.closest('main') || document;
    var imgs = Array.prototype.slice.call(scopeRoot.querySelectorAll('[data-lightbox]'));
    gallery = imgs.map(function (el) { return { src: el.currentSrc || el.src, alt: el.alt || '', zoomable: el.hasAttribute('data-lightbox-zoom') }; });
    var index = imgs.indexOf(img);
    lastFocused = img;
    renderFilmstrip();
    show(index === -1 ? 0 : index);
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    // is-open held back two frames (one to let the browser paint the
    // overlay as it stands right now, still hidden; one more before this
    // actually reveals it) gives the blur layer a small head start on
    // existing before it's asked to render — see .al-lightbox-blur for
    // the bigger part of this fix (why it's a separate, non-transitioning
    // layer rather than animated together with the tint)
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.classList.add('is-open');
        closeBtn.focus();
      });
    });
  }

  // exposed so project-viewer.js can re-run this against a popup card's
  // freshly-injected bodyHTML — that injection happens well after this
  // page's own AL.selfHeal below has already settled and stopped
  // watching, so without an explicit call here those images would never
  // get wired up
  function wireIn(root) {
    var imgs = Array.prototype.slice.call((root || document).querySelectorAll('[data-lightbox]'));
    // built now rather than waiting for the first click — a full-viewport
    // backdrop-filter blur is expensive to actually produce the very
    // first time a browser has to render one, and giving it the rest of
    // the page's idle time to do that (instead of zero notice, in the
    // same tick the fade-in starts) is what actually closes the gap
    // between the image appearing and the blur catching up. An earlier
    // version paired this with will-change, which is what broke the blur
    // outright in real testing — this is the same idea without that
    if (imgs.length && window.innerWidth >= MOBILE_MAX_WIDTH) {
      ensureOverlay();
      maybeScheduleHint(root);
    }
    imgs.forEach(function (img) {
      if (img.__lightboxWired) return;
      img.__lightboxWired = true;
      img.addEventListener('click', function () {
        if (window.innerWidth < MOBILE_MAX_WIDTH) return;
        openGalleryFor(img);
      });
    });
  }

  AL.wireLightboxIn = wireIn;
  // lets project-viewer.js's own Escape/ArrowLeft/ArrowRight handling
  // (closing the project popup, paging between projects) stand down
  // while this is open, since both listeners otherwise react to the
  // exact same keydown — Escape was closing the popup underneath the
  // lightbox in the same press, and the arrow keys were paging projects
  // instead of stepping through this gallery
  AL.isLightboxOpen = function () { return !!(overlay && overlay.classList.contains('is-open')); };
  AL.selfHeal(function () { wireIn(document); });
})();
