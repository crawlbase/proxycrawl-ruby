const { Chrome, Firefox, FirefoxLinkedIn } = require('./index.js');
const chromePath = process.platform === 'darwin' ? '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome' : '/usr/bin/google-chrome';
const firefoxPath = process.platform === 'darwin' ? '/Applications/Firefox.app/Contents/MacOS/firefox' : '/usr/bin/firefox';
let errors = 0;

const statsMock = {
  browserNewRequestStart: () => {},
  browserNewRequest: () => {},
  browserResponseReady: () => {},
  browserBodyReady: () => {},
  browserRemoveActiveInstance: () => {},
  activeIds: []
};

function launchChrome() {
  const instance = new Chrome({
    stats: statsMock,
    appPath: chromePath,
    url: 'https://wedibit.com/pro-tester',
    proxy: '167.88.10.42:8012'
  });

  return instance.start().then((result) => {
    if (result.response.status !== 200) {
      console.error('Invalid response: ', result.response.status);
      console.log(result.body);
      errors++;
    }
  });
}

function launchFirefox() {
  const instance = new Firefox({
    stats: statsMock,
    appPath: firefoxPath,
    url: 'https://wedibit.com/pro-tester',
    proxy: '167.88.10.42:8012'
  });

  return instance.start().then((result) => {
    if (result.response.status !== 200) {
      console.error('Invalid response: ', result.response.status);
      console.log(result.body);
      errors++;
    }
  });
}

function launchFirefoxLinkedIn() {
  const instance = new FirefoxLinkedIn({
    stats: statsMock,
    appPath: firefoxPath,
    url: 'https://www.linkedin.com/in/williamhgates/',
    proxy: '167.88.10.42:8012'
  });

  return instance.start().then((result) => {
    if (result.response.status !== 200) {
      console.error('Invalid response: ', result.response.status);
      console.log(result.body);
      errors++;
    }
  });
}

const promises = [];
for (let i = 0; i < 1; i++) {
  promises.push(launchChrome());
  promises.push(launchFirefox());
  promises.push(launchFirefoxLinkedIn());
}

Promise.all(promises).then(() => {
  if (errors === 0) {
    console.log('Test succeeded');
  }
});
