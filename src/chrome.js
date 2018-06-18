const { spawn } = require('child_process');
const CDP = require('chrome-remote-interface');
const fs = require('fs');
const Browser = require('./browser.js');
const killTimeout = 60000;
const detectProxyFail = true;
const proxyFailTimeout = 10000;
const detectProxyConnectFail = false;
const proxyOpenTimeout = 5000;
const downloadPath = 'darwin' === process.platform ? '/Users/adria/Downloads' : '/tmp';
const blockedUrls = [
  // Google
  'https://ssl.gstatic.com/*/images/*',
  'https://www.google.*/images/*',
  'https://www.gstatic.com/inputtools/images/*',
  'https://www.google.*/gen_204*',
  'https://www.gstatic.com/og/*',
  'https://apis.google.com/*',
  'https://adservice.google*',
  // Linkedin
  'https://static-exp*.licdn.com/scds/concat/common/css*',
  'https://static-exp*.licdn.com/scds/common/u/images/*',
  'https://static-exp*.licdn.com/sc/p/com.linkedin.public-profile-frontend',
  'https://www.linkedin.com/li/track',
  'https://static-exp*.licdn.com/cdo/rum/id?*',
  'https://www.linkedin.com/lite/platformtelemetry',
  'https://www.linkedin.com/mob/tracking',
  'https://media-exp*.licdn.com/cdo/rum/id?*',
  'https://www.linkedin.com/fizzy/admin?*',
  'https://www.linkedin.com/lite/platformtelemetry',
  'https://www.linkedin.com/lite/rum-track?csrfToken=*',
  // Toysrus
  'https://rusads.toysrus.com/*',
  'https://*.rubiconproject.com/*',
  'https://asset.gomoxie.solutions/*',
  'https://*.userreplay.net/*',
  'https://*.omniretailgroup.net/*',
  'https://static.criteo.net/*',
  'https://js-agent.newrelic.com/*',
  'https://tags.tiqcdn.com/*',
  'https://smetrics.toysrus.com/*',
  'https://www.toysrus.com/build/assets/fonts/*',
  'https://www.toysrus.com/build/vendor.*.svg',
  'https://px.owneriq.net/*',
  'https://*.brsrvr.com/*',
  'https://www.res-x.com/*',
  'https://truimg.toysrus.com/*',
  'https://tags.tiqcdn.com/*',
  'https://*.go-mpulse.net/*',
  'https://sync.adaptv.advertising.com/*'
];
const chromeCommonFlags = [
  // '--auto-open-devtools-for-tabs',
  '--no-sandbox',
  // '--no-zygote',
  '--disable-breakpad',
  '--disable-canvas-aa',
  '--disable-cloud-import',
  '--disable-gpu-sandbox',
  '--disable-plugins',
  '--disable-print-preview',
  '--disable-renderer-backgrounding',
  '--disable-smooth-scrolling',
  '--disable-translate',
  '--disable-translate-new-ux',
  '--disable-webgl',
  '--disable-composited-antialiasing',
  '--disable-extensions-http-throttling',
  '--no-default-browser-check',
  '--no-experiments',
  '--no-pings',
  '--disable-datasaver-prompt',
  '--disable-add-to-shelf',
  '--prerender-from-omnibox=disabled',
  '--ipc-connection-timeout=10000',
  '--media-cache-size=10000000',
  '--disable-background-networking',
  '--disable-browser-side-navigation',
  '--disable-desktop-notifications',
  '--disable-notifications',
  '--disable-client-side-phishing-detection',
  '--disable-default-apps',
  '--disable-gpu',
  '--disable-hang-monitor',
  '--disable-popup-blocking',
  '--disable-prompt-on-repost',
  '--disable-sync',
  '--disable-web-resources',
  '--ignore-certificate-errors',
  '--no-first-run',
  '--safebrowsing-disable-auto-update',
  '--use-mock-keychain',
  '--window-size=1318,1001',
  '--profile-directory=Default'
];
var onloadScript = '';

function log(text) {
  return console.log('CR: ' + text);
}

fs.readFile(__dirname + '/headless-chrome-onload.js', 'utf8', (err, data) => {
  if (err) {
    return; // log(err);
  }
  onloadScript = data;
});

class Chrome extends Browser {

  get log() { return log; }
  get appName() { return 'Chrome'; }
  get killTimeout() { return (this.options && this.options.killTimeout) || killTimeout; }

  cleanProperties() {
    super.cleanProperties();
    this.additionalBodyResolve = null;
    this.additionalBodyData = null;
    this.openSocketTimeout = null;
    this.pendingAjaxCalls = 0;
    this.fileAttachment = null;
  }

  async start() {
    const mainPromise = new Promise((resolve) => this.startResolve = resolve);
    const responseReceivedPromise = new Promise((resolve) => this.responseReceivedResolve = resolve);
    const bodyReceivedPromise = new Promise((resolve) => this.bodyReceivedResolve = resolve);
    const additionalBodyPromise = new Promise((resolve) => this.additionalBodyResolve = resolve);
    try {
      fs.mkdirSync(this.sessionDir);
    } catch (e) { /* if folder exists, do nothing */ }

    this.stats.browserNewRequest(this.appName);
    this.forceKillTimeout = setTimeout(() => this.forceKillTimeoutFunction(), this.killTimeout);

    const chromeFlags = ['--remote-debugging-port=' + this.debuggerPort, '--user-data-dir=' + this.sessionDir];
    if (this.isLambda) {
      Array.prototype.push.apply(chromeFlags, this.chromeFlags);
    } else {
      if (this.isLinkedIn) {
        Array.prototype.push.apply(chromeFlags, this.chromeCommonFlags);
      } else {
        Array.prototype.push.apply(chromeFlags, chromeCommonFlags);
      }
      if (this.options.xvfb === 'true') {
        chromeFlags.push('--display=:99');
      } else {
        chromeFlags.push('--headless');
      }
      if (this.options.enableImages !== 'true') {
        chromeFlags.push('--blink-settings=imagesEnabled=false');
      }
    }
    if (this.options.proxy) {
      chromeFlags.push('--proxy-server=http://' + this.options.proxy);
    }

    try {
      this.browserInstance = spawn(this.options.appPath, chromeFlags, { detached: true }).on('error', (err) => { throw err; });
      if (this.isLambda) {
        // Unref process, so that it doesn't prevent the Lambda request from finishing
        this.browserInstance.unref();
        this.browserInstance.stdout.unref();
        this.browserInstance.stderr.unref();
        this.browserInstance.stdin.unref();
      }
    } catch (e) {
      this.generateErrorAtStart('Failed spawning browser');
      return mainPromise;
    }

    if (this.browserInstance.pid === undefined) {
      this.generateErrorAtStart('Browser couldn\'t be opened');
      return mainPromise;
    }
    this.pid = this.browserInstance.pid.toString();
    this.stats.activeIds.push(this.pid);

    try {
      const { client } = await this.findChromeDebugger();
      this.browser = client;
    } catch (e) {
      this.generateErrorAtStart('Error couldn\'t load browser on port: ' + this.debuggerPort);
      return mainPromise;
    }

    if (detectProxyFail && this.browser !== null && this.browser._ws._socket) {
      if (detectProxyConnectFail) {
        this.openSocketTimeout = setTimeout(() => this.proxyTimeoutError('on connect'), proxyOpenTimeout);
        this.browser._ws._socket.on('connect', () => clearTimeout(this.openSocketTimeout));
      }
      this.browser._ws._socket.setTimeout(proxyFailTimeout, () => this.proxyTimeoutError('connection'));
    }

    const { Network, Page, Runtime, Input } = this.browser;

    this.addEvents(Network, Page, Runtime, Input);

    Promise.all([
      Network.enable(),
      Page.enable(),
      Page.addScriptToEvaluateOnNewDocument({ source: onloadScript }),
      Network.clearBrowserCache(),
      Network.clearBrowserCookies(),
      this.userAgentOverridePromise(Network),
      Network.setBlockedURLs({ urls: blockedUrls }),
      this.interceptionEnabledPromise(Network),
      this.linkedInCookiePromise(Network),
      this.cookiePromise(Network),
      this.downloadBehaviorPromise(Page)
    ]).then(() => {
      if (this.executionFinished) { return; }
      if ((this.isLinkedIn || this.isTicketmaster) && this.options.loadAdditionalData) {
        this.loadAdditionalData();
      } else {
        this.additionalBodyResolve();
      }
      return Page.navigate({ url: this.options.url });
    }).catch((err) => {
      if (this.executionFinished) { return; }
      this.generateErrorAtStart('Error when enabling events: ' + err.message, 'Error on browser');
    });

    Promise.all([responseReceivedPromise, bodyReceivedPromise, additionalBodyPromise]).then(() => {
      if (this.executionFinished) { return; }
      if (this.isLinkedIn || this.isTicketmaster) {
        this.body = this.body.replace('</body>', this.additionalBodyData + '</body>');
      }
      this.finishExecution();
    }).catch((e) => log('Error while waiting all promises to complete: ' + e.message));

    return mainPromise;
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
          await new Promise((resolve) => setTimeout(() => resolve(), 100));
          continue;
        } else {
          throw error;
        }
      }
    }
    throw new Error('Unreachable code reached');
  }

  static waitForNodeToAppear(Runtime, selector, timesToCheck = 100) {
    return new Promise((resolve, reject) => {
      Runtime.evaluate({
        expression: `document.querySelector('${selector}')`
      }).then(async (result) => {
        if (result.result.objectId) {
          return resolve();
        }
        if (timesToCheck <= 0) {
          return reject({ message: 'Wait tries exceeded waiting for node ' + selector + ' to appear.' });
        }
        await new Promise((resolve) => setTimeout(() => resolve(), 100));
        return Chrome.waitForNodeToAppear(Runtime, selector, timesToCheck - 1);
      }).catch((err) => reject(err));
    });
  }

  addEvents(Network, Page, Runtime, Input) {
    Network.requestIntercepted(({ interceptionId, request }) => {
      if (this.executionFinished) { return; }
      const blocked = request.url.indexOf('https://adservice.google') > -1 || this.executionFinished;
      Network.continueInterceptedRequest({ interceptionId, errorReason: blocked ? 'Aborted' : undefined }).catch(() => { /* do nothing */ });
    });
    Network.requestWillBeSent(({ type, redirectResponse }) => {
      if (type === 'Document' && this.response === null && redirectResponse && !this.executionFinished) {
        this.stats.browserResponseReady(this.appName);
        this.response = redirectResponse;
        this.responseReceivedResolve();
      } else if (type === 'XHR' && !this.executionFinished && this.options.ajaxWait === 'true') {
        this.pendingAjaxCalls++;
      }
    });
    Network.responseReceived(({ type, response }) => {
      const contentDispositionHeader = response && response.headers && response.headers['content-disposition'];
      if (!this.executionFinished &&
        (type === 'Document' && (this.response === null || this.response.status === 302)) ||
        ('true' === this.options.enableDownloads && contentDispositionHeader && contentDispositionHeader.indexOf('attachment') > -1)
      ) {
        this.stats.browserResponseReady(this.appName);
        this.response = response;
        if (!this.executionFinished && 'true' === this.options.enableDownloads && contentDispositionHeader && contentDispositionHeader.indexOf('attachment') > -1) {
          const fileAttachment = contentDispositionHeader.split(';');
          if (fileAttachment.length > 0) {
            this.fileAttachment = fileAttachment[1].trim().replace('filename="', '').replace('"', '');
          }
        }
        this.responseReceivedResolve();
      } else if (type === 'XHR' && !this.executionFinished && this.options.ajaxWait === 'true') {
        this.pendingAjaxCalls--;
      }
    });
    Page.loadEventFired(() => {
      if (this.executionFinished) { return; }
      this.loadEventFired(Runtime, Input, Network, Page);
    });
  }

  async loadEventFired(Runtime) {
    if (this.options.evaluateJavascript) {
      try {
        const scriptResult = await this.evaluateJavascript(Runtime);
        if (!this.executionFinished && scriptResult.exceptionDetails) {
          log('Javascript evaluation promise rejected: ' + scriptResult.exceptionDetails.exception.value);
          this.response = { status: 595 };
        }
      } catch (e) { log('Error while evaluating passed javascript command'); }
    }
    this.evaluateBody(Runtime);
  }

  evaluateJavascript(Runtime) {
    if (this.executionFinished) { return; }
    this.browser._ws._socket.setTimeout(0);
    const browserCode = `new Promise(async (_resolve, _reject) => {
      ${this.options.evaluateJavascript}
    });`;
    return Runtime.evaluate({
      expression: browserCode,
      awaitPromise: true
    });
  }

  async evaluateBody(Runtime) {
    if (this.executionFinished) { return; }
    this.browser._ws._socket.setTimeout(0);
    if (!this.executionFinished && this.options.bodyWait && this.options.bodyWait > 0) {
      await new Promise((resolve) => setTimeout(() => resolve(), this.options.bodyWait));
      if (this.executionFinished) { return; }
    }
    if (!this.executionFinished && this.options.ajaxWait === 'true') {
      while (!this.executionFinished && this.pendingAjaxCalls > 0) {
        await new Promise((resolve) => setTimeout(() => resolve(), 500));
      }
      if (this.executionFinished) { return; }
    }
    if (null !== this.fileAttachment && fs.existsSync(downloadPath + '/' + this.fileAttachment)) {
      this.body = fs.readFileSync(downloadPath + '/' + this.fileAttachment);
      this.stats.browserBodyReady(this.appName);
      fs.unlinkSync(downloadPath + '/' + this.fileAttachment);
      return this.bodyReceivedResolve();
    }
    Runtime.evaluate({ expression: 'document.documentElement.outerHTML' }).then((result) => {
      if ((this.body !== null && this.body !== '') || this.executionFinished) {
        return;
      }
      this.body = result.result.value;
      this.stats.browserBodyReady(this.appName);
      if (this.isLinkedIn) {
        this.linkedInResponseCode();
      }
      this.bodyReceivedResolve();
    }).catch((e) => {
      if (this.body === null) {
        this.body = 'Error';
        this.stats.browserBodyReady(this.appName);
        this.bodyReceivedResolve();
      }
      log('Error while evaluating outerHTML: ' + e.message);
    });

    // This is in case Network couldn't detect the redirect for blocked Google
    Runtime.evaluate({ expression: 'document.location.href' }).then((result) => {
      if (this.response !== null || this.executionFinished) {
        return;
      }
      let locationUrl = result.result.value;
      if (locationUrl.indexOf('https://ipv6.google.com/sorry') > -1) {
        this.response = { status: 503 };
      } else if (locationUrl === 'chrome-error://chromewebdata/') {
        log('Error 999: chrome-error://chromewebdata/');
        this.response = { status: 999 };
      }
      if (this.response !== null && this.responseReceivedResolve !== null) {
        this.stats.browserResponseReady(this.appName);
        this.responseReceivedResolve();
      }
    }).catch((e) => {
      if (this.response === null) {
        this.response = { status: 999 };
        this.stats.browserResponseReady(this.appName);
        this.responseReceivedResolve();
      }
      log('Error while evaluating document.location.href: ' + e.message);
    });
  }

  linkedInCookiePromise() {
    return new Promise((resolve) => resolve());
  }

  cookiePromise(Network) {
    if (!this.options.cookie || this.options.cookie === null || this.options.cookie === '') {
      return new Promise((resolve) => resolve());
    }
    const cookies = this.options.cookie.split(';');
    const cookiesArray = [];
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.length === 0) {
        continue;
      }
      const cookieData = cookie.split('=');
      const cookieName = cookieData[0];
      cookieData.splice(0, 1);
      cookiesArray.push({
        url: this.options.url,
        name: cookieName,
        value: cookieData.join('=')
      });
    }
    return Network.setCookies({ cookies: cookiesArray });
  }

  interceptionEnabledPromise(Network) {
    let promise;

    try {
      promise = Network.setRequestInterceptionEnabled({ enabled: true });
    } catch (e) {
      //promise = Network.setRequestInterception(['https://adservice.google*']);
    }

    return promise;
  }

  userAgentOverridePromise(Network) {
    if (this.options.userAgent) {
      return Network.setUserAgentOverride({ userAgent: this.options.userAgent });
    } else {
      return new Promise((resolve) => resolve());
    }
  }

  downloadBehaviorPromise(Page) {
    if ('true' === this.options.enableDownloads) {
      return Page.setDownloadBehavior({ behavior: 'allow', downloadPath });
    } else {
      return Page.setDownloadBehavior({ behavior: 'deny' });
    }
  }

  proxyTimeoutError(type) {
    if (this.executionFinished) { return; }
    if (this.response === null) {
      this.stats.browserResponseReady(this.appName);
    }
    if (this.body === null || this.body === '') {
      this.stats.browserBodyReady(this.appName);
    }
    this.body = 'Proxy timeout';
    log('Proxy ' + this.options.proxy + ' ' + type + ' timeout');
    this.response = { status: 999 };
    return this.finishExecution();
  }

  closeBrowser() {
    if (this.browser !== null) {
      try {
        this.browser.Page.stopLoading().catch(() => { /* do nothing */ });
        this.browser.Network.disable().catch(() => { /* do nothing */ });
        this.browser.Page.disable().catch(() => { /* do nothing */ });
        if (!this.isLambda) {
          try {
            this.browser.Network.setRequestInterceptionEnabled({ enabled: false }).catch(() => { /* do nothing */ });
          } catch (e) {
            //this.browser.Network.setRequestInterception([]).catch(() => { /* do nothing */ });
          }
        }
        this.browser.close();
      } catch (e) {
        log('Error while trying to close Chrome: ' + e.message);
      }
    }
    if (this.browserInstance !== null) {
      try {
        this.browserInstance.kill();
      } catch (e) {
        log('Error while trying to kill Chrome: ' + e.message);
      }
    }
    if (this.pid !== null) {
      try {
        process.kill(-this.pid);
      } catch (e) { /* do nothing */ }
    }
  }

}

module.exports = { Chrome, log };
