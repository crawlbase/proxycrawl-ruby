const { Chrome, log } = require('./chrome.js');

class ChromeAliexpress extends Chrome {

  constructor(options) {
    super(options);
    this.isAliexpress = true;
  }

  cleanProperties() {
    super.cleanProperties();
    this.loginIframeContextId = null;
    this.realUrl = null;
  }

  addEvents(Network, Page, Runtime, Input) {
    Runtime.executionContextCreated(({ context }) => {
      if (context.origin.indexOf('https://passport.aliexpress.com') > -1) {
        this.loginIframeContextId = context.id;
      }
    });
    return super.addEvents(Network, Page, Runtime, Input);
  }

  async loadEventFired(Runtime) {
    Runtime.evaluate({ expression: 'document.location.href' }).then((result) => {
      if (this.executionFinished) { return; }
      let locationUrl = result.result.value;
      if (locationUrl.indexOf('https://login.aliexpress.com') > -1) {
        const js = `document.getElementById('fm-login-id').value = 'Dequed1968@superrito.com';
        document.getElementById('fm-login-password').value = 'Dequed';
        var event = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        document.getElementById('fm-login-submit').dispatchEvent(event);`;
        Runtime.evaluate({ expression: js, contextId: this.loginIframeContextId }).catch((err) => {
          if (this.executionFinished) { return; }
          log('Error visiting Aliexpress: ' + err.message);
          this.body = 'Error on browser';
          this.response = { status: 999 };
          this.stats.browserBodyReady(this.appName);
          this.finishExecution();
        });
      } else {
        Runtime.evaluate({ expression: 'document.location.href' }).then((result) => {
          if (this.executionFinished || null === this.response) { return; }
          this.response.url = result.result.value;
        });
        this.evaluateBody(Runtime);
      }
    });
  }

}

module.exports = { ChromeAliexpress };
