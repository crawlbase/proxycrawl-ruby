const { Firefox, log } = require('./firefox.js');
const { By, until } = require('selenium-webdriver');

class FirefoxLinkedIn extends Firefox {

  constructor(options) {
    super(options);
    this.isLinkedIn = true;
    this.options.loadAdditionalData = false;
    if (this.options.performLogin) {
      log('Login is not supported in Firefox');
    }
  }

  cleanProperties() {
    super.cleanProperties();
    this.realUrl = null;
  }

  start() {
    this.realUrl = this.options.url;
    this.options.url = 'https://www.google.com';
    return super.start();
  }

  loadEventFired() {
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
      this.driver.executeScript(js).then(() => {
        this.options.url = this.realUrl;
        return new Promise((resolve) => resolve());
      }).then(async () => {
        return await this.driver.wait(until.elementLocated(By.id('application-body')), 10000);
      }).then(() => {
        return setTimeout(() => this.evaluateBody(), 5000);
      }).catch((err) => {
        if (this.executionFinished) { return; }
        log('Error visiting linkedin from Google: ' + err.message);
        this.body = 'Error on browser';
        this.stats.waitingBody--;
        this.stats.waitingResponse--;
        this.response = { status: 999 };
        this.finishExecution();
      });
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

}

module.exports = { FirefoxLinkedIn };
