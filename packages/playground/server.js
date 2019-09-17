const mediasoup = require("mediasoup");
let mediasoupWorker;
let mediasoupRouter;

async function init() {
  mediasoupWorker = await mediasoup.createWorker(
    {
      logLevel            : "warn"
    });

  mediasoupRouter = await mediasoupWorker.createRouter({
    mediaCodecs :
      [
        {
          kind      : 'audio',
          mimeType  : 'audio/opus',
          clockRate : 48000,
          channels  : 2
        },
        {
          kind       : 'video',
          mimeType   : 'video/VP8',
          clockRate  : 90000,
          parameters :
          {
            'x-google-start-bitrate' : 1000
          }
        },
        {
          kind       : 'video',
          mimeType   : 'video/VP9',
          clockRate  : 90000,
          parameters :
          {
            'profile-id'             : 2,
            'x-google-start-bitrate' : 1000
          }
        },
        {
          kind       : 'video',
          mimeType   : 'video/h264',
          clockRate  : 90000,
          parameters :
          {
            'packetization-mode'      : 1,
            'profile-level-id'        : '4d0032',
            'level-asymmetry-allowed' : 1,
            'x-google-start-bitrate'  : 1000
          }
        },
        {
          kind       : 'video',
          mimeType   : 'video/h264',
          clockRate  : 90000,
          parameters :
          {
            'packetization-mode'      : 1,
            'profile-level-id'        : '42e01f',
            'level-asymmetry-allowed' : 1,
            'x-google-start-bitrate'  : 1000
          }
        }
      ]
  });

  // console.log(mediasoupRouter.rtpCapabilities);
}

init();

const uWS = require('uWebSockets.js');

/* require('uWebSockets.js').App({}).ws('/*', {
  message: (ws, message, isBinary) => {
    console.log('xxx');
    let ok = ws.send(message, isBinary);
  }
}).any('/*', (res, req) => {
  console.log('yyy');
  res.end('Nothing to see here!');
}).listen(9001, (listenSocket) => {
  if (listenSocket) {
    console.log('Listening to port 9001');
  }
}); */


const port = 7001;

const app = uWS./*SSL*/App().ws('/*', {
  /* Options */
  compression: 0,
  maxPayloadLength: 16 * 1024 * 1024,
  idleTimeout: Infinity,
  /* Handlers */
  open: (ws, req) => {
    console.log('A WebSocket connected via URL: ' + req.getUrl() + '!');
  },
  message: (ws, message, isBinary) => {
    /* Ok is false if backpressure was built up, wait for drain */
    console.log('eeeee');
    let ok = ws.send(JSON.stringify(mediasoupRouter.rtpCapabilities), isBinary);
  },
  drain: (ws) => {
    console.log('WebSocket backpressure: ' + ws.getBufferedAmount());
  },
  close: (ws, code, message) => {
    console.log('WebSocket closed');
  }
}).any('/*', (res, req) => {
  res.end('Nothing to see here!');
}).listen(port, (token) => {
  if (token) {
    console.log('Listening to port ' + port);
  } else {
    console.log('Failed to listen to port ' + port);
  }
});
