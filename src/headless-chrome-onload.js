/* global navigator, window, document, MouseEvent */
// overwrite the `languages` property to use a custom getter
Object.defineProperty(navigator, 'languages', {
  get: function() {
    return ['en-US', 'en'];
  }
});

// overwrite the `plugins` property to use a custom getter
Object.defineProperty(navigator, 'plugins', {
  get: function() {
    return [
      { MimeType: { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format',          enabledPlugin: {} }, description: 'Portable Document Format', filename: 'internal-pdf-viewer',              length: 1, name: 'Chrome PDF Plugin' },
      { MimeType: { type: 'application/pdf',                 suffixes: 'pdf', description: '',                                  enabledPlugin: {} }, description: '',                         filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', length: 1, name: 'Chrome PDF Viewer' },
      { MimeType: { type: 'application/x-pnacl',             suffixes: '',    description: 'Portable Native Client Executable', enabledPlugin: {} }, description: '',                         filename: 'internal-nacl-plugin',             length: 2, name: 'Native Client' }
    ];
  }
});

window.innerWidth = 1920;
window.innerHeight = 1130;
window.outerWidth = 1920;
window.outerHeight = 1210;

window._delay = async function(delayTime) {
  return new Promise((resolve) => setTimeout(() => resolve(), delayTime));
};
window._scrollBottom = function() {
  window.scrollTo(0, document.body.scrollHeight);
};
window._clickElement = function(element) {
  element.dispatchEvent(new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: true
  }));
};
