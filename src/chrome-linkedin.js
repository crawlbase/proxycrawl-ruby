const { Chrome, log } = require('./chrome.js');
const http = require('http');
const https = require('https');
const linkedInInitialUrl = 'https://www.linkedin.com';

class ChromeLinkedIn extends Chrome {

  get chromeCommonFlags() {
    return [
      '--disable-background-networking',
      '--disable-browser-side-navigation',
      '--disable-client-side-phishing-detection',
      '--disable-default-apps',
      '--disable-hang-monitor',
      '--disable-popup-blocking',
      '--disable-prompt-on-repost',
      '--disable-sync',
      '--disable-web-resources',
      '--enable-automation',
      // '--enable-logging',
      '--force-fieldtrials=SiteIsolationExtensions/Control',
      '--ignore-certificate-errors',
      // '--log-level=0',
      '--metrics-recording-only',
      '--no-first-run',
      '--password-store=basic',
      '--safebrowsing-disable-auto-update',
      '--test-type=webdriver',
      '--use-mock-keychain'
    ];
  }

  constructor(options) {
    super(options);
    this.isLinkedIn = true;
    this.options.loadAdditionalLinkedInData = false;
  }

  cleanProperties() {
    super.cleanProperties();
    this.realUrl = null;
    this.linkedInLinkClicked = null;
  }

  start() {
    if (!this.options.performLogin) {
      this.realUrl = this.options.url;
      if (this.options.linkedInMethod === '1') {
        this.options.url = 'https://www.google.com';
      } else if (this.options.linkedInMethod === '2') {
        this.options.url = linkedInInitialUrl;
      }
    }
    return super.start();
  }

  loadEventFired(Runtime, Input, Network, Page) {
    if (this.options.linkedInMethod === '1') {
      this.linkedInLoadEventFiredMethod1(Runtime, Input);
    } else if (this.options.linkedInMethod === '2') {
      this.linkedInLoadEventFiredMethod2(Runtime, Input, Network, Page);
    } else {
      this.linkedInLoadEventFiredMethod3(Runtime);
    }
  }

  linkedInLoadEventFiredMethod1(Runtime, Input) {
    if (this.options.url === 'https://www.google.com') {
      const js = `var link = document.createElement("a");
        link.href = '${this.realUrl}';
        link.innerText = 'open';
        link.id = 'click-go';
        document.getElementById('viewport').prepend(link);
        var event = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        link.dispatchEvent(event);`;
      Runtime.evaluate({ expression: js }).then(() => {
        this.linkedInLinkClicked = true;
        this.options.url = this.realUrl;
      }).catch((err) => {
        if (this.executionFinished) { return; }
        log('Error visiting linkedin from Google: ' + err.message);
        this.body = 'Error on browser';
        this.response = { status: 999 };
        this.finishExecution();
      });
    } else if (this.linkedInLinkClicked === true) {
      setTimeout(() => this.evaluateBody(Runtime), 1000);
    } else if (this.options.performLogin) {
      setTimeout(() => {
        Runtime.evaluate({ expression: 'document.body.scrollHeight' }).then((result) => {
          return new Promise((resolve) => resolve(result.result.value));
        }).then((height) => {
          Input.dispatchMouseEvent({
            type: 'mouseWheel',
            x: 1,
            y: 1,
            deltaY: height - 500,
            deltaX: 0
          });
          setTimeout(() => this.evaluateBody(Runtime), 3000);
        });
      }, 3000);
    }
  }

  linkedInLoadEventFiredMethod2(Runtime, Input, Network, Page) {
    if (this.options.url !== linkedInInitialUrl) {
      return;
    }
    Network.setCookie({
      // url: this.options.url,
      name: 'join_wall',
      value: this.options.linkedInJoinWall,
      path: '/',
      domain: 'www.linkedin.com',
      secure: true
    }).then(() => {
      this.options.url = this.realUrl;
      return new Promise((resolve) => setTimeout(() => resolve(), 5000));
    }).then(() => {
      if (this.executionFinished) { return; }
      return Page.navigate({ url: this.options.url });
    }).then(() => {
      if (this.executionFinished) { return; }
      return Chrome.waitForNodeToAppear(Runtime, '#application-body');
    }).then(() => {
      if (this.executionFinished) { return; }
      return setTimeout(() => this.evaluateBody(Runtime), 5000);
    }).catch((err) => {
      if (this.executionFinished) { return; }
      log('Error visiting linkedin with cookie: ' + err.message);
      this.body = 'Error on browser';
      this.response = { status: 999 };
      this.stats.browserBodyResponseReady(this.appName);
      this.finishExecution();
    });
  }

  linkedInLoadEventFiredMethod3(Runtime) {
    Chrome.waitForNodeToAppear(Runtime, '#application-body', 200).then(() => {
      if (this.executionFinished) { return; }
      return setTimeout(() => this.evaluateBody(Runtime), 5000);
    }).catch((err) => {
      if (this.executionFinished) { return; }
      log('Error visiting linkedin with method 3: ' + err.message);
      this.body = 'Error on browser';
      this.response = { status: 999 };
      this.stats.browserBodyResponseReady(this.appName);
      this.finishExecution();
    });
  }

  linkedInCookiePromise(Network) {
    if (this.options.performLogin) {
      return Network.setCookie({ url: this.options.url, name: 'li_at', value: this.options.linkedInLiAt, path: '/', domain: '.www.linkedin.com' });
    }
    return new Promise((resolve) => resolve());
  }

  getLinkedInProfileUrl() {
    let finds = this.options.url.match(/\.com\/in\/([A-Za-z\-0-9])*\//);
    if (finds === null) {
      return null;
    }
    return finds[0].replace('.com/in', '');
  }

  linkedInResponseCode() {
    if (this.body.indexOf('Profile Not Found') > -1) {
      this.response = { status: 404 };
    } else if (this.body.indexOf('id="join-form"') > -1 || this.body.indexOf('<title>LinkedIn: Log In or Sign Up') > -1) {
      this.response = { status: 504 };
    }
  }

  loadAdditionalLinkedInData() {
    let profileUrl = this.getLinkedInProfileUrl();
    if (profileUrl === null) {
      return;
    }
    let recommendationsResolve;
    const recommendationsPromise = new Promise((resolve) => recommendationsResolve = resolve);
    let linkedInRecommendationsJson = '';
    const proxyParts = this.options.proxy.split(':');
    const proxyTunnel = http.request({
      host: proxyParts[0],
      port: proxyParts[1],
      method: 'CONNECT',
      path: 'www.linkedin.com:443'
    });
    proxyTunnel.on('error', (error) => log(error));
    proxyTunnel.on('connect', (res, socket) => {
      if (res.statusCode !== 200) {
        recommendationsResolve();
        return log('Couldn\'t connect to proxy for loading ajax call');
      }
      https.get(this.linkedInApiOptionsForPath(`/voyager/api/identity/profiles${profileUrl}recommendations?q=received&recommendationStatuses=List(VISIBLE)`, socket), (res) => {
        let rawData = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          linkedInRecommendationsJson = '<script id="recommendations-received-json" type="application/json">' + rawData + '</script>';
          recommendationsResolve();
        });
      }).on('error', (error) => {
        recommendationsResolve();
        log(error);
      });
    }).end();

    Promise.all([recommendationsPromise]).then(() => {
      this.linkedInAdditionalBodyData = linkedInRecommendationsJson;
      this.linkedInAdditionalBodyResolve();
    });
  }

  linkedInApiOptionsForPath(path, socket) {
    return {
      host: 'www.linkedin.com',
      path,
      socket,
      agent: false,
      headers: {
        'Csrf-Token': 'ajax:0669435261578133242',
        Cookie: 'JSESSIONID="ajax:0669435261578133242"; li_at=' + this.options.linkedInLiAt
      }
    };
  }
}

module.exports = { ChromeLinkedIn };
