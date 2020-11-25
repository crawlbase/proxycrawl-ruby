const { exec } = require('child_process');
const { Builder } = require('selenium-webdriver');
const firefoxSelenium = require('selenium-webdriver/firefox');
const Browser = require('./browser.js');
const { getRandomInt } = require('./utils.js');
const killTimeout = 60000;

function log(text, caller = '') {
  if (null === caller || '' === caller) {
    return console.log('FF: ' + text);
  } else {
    return console.log('FF [' + caller + ']: ' + text);
  }
}

class Firefox extends Browser {
  get log() {
    return log;
  }
  get appName() {
    return 'Firefox';
  }
  get killTimeout() {
    return (this.options && this.options.killTimeout) || killTimeout;
  }

  constructor(options) {
    super(options);
    this.uniqueId = '_' + Math.random().toString(36).substr(2, 9);
  }

  cleanProperties() {
    super.cleanProperties();
    if (this.onProcessFinishCallback) {
      this.onProcessFinishCallback(this.uniqueId);
    }
    this.driver = null;
    this.uniqueId = null;
    this.onProcessFinishCallback = null;
  }

  async start() {
    const mainPromise = new Promise((resolve) => (this.startResolve = resolve));
    const responseReceivedPromise = new Promise((resolve) => (this.responseReceivedResolve = resolve));
    const bodyReceivedPromise = new Promise((resolve) => (this.bodyReceivedResolve = resolve));

    this.stats.browserNewRequest(this.appName);
    this.forceKillTimeout = setTimeout(() => this.forceKillTimeoutFunction(), this.killTimeout);

    const binary = new firefoxSelenium.Binary();
    const randomIdentifier = 'random-' + getRandomInt(0, 999999);
    const firefoxFlags = ['-headless', '-url', 'about:blank', '-' + randomIdentifier];
    binary.addArguments(firefoxFlags);
    const firefoxOptions = new firefoxSelenium.Options();
    const firefoxProfile = this.generateProfile();
    firefoxOptions.setBinary(binary);
    firefoxOptions.setProfile(firefoxProfile);

    try {
      this.driver = await new Builder().forBrowser('firefox').setFirefoxOptions(firefoxOptions).build();
    } catch (err) {
      if (this.executionFinished) {
        return mainPromise;
      }
      this.generateErrorAtStart('Error when launching Firefox: ' + err.message, 'Error on browser');
      return mainPromise;
    }

    this.driver.get(this.options.url).catch((err) => {
      if (this.executionFinished) {
        return;
      }
      this.generateErrorAtStart(
        'Error when loading the page (Proxy: ' + this.options.proxy + '): ' + err.message,
        'Error on browser'
      );
    });
    this.findPid(randomIdentifier).then((pid) => {
      if (pid !== null) {
        this.pid = pid;
        this.stats.activeIds.push(this.pid);
      }
    });
    this.addEvents();

    Promise.all([responseReceivedPromise, bodyReceivedPromise])
      .then(() => {
        if (this.executionFinished) {
          return;
        }
        // if (this.isLinkedIn) {
        //   this.body = this.body.replace('</body>', this.additionalBodyData + '</body>');
        // }
        this.finishExecution();
      })
      .catch((e) => log('Error while waiting all promises to complete: ' + e.message, this.caller));

    return mainPromise;
  }

  generateProfile() {
    const proxyParts = this.options.proxy.split(':');
    const profile = new firefoxSelenium.Profile();

    profile.setPreference('network.proxy.http', proxyParts[0]);
    profile.setPreference('network.proxy.http_port', proxyParts[1] * 1);
    profile.setPreference('network.proxy.share_proxy_settings', true);
    profile.setPreference('network.proxy.socks', proxyParts[0]);
    profile.setPreference('network.proxy.socks_port', proxyParts[1] * 1);
    profile.setPreference('network.proxy.ssl', proxyParts[0]);
    profile.setPreference('network.proxy.ssl_port', proxyParts[1] * 1);
    profile.setPreference('network.proxy.type', 1);
    profile.setPreference('security.ssl.enable_ocsp_stapling', false);
    profile.setPreference('general.useragent.override', this.options.userAgent);
    profile.setPreference('browser.cache.disk.enable', false);
    profile.setPreference('browser.cache.memory.enable', false);
    profile.setPreference('browser.cache.offline.enable', false);
    profile.setPreference('network.http.use-cache', false);

    return profile;
  }

  async addEvents() {
    try {
      await this.driver.wait(async () => {
        if (this.executionFinished) {
          return true;
        }
        const readyState = await this.driver.executeScript('return document.readyState');
        return readyState === 'complete';
      });
    } catch (err) {
      if (this.executionFinished) {
        return;
      }
      this.generateErrorAtStart(
        'Error when waiting for page to load (Proxy: ' + this.options.proxy + '): ' + err.message,
        'Error on browser'
      );
    }
    if (!this.executionFinished) {
      this.loadEventFired();
    }
  }

  findPid(randomIdentifier) {
    return new Promise((resolve) => {
      exec(`ps aux | grep "${randomIdentifier}"`, (error, stdout) => {
        if (error != null) {
          return resolve(null); // Always resolve
        }
        let matches = stdout.match(/\d+/);
        if (matches.length > 0) {
          return resolve(matches[0] * 1);
        }
        resolve(null);
      });
    });
  }

  loadEventFired() {
    this.evaluateBody();
  }

  evaluateBody() {
    if (this.executionFinished) {
      return;
    }
    this.driver
      .getPageSource()
      .then((result) => {
        if (this.executionFinished) {
          return;
        }
        this.body = result;
        this.stats.browserBodyReady(this.appName);
        this.bodyReceivedResolve();
        this.evaluateResponseCode();
      })
      .catch((e) => {
        if (this.executionFinished) {
          return;
        }
        this.body = 'Error';
        this.stats.browserBodyReady(this.appName);
        this.bodyReceivedResolve();
        this.evaluateResponseCode();
        log('Error on getPageSource(): ' + e.message, this.caller);
      });
  }

  async evaluateResponseCode() {
    if (this.executionFinished) {
      return;
    }
    if (this.body === 'Error') {
      this.response = { status: 999 };
      this.stats.browserResponseReady(this.appName);
      return this.responseReceivedResolve();
    }
    const locationUrl = await this.driver.getCurrentUrl();
    if (this.executionFinished) {
      return;
    }
    this.response = { status: 200 };
    if (locationUrl.indexOf('https://ipv6.google.com/sorry') > -1) {
      this.response.status = 503;
    } else if (this.isLinkedIn) {
      await this.linkedInResponseCode();
    }
    if (this.response !== null && this.responseReceivedResolve !== null) {
      this.stats.browserResponseReady(this.appName);
      this.responseReceivedResolve();
    }
  }

  onProcessFinish(callback) {
    this.onProcessFinishCallback = callback;
  }

  closeBrowser() {
    if (this.driver !== null) {
      this.driver.quit().catch((e) => log('Error while closing Firefox: ' + e.message, this.caller));
    }
    if (this.pid !== null) {
      const pid = this.pid * 1;
      setTimeout(() => {
        try {
          process.kill(pid);
        } catch (e) {
          /* do nothing */
        }
      }, 3000);
    }
  }
}

module.exports = { Firefox, log };
