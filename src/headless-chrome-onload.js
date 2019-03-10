/* global navigator, window, document, MouseEvent */
Object.defineProperty(navigator, 'languages', {
  get: () => ['en-US', 'en']
});

Object.defineProperty(navigator, 'plugins', {
  get: () => [
    { MimeType: { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format',          enabledPlugin: {} }, description: 'Portable Document Format', filename: 'internal-pdf-viewer',              length: 1, name: 'Chrome PDF Plugin' },
    { MimeType: { type: 'application/pdf',                 suffixes: 'pdf', description: '',                                  enabledPlugin: {} }, description: '',                         filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', length: 1, name: 'Chrome PDF Viewer' },
    { MimeType: { type: 'application/x-pnacl',             suffixes: '',    description: 'Portable Native Client Executable', enabledPlugin: {} }, description: '',                         filename: 'internal-nacl-plugin',             length: 2, name: 'Native Client' }
  ]
});

Object.defineProperty(navigator, 'doNotTrack', {
  get: () => '1'
});

const newProto = navigator.__proto__;
delete newProto.webdriver;
navigator.__proto__ = newProto;

Notification = {
  permission: 'default',
  maxActions: 2,
  requestPermission: function() {}
};

const originalQuery = window.navigator.permissions.query;
window.navigator.permissions.__proto__.query = parameters =>
  parameters.name === 'notifications'
    ? Promise.resolve({ state: Notification.permission })
    : originalQuery(parameters);

  const oldCall = Function.prototype.call;
  function call() {
      return oldCall.apply(this, arguments);
  }
  Function.prototype.call = call;

  const nativeToStringFunctionString = Error.toString().replace(/Error/g, 'toString');
  const oldToString = Function.prototype.toString;

  function functionToString() {
    if (this === window.navigator.permissions.query) {
      return 'function query() { [native code] }';
    }
    if (this === functionToString) {
      return nativeToStringFunctionString;
    }
    return oldCall.call(oldToString, this);
  }
  Function.prototype.toString = functionToString;

window.chrome = {
  loadTimes: function() {},
  csi: function() {},
  app: {
    isInstalled: false,
    getDetails: function() {},
    getIsInstalled: function() {},
    installState: function() {},
    runningState: function() {},
    InstallState: {},
    RunningState: {}
  },
  runtime: {
    id: undefined,
    connect: function() {},
    sendMessage: function() {},
    OnInstalledReason: {},
    OnRestartRequiredReason: {},
    PlatformArch: {},
    PlatformNaclArch: {},
    PlatformOs: {},
    RequestUpdateCheckStatus: {},
  }
};

window.console.debug = () => {
  return null;
};

Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
  get: function() {
    return window;
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
