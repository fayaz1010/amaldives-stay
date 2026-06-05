/**
 * amaldives STAY — one-line booking embed for any website or social bio link.
 *
 * <script src="https://stay.amaldives.com/embed.js" data-subdomain="your-guesthouse" async></script>
 *
 * Optional: data-label="Book now" data-color="#0d9488" data-position="bottom-right"
 */
(function () {
  var script = document.currentScript;
  if (!script) return;

  var subdomain = script.getAttribute('data-subdomain');
  if (!subdomain) {
    console.warn('[amaldives-stay] Missing data-subdomain on embed script');
    return;
  }

  var label = script.getAttribute('data-label') || 'Book direct';
  var color = script.getAttribute('data-color') || '#0d9488';
  var position = script.getAttribute('data-position') || 'bottom-right';
  var base = script.getAttribute('data-base') || 'https://stay.amaldives.com';

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = label;
  btn.setAttribute('aria-label', 'Open booking');
  btn.style.cssText =
    'position:fixed;z-index:99999;padding:14px 22px;border:none;border-radius:9999px;' +
    'font:600 15px/1.2 system-ui,sans-serif;color:#fff;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.2);' +
    'background:' +
    color +
    ';';
  if (position.indexOf('left') >= 0) btn.style.left = '20px';
  else btn.style.right = '20px';
  if (position.indexOf('top') >= 0) btn.style.top = '20px';
  else btn.style.bottom = '20px';

  var overlay = document.createElement('div');
  overlay.style.cssText =
    'display:none;position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.55);align-items:center;justify-content:center;padding:16px;';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  var panel = document.createElement('div');
  panel.style.cssText =
    'background:#fff;border-radius:16px;width:100%;max-width:520px;max-height:90vh;overflow:hidden;position:relative;';

  var close = document.createElement('button');
  close.type = 'button';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Close');
  close.style.cssText =
    'position:absolute;top:8px;right:12px;z-index:2;border:none;background:transparent;font-size:28px;cursor:pointer;line-height:1;';

  var iframe = document.createElement('iframe');
  iframe.src = base + '/embed/' + encodeURIComponent(subdomain);
  iframe.title = 'Book your stay';
  iframe.style.cssText = 'border:0;width:100%;height:min(640px,85vh);display:block;';
  iframe.setAttribute('allow', 'payment');

  function openModal() {
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  btn.addEventListener('click', openModal);
  close.addEventListener('click', closeModal);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeModal();
  });

  panel.appendChild(close);
  panel.appendChild(iframe);
  overlay.appendChild(panel);

  document.body.appendChild(btn);
  document.body.appendChild(overlay);

  window.amaldivesStay = window.amaldivesStay || {};
  window.amaldivesStay.open = openModal;
  window.amaldivesStay.close = closeModal;
})();
