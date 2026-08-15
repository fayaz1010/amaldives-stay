/*!
 * amaldives STAY — embeddable assistant loader.
 * Paste ONE line on your website:
 *   <script src="https://YOURNAME.stay.amaldives.com/maya.js" async></script>
 * It injects a floating, branded chat bubble that talks to your property's
 * assistant. Subdomain + origin are inferred from this script's own URL.
 */
(function () {
  if (window.__mayaStayLoaded) return;
  window.__mayaStayLoaded = true;

  // Resolve this script's origin/subdomain.
  var me = document.currentScript;
  if (!me) {
    var ss = document.getElementsByTagName('script');
    for (var i = ss.length - 1; i >= 0; i--) {
      if (ss[i].src && /\/maya\.js(\?|$)/.test(ss[i].src)) { me = ss[i]; break; }
    }
  }
  if (!me || !me.src) return;
  var origin, subdomain;
  try {
    var u = new URL(me.src);
    origin = u.origin;
    subdomain = u.hostname.split('.')[0];
  } catch (e) { return; }
  if (!subdomain) return;

  // Bubble footprint when closed. Kept intentionally small so the iframe only
  // covers the corner and every host-page tap/click elsewhere passes straight
  // through (an iframe captures ALL pointer events over its rectangle, even
  // where it's visually transparent — so it must never be bigger than what's
  // actually visible).
  var CLOSED = { w: 88, h: 88 };
  // Floating card size when open on desktop.
  var PANEL = { w: 384, h: 600, gap: 16 };
  // At/below this width the open panel goes full-screen so nothing is clipped.
  var MOBILE_BP = 480;

  function build() {
    var iframe = document.createElement('iframe');
    iframe.title = 'Chat assistant';
    iframe.src = origin + '/embed/assistant/' + encodeURIComponent(subdomain);
    iframe.setAttribute('allow', 'clipboard-write');
    var s = iframe.style;
    s.position = 'fixed';
    s.border = '0'; s.background = 'transparent'; s.zIndex = '2147483640';
    s.colorScheme = 'normal';
    iframe.setAttribute('scrolling', 'no');
    document.body.appendChild(iframe);

    var isOpen = false;

    function isMobile() {
      // Narrow width OR short height (landscape phones) → full-screen panel,
      // otherwise the floating card gets clipped and looks "hidden".
      return window.innerWidth <= MOBILE_BP || window.innerHeight <= 560;
    }

    // Apply the correct iframe geometry for the current state + viewport.
    // Called on every state change and on resize/rotate so it never gets
    // stranded at a stale size that would swallow host-page touches.
    function apply() {
      if (!isOpen) {
        // Collapse to the bubble in the corner; host page is fully tappable.
        s.top = 'auto'; s.left = 'auto'; s.right = '0'; s.bottom = '0';
        s.width = CLOSED.w + 'px'; s.height = CLOSED.h + 'px';
        s.maxWidth = 'none'; s.maxHeight = 'none';
        s.borderRadius = '0'; s.boxShadow = 'none';
        return;
      }
      if (isMobile()) {
        // Full-screen sheet — every part of the panel stays on screen.
        s.top = '0'; s.left = '0'; s.right = '0'; s.bottom = '0';
        s.width = '100%'; s.height = '100%';
        s.maxWidth = 'none'; s.maxHeight = 'none';
        s.borderRadius = '0'; s.boxShadow = 'none';
        return;
      }
      // Desktop: floating card anchored bottom-right, clamped to the viewport
      // so it can never overflow above the fold.
      var w = Math.min(PANEL.w, window.innerWidth - PANEL.gap * 2);
      var h = Math.min(PANEL.h, window.innerHeight - PANEL.gap * 2);
      s.top = 'auto'; s.left = 'auto';
      s.right = PANEL.gap + 'px'; s.bottom = PANEL.gap + 'px';
      s.width = w + 'px'; s.height = h + 'px';
      s.maxWidth = 'none'; s.maxHeight = 'none';
      s.borderRadius = '16px';
      s.boxShadow = '0 12px 40px rgba(0,0,0,.28)';
    }

    apply();

    window.addEventListener('message', function (ev) {
      if (ev.origin !== origin) return;
      var d = ev.data || {};
      if (d.type === 'maya:state') {
        isOpen = !!d.open;
        apply();
      } else if (d.type === 'maya:size' && typeof d.w === 'number') {
        // Backward-compat with older embed pages that post pixel sizes.
        isOpen = d.w > CLOSED.w + 20;
        apply();
      }
    });

    // Keep geometry correct across rotation, resize, and mobile URL-bar shifts.
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
  }

  if (document.body) build();
  else window.addEventListener('DOMContentLoaded', build);
})();
