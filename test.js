const { Chrome } = require('./index.js');
const testConfig = {
  saveBodyToFile: true,
  filename: 'test.html',
  logStatus: false,
  logBody: false,
  logHeaders: false,
};
const chromeParams = {
  appPath: process.platform === 'darwin' ? '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome' : '/usr/bin/google-chrome',
  noHeadless: 'true',
  // captureIframes: 'true',
  enableImages: 'true',
  skipBlocks: 'true',
  // enableDownloads: 'true',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.2 Safari/605.1.15',
  // killTimeout: 600000,
  // cookie: 'locale=en_GB',
  // screenshot: 'true',
  url: 'https://www.amazon.com',
//   evaluateJavascript: `
// await _delay(5000);
// const element = document.getElementById('nav-global-location-popover-link');
// if (element !== null) {
//   element.click();
//   await _delay(5000);
//   var a = document.createElement('div');
//   a.id = 'use-this';
//   P.now('GLUXWidget').execute((b) => {
//     a.innerText = b.CSRF_TOKEN + '||' + document.cookie;
//     document.body.append(a);
//     _resolve();
//   });
// } else {
//   _reject('Elements not found');
// }
//     `,
  // bodyWait: 1000,
  // device: 'mobile',
  // ajaxWait: 'true',
  // proxy: 'proxy.proxycrawl.com:9000',
};

chromeParams.stats = {
  browserNewRequestStart: () => {},
  browserNewRequest: () => {},
  browserResponseReady: () => {},
  browserBodyReady: () => {},
  browserRemoveActiveInstance: () => {},
  activeIds: []
};

function launchChrome() {
  console.log('Launching Chrome');
  const instance = new Chrome(chromeParams);

  return instance.start().then((result) => {
    if (testConfig.logBody) {
      console.log(result.body);
    }
    if (testConfig.logHeaders) {
      console.log(result.response.headers);
    }
    if (testConfig.logStatus) {
      console.log(`Status: ${result.response.status}`);
    }
    if (testConfig.saveBodyToFile) {
      const fs = require('fs');
      fs.writeFileSync(testConfig.filename, result.body);
    }
    if (result.response.status !== 200) {
      console.error('Invalid response: ', result.response.status);
      if (result.response.status === 301) {
        console.log('Status 301', result.response.headers.location);
      }
    }
  });
}

launchChrome().then(() => console.log('Test finished'));
