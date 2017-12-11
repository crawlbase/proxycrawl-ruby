function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isLinkedIn(url) {
  return url.indexOf('https://www.linkedin.com') > -1;
}

function checkPort(port) {
  const { Socket } = require('net');
  var promiseResolve;
  var promiseReject;
  var client;
  var inUse = true;

  function cleanUp() {
    if (client) {
      client.removeAllListeners('connect');
      client.removeAllListeners('error');
      client.end();
      client.destroy();
      client.unref();
    }
  }

  function onConnectCb() {
    promiseResolve(inUse);
    cleanUp();
  }

  function onErrorCb(err) {
    if (err.code !== 'ECONNREFUSED') {
      promiseReject(err);
    } else {
      inUse = false;
      promiseResolve(inUse);
    }
    cleanUp();
  }

  client = new Socket();
  client.once('connect', onConnectCb);
  client.once('error', onErrorCb);
  client.connect({ port: port, host: '127.0.0.1' });

  return new Promise((resolve, reject) => {
    promiseResolve = resolve;
    promiseReject = reject;
  });
}

module.exports = { getRandomInt, checkPort, isLinkedIn };
