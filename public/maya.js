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

  var CLOSED = { w: 96, h: 96 };

  function build() {
    var iframe = document.createElement('iframe');
    iframe.title = 'Chat assistant';
    iframe.src = origin + '/embed/assistant/' + encodeURIComponent(subdomain);
    iframe.setAttribute('allow', 'clipboard-write');
    var s = iframe.style;
    s.position = 'fixed'; s.right = '0'; s.bottom = '0';
    s.width = CLOSED.w + 'px'; s.height = CLOSED.h + 'px';
    s.border = '0'; s.background = 'transparent'; s.zIndex = '2147483640';
    s.colorScheme = 'normal';
    iframe.setAttribute('scrolling', 'no');
    document.body.appendChild(iframe);

    window.addEventListener('message', function (ev) {
      if (ev.origin !== origin) return;
      var d = ev.data || {};
      if (d.type === 'maya:size' && typeof d.w === 'number' && typeof d.h === 'number') {
        iframe.style.width = d.w + 'px';
        iframe.style.height = d.h + 'px';
      }
    });
  }

  if (document.body) build();
  else window.addEventListener('DOMContentLoaded', build);
})();
