const { spawn } = require('child_process');
const http = require('http');
const CDP = require('chrome-remote-interface');
const fs = require('fs');
const Browser = require('./browser.js');
const stats = {
  activeInstances: 0,
  waitingResponse: 0,
  waitingBody: 0,
  activeIds: [],
  requestsLastSecond: 0
};
const killTimeout = 60000;
const detectProxyFail = true;
const proxyFailTimeout = 10000;
const detectProxyConnectFail = false;
const proxyOpenTimeout = 5000;
const blockedUrls = [
  'https://ssl.gstatic.com/*/images/*',
  'https://www.google.*/images/*',
  'https://www.gstatic.com/inputtools/images/*',
  'https://www.google.*/gen_204*',
  'https://www.gstatic.com/og/*',
  'https://apis.google.com/*'
];
var onloadScript = '';

function log(text) {
  return console.log('CR: ' + text);
}

fs.readFile(__dirname + '/headless-chrome-onload.js', 'utf8', (err, data) => {
  if (err) {
    log(err);
  }
  onloadScript = data;
});

class Chrome extends Browser {

  get stats() { return stats; }
  get log() { return log; }
  get appName() { return 'Chrome'; }
  get killTimeout() { return killTimeout; }

  cleanProperties() {
    super.cleanProperties();
    this.additionalBodyResolve = null;
    this.additionalBodyData = null;
    this.openSocketTimeout = null;
    this.pendingAjaxCalls = 0;
  }

  async start() {
    const mainPromise = new Promise((resolve) => this.startResolve = resolve);
    const responseReceivedPromise = new Promise((resolve) => this.responseReceivedResolve = resolve);
    const bodyReceivedPromise = new Promise((resolve) => this.bodyReceivedResolve = resolve);
    const additionalBodyPromise = new Promise((resolve) => this.additionalBodyResolve = resolve);
    try {
      fs.mkdirSync(this.sessionDir);
    } catch (e) { /* if folder exists, do nothing */ }

    stats.activeInstances++;
    stats.waitingResponse++;
    stats.waitingBody++;
    this.forceKillTimeout = setTimeout(() => this.forceKillTimeoutFunction(), this.killTimeout);

    const chromeFlags = ['--proxy-server=http://' + this.options.proxy, '--remote-debugging-port=' + this.debuggerPort, '--profile-directory=Default', '--user-data-dir=' + this.sessionDir];
    if (this.isLambda) {
      Array.prototype.push.apply(chromeFlags, this.chromeFlags);
    } else {
      chromeFlags.push('--no-sandbox');
      if (this.options.xvfb === 'true') {
        chromeFlags.push('--window-size=1920x1080', '--display=' + process.env.DISPLAY);
      } else {
        chromeFlags.push('--headless');
      }
      if (!this.isLinkedIn || !this.options.performLogin) {
        chromeFlags.push('-disable-background-networking', '-disable-browser-side-navigation', '-disable-client-side-phishing-detection', '-disable-default-apps', '-disable-gpu', '-disable-hang-monitor', '-disable-popup-blocking', '-disable-prompt-on-repost', '-disable-sync', '-disable-web-resources', '-ignore-certificate-errors', '-no-first-run', '-safebrowsing-disable-auto-update', '-use-mock-keychain', '--blink-settings=imagesEnabled=false');
      }
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
    stats.activeIds.push(this.pid);

    if (this.isLambda) {
      const { client } = await this.findChromeDebugger();
      this.browser = client;
    } else {
      let debuggerUrl;
      try {
        debuggerUrl = await this.findChromeDebugger();
      } catch(e) {
        this.generateErrorAtStart('Error couldn\'t find debugger url for port: ' + this.debuggerPort);
        return mainPromise;
      }

      try {
        this.browser = await CDP({
          port: this.debuggerPort,
          target: debuggerUrl
        });
        if (this.options.xvfb === 'false') {
          const { Target } = this.browser;
          const { browserContextId } = await Target.createBrowserContext();
          await Target.createTarget({
            url: 'about:blank',
            browserContextId
          });
        }
      } catch (e) {
        this.generateErrorAtStart('Error when waiting for browser to load: ' + e.message, 'Error when waiting for browser to load');
        return mainPromise;
      }
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
      Network.setUserAgentOverride({ userAgent: this.options.userAgent }),
      Network.setBlockedURLs({ urls: blockedUrls }),
      this.interceptionEnabledPromise(Network),
      this.linkedInCookiePromise(Network)
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

  findChromeDebugger() {
    return new Promise((resolve, reject) => {
      const query = () => {
        return http.get('http://127.0.0.1:' + this.debuggerPort + '/json', (res) => {
          if (this.executionFinished) {
            return reject();
          }
          let rawData = '';
          res.on('data', (chunk) => rawData += chunk);
          res.on('end', () => {
            try {
              const parsedData = JSON.parse(rawData);
              if (!parsedData[0]) {
                log('webSocketDebuggerUrl couldn\'t be found in: ' + rawData);
                return reject();
              }
              return resolve(parsedData[0].webSocketDebuggerUrl);
            } catch (e) {
              log(e.message + rawData);
              return reject();
            }
          });
        }).on('error', () => setTimeout(() => query(), 1000));
      };
      return query();
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
        stats.waitingResponse--;
        this.response = redirectResponse;
        this.responseReceivedResolve();
      } else if (type === 'XHR' && !this.executionFinished && this.options.ajaxWait === 'true') {
        this.pendingAjaxCalls++;
      }
    });
    Network.responseReceived(({ type, response }) => {
      if (type === 'Document' && this.response === null && !this.executionFinished) {
        stats.waitingResponse--;
        this.response = response;
        this.responseReceivedResolve();
      } else if (type === 'XHR' && !this.executionFinished && this.options.ajaxWait === 'true') {
        this.pendingAjaxCalls--;
      }
    });
    Page.loadEventFired(() => {
      if (this.executionFinished) { return; }
      this.loadEventFired(Runtime, Input);
    });
  }

  loadEventFired(Runtime) {
    this.evaluateBody(Runtime);
  }

  async evaluateBody(Runtime) {
    if (this.executionFinished) { return; }
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
    Runtime.evaluate({ expression: 'document.documentElement.outerHTML' }).then((result) => {
      if ((this.body !== null && this.body !== '') || this.executionFinished) {
        return;
      }
      this.body = result.result.value;
      stats.waitingBody--;
      if (this.isLinkedIn) {
        this.linkedInResponseCode();
      }
      this.bodyReceivedResolve();
    }).catch((e) => {
      if (this.body === null) {
        this.body = 'Error';
        stats.waitingBody--;
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
        stats.waitingResponse--;
        this.responseReceivedResolve();
      }
    }).catch((e) => {
      if (this.response === null) {
        this.response = { status: 999 };
        stats.waitingResponse--;
        this.responseReceivedResolve();
      }
      log('Error while evaluating document.location.href: ' + e.message);
    });
  }

  linkedInCookiePromise() {
    return new Promise((resolve) => resolve());
  }

  interceptionEnabledPromise(Network) {
    return Network.setRequestInterceptionEnabled({ enabled: true });
  }

  proxyTimeoutError(type) {
    if (this.executionFinished) { return; }
    if (this.response === null) {
      stats.waitingResponse--;
    }
    if (this.body === null || this.body === '') {
      stats.waitingBody--;
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
          this.browser.Network.setRequestInterceptionEnabled({ enabled: false }).catch(() => { /* do nothing */ });
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

module.exports = { Chrome, chromeStats: stats, log };
