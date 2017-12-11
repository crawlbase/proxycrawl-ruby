const CDP = require('chrome-remote-interface');
const { Chrome } = require('./chrome.js');

class ChromeLambda extends Chrome {

  get chromeFlags() {
    return [
      '--single-process',
      '--no-sandbox',
      '--no-zygote',
      '--disable-background-networking',
      '--disable-breakpad',
      '--disable-canvas-aa',
      '--disable-client-side-phishing-detection',
      '--disable-cloud-import',
      '--disable-gpu',
      '--disable-gpu-sandbox',
      '--disable-plugins',
      '--disable-print-preview',
      '--disable-renderer-backgrounding',
      '--disable-smooth-scrolling',
      '--disable-sync',
      '--disable-translate',
      '--disable-translate-new-ux',
      '--disable-webgl',
      '--disable-composited-antialiasing',
      '--disable-default-apps',
      '--disable-extensions-http-throttling',
      '--no-default-browser-check',
      '--no-experiments',
      '--no-first-run',
      '--no-pings',
      '--prerender-from-omnibox=disabled',
      '--disk-cache-dir=/tmp/cache-dir',
      '--disk-cache-size=10000000',
      '--ipc-connection-timeout=10000',
      '--media-cache-size=10000000',
      '--window-size=1918,1071'
    ];
  }

  constructor(options) {
    super(options);
    this.isLambda = true;
  }

  cleanProperties() {
    super.cleanProperties();
  }

  async findChromeDebugger() {
    const tries = 100;
    for (let i = 0; i < tries; i++) {
      try {
        const tab = await CDP.New({ host: '127.0.0.1', port: this.debuggerPort });
        const client = await CDP({ target: tab });
        return { tab, client };
      } catch (error) {
        if ((error.code == 'ECONNREFUSED' || error.code == 'ECONNRESET') && i < tries - 1) {
          await new Promise((resolve) => setTimeout(() => resolve(), 10));
          continue;
        } else {
          throw error;
        }
      }
    }
    throw new Error('Unreachable code reached');
  }

  interceptionEnabledPromise() {
    return new Promise((resolve) => resolve());
  }

}

module.exports = { ChromeLambda };
