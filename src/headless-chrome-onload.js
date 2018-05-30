/* global navigator, window, document, MouseEvent */
// overwrite the `languages` property to use a custom getter
Object.defineProperty(navigator, 'languages', {
  get: function() {
    return ['en-US', 'en'];
  }
});

// overwrite the `plugins` property to use a custom getter
Object.defineProperty(navigator, 'plugins', {
  get: function() {
    // this just needs to have `length > 0`, but we could mock the plugins too
    return [1, 2, 3, 4, 5];
  }
});

window.innerWidth = 1920;
window.innerHeight = 1130;
window.outerWidth = 1920;
window.outerHeight = 1210;

window._delay = async function(delayTime) {
  return new Promise((resolve) => setTimeout(() => resolve(), delayTime));
};
window._scrollBottom = function() {
  window.scrollTo(0, document.body.scrollHeight);
};
window._simulateClick = function(element) {
  element.dispatchEvent(new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: true
  }));
};
