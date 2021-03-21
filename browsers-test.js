const { Chrome, ChromeLinkedIn, Firefox, FirefoxLinkedIn } = require('./index.js');
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
  console.log('Launching Chrome');
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

function launchChromeLinkedIn() {
  console.log('Launching Chrome LinkedIn');
  const instance = new ChromeLinkedIn({
    stats: statsMock,
    appPath: chromePath,
    url: 'https://www.linkedin.com/in/williamhgates/',
    proxy: '167.88.10.42:8012',
    linkedInJoinWall: 'v=2&AQHglkQ3zcdUfQAAAWBujZJkBAnbPC66mS8a1vwO808N2_UAfaFc5ttUSGpYizHx5jOcPtsc4C_zNeVA5HcTIlTPd-8doo0Q0Vr2EtJEFkEZzQX3A5c0arb6ZPgi9H8fo0Z9IevMcDE3MadCS5A4lREO4w_r31Yw_X4a2X18VozKvQE1yBNwMw'
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
  console.log('Launching Firefox');
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
  console.log('Launching Firefox LinkedIn');
  const instance = new FirefoxLinkedIn({
    stats: statsMock,
    appPath: firefoxPath,
    url: 'https://www.linkedin.com/in/williamhgates/',
    proxy: '167.88.10.42:8012',
    linkedInJoinWall: 'v=2&AQHglkQ3zcdUfQAAAWBujZJkBAnbPC66mS8a1vwO808N2_UAfaFc5ttUSGpYizHx5jOcPtsc4C_zNeVA5HcTIlTPd-8doo0Q0Vr2EtJEFkEZzQX3A5c0arb6ZPgi9H8fo0Z9IevMcDE3MadCS5A4lREO4w_r31Yw_X4a2X18VozKvQE1yBNwMw'
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
  promises.push(launchChromeAliexpress());
}

Promise.all(promises).then(() => {
  if (errors === 0) {
    console.log('Test succeeded');
  }
});
