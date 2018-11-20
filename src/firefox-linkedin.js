const { Firefox, log } = require('./firefox.js');
const { By, until } = require('selenium-webdriver');
const linkedInInitialUrl = 'https://www.linkedin.com/#oidjuqw';
const linkedInMethod = 2;

class FirefoxLinkedIn extends Firefox {

  constructor(options) {
    super(options);
    this.isLinkedIn = true;
    this.options.loadAdditionalData = false;
    if (this.options.performLogin) {
      log('Login is not supported in Firefox', this.caller);
    }
  }

  cleanProperties() {
    super.cleanProperties();
    this.realUrl = null;
  }

  start() {
    this.realUrl = this.options.url;
    this.options.url = linkedInMethod === 1 ? 'https://www.google.com' : linkedInInitialUrl;
    return super.start();
  }

  loadEventFired() {
    if (linkedInMethod === 1) {
      this.linkedInLoadEventFiredMethod1();
    } else {
      this.linkedInLoadEventFiredMethod2();
    }
  }

  async linkedInResponseCode() {
    if (this.body.indexOf('Profile Not Found') > -1) {
      this.response.status = 404;
    } else {
      try {
        await this.driver.findElement(By.id('join-form'));
        this.response.status = 504;
      } catch (e) { /* do nothing */ }
    }
    return true;
  }

  linkedInLoadEventFiredMethod1() {
    if (this.options.url !== 'https://www.google.com') {
      return;
    }
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
    this.driver.executeScript(js).then(() => {
      this.options.url = this.realUrl;
      return new Promise((resolve) => resolve());
    }).then(async () => {
      return await this.driver.wait(until.elementLocated(By.id('application-body')), 10000);
    }).then(() => {
      return setTimeout(() => this.evaluateBody(), 5000);
    }).catch((err) => {
      if (this.executionFinished) { return; }
      log('Error visiting linkedin from Google: ' + err.message, this.caller);
      this.body = 'Error on browser';
      this.stats.browserBodyResponseReady(this.appName);
      this.response = { status: 999 };
      this.finishExecution();
    });
  }

  linkedInLoadEventFiredMethod2() {
    if (this.options.url !== linkedInInitialUrl) {
      return;
    }
    this.driver.manage().addCookie({
      name: 'join_wall',
      value: this.options.linkedInJoinWall
    }).then(() => {
      this.options.url = this.realUrl;
      return new Promise((resolve) => setTimeout(() => resolve(), 5000));
    }).then(() => {
      if (this.executionFinished) { return; }
      return this.driver.get(this.options.url);
    }).then(() => {
      if (this.executionFinished) { return; }
      return this.driver.wait(until.elementLocated(By.id('application-body')), 10000);
    }).then(() => {
      if (this.executionFinished) { return; }
      return setTimeout(() => this.evaluateBody(), 5000);
    }).catch((err) => {
      if (this.executionFinished) { return; }
      log('Error when loading linkedin page: ' + err.message, this.caller);
      this.body = 'Error on browser';
      this.stats.browserBodyResponseReady(this.appName);
      this.response = { status: 999 };
      this.finishExecution();
    });
  }

}

module.exports = { FirefoxLinkedIn };
