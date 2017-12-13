const { getRandomInt } = require('./utils.js');
const rimraf = require('rimraf');

class HeadlessBrowser {

  /**
   * @param  {object} options
   * options.appPath
   * options.url
   * options.proxy
   * options.userAgent
   * options.linkedInLiAt
   * options.performLogin
   * options.xvfb
   * options.bodyWait
   * options.ajaxWait
   */
  constructor(options) {
    this.cleanProperties();
    do {
      this.debuggerPort = getRandomInt(9001, 19998);
    } while (this.debuggerPort === 9222);
    this.sessionDir = `/tmp/${this.appName.toLowerCase()}-headless-${getRandomInt(10, 99999)}`;
    this.options = options;
    this.stats.newRequestStart();
    this.executionFinished = false;
  }

  cleanProperties() {
    if (this.forceKillTimeout && this.forceKillTimeout !== null) {
      clearTimeout(this.forceKillTimeout);
    }
    this.forceKillTimeout = null;
    this.isLinkedIn = false;
    this.isTicketmaster = false;
    this.isLambda = false;
    this.debuggerPort = null;
    this.sessionDir = null;
    this.options = null;
    this.response = null;
    this.body = null;
    this.pid = null;
    this.startResolve = null;
    this.responseReceivedResolve = null;
    this.bodyReceivedResolve = null;
    this.browserInstance = null;
    this.browser = null;
  }

  generateErrorAtStart(errorMessage, errorBody = '') {
    if (errorBody !== '') {
      this.body = errorBody;
    } else {
      this.body = errorMessage;
    }
    this.log(errorMessage);
    this.stats.responseReady();
    this.stats.bodyReady();
    this.response = { status: 999 };
    this.finishExecution();
  }

  forceKillTimeoutFunction() {
    if (this.executionFinished) { return; }
    this.log(`Force kill ${this.appName} after ${(this.killTimeout / 1000)}s timeout`);
    if (this.response === null) {
      this.stats.responseReady();
    }
    if (this.body === null || this.body === '') {
      this.stats.bodyReady();
    }
    this.body = 'Timeout';
    this.response = { status: 999 };
    this.finishExecution();
  }

  finishExecution() {
    // Make sure we only finish execution once
    if (this.executionFinished) { return; }
    this.executionFinished = true;
    this.startResolve({ response: this.response, body: this.body });
    if (this.bodyReceivedResolve !== null) { this.bodyReceivedResolve(); }
    if (this.responseReceivedResolve !== null) { this.responseReceivedResolve(); }
    if (this.additionalBodyResolve && this.additionalBodyResolve !== null) { this.additionalBodyResolve(); }
    this.closeBrowser();
    this.stats.removeActiveInstance();
    let index = this.stats.activeIds.indexOf(this.pid);
    if (index > -1) {
      this.stats.activeIds.splice(index, 1);
    }
    rimraf(this.sessionDir, () => {});
    this.cleanProperties();
  }

}

module.exports = HeadlessBrowser;
