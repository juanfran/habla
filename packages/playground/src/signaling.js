var ws;
var currentPromiseResolver;

export default {
  init: (newWs) => {
    ws = newWs;

    ws.onmessage = (message) => {
      currentPromiseResolver(JSON.parse(message.data));
    };
  },
  request: (command, options = {}) => {
    ws.send(JSON.stringify({command, options}));

    return new Promise((resolve) => {
      currentPromiseResolver = resolve;
    });
  }
}
