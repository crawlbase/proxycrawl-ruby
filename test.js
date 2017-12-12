const { Chrome } = require('./index.js');
const chromePath = process.platform === 'darwin' ? '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome' : '/usr/bin/google-chrome';
let errors = 0;

function launchChrome() {
  const chromeInstance = new Chrome({
    appPath: chromePath,
    url: 'https://requestb.in/1gqqjg51',
    proxy: '167.88.10.42:8012'
  });

  return chromeInstance.start().then((result) => {
    if (result.response.status !== 200) {
      console.error('Invalid response: ', result.response.status);
      console.log(result.body);
      errors++;
    }
  });
}

const promises = [];
for (let i = 0; i < 50; i++) {
  promises.push(launchChrome());
}

Promise.all(promises).then(() => {
  if (errors === 0) {
    console.log('Test succeeded');
  }
});
