const redis = require('redis');
const client = redis.createClient();

client.on('error', (err) => console.log('Redis error: ' + err));

function chromeNewRequestStart() {
  client.incr('browser-requests-last-second');
}

function chromeNewRequest() {
  client.incr('chrome-active-instances');
  client.incr('chrome-waiting-response');
  client.incr('chrome-waiting-body');
}

function chromeResponseReady() {
  client.decr('chrome-waiting-response');
}

function chromeBodyReady() {
  client.decr('chrome-waiting-body');
}

function chromeRemoveActiveInstance() {
  client.decr('chrome-active-instances', (err, reply) => {
    if (reply.toString() * 1 === 0) {
      client.set('chrome-waiting-body', 0);
      client.set('chrome-waiting-response', 0);
    }
  });
}

module.exports = {
  chromeNewRequestStart,
  chromeNewRequest,
  chromeResponseReady,
  chromeBodyReady,
  chromeRemoveActiveInstance,
  activeIds: []
};
