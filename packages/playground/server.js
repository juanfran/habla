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

function ab2str(buf) {
  return Buffer.from(buf).toString('utf8');
}

const port = 7001;
const transports = {};
const producers = {};

const app = uWS./*SSL*/App()
.ws('/*', {
  /* Options */
  compression: 0,
  maxPayloadLength: 16 * 1024 * 1024,
  idleTimeout: Infinity,
  open: (ws, req) => {
    console.log('A WebSocket connected via URL: ' + req.getUrl() + '!');
  },
  message: async (ws, message, isBinary) => {
    const msg = JSON.parse(ab2str(message));

    if (msg.command === 'rtpCapabilities') {
      ws.send(JSON.stringify(mediasoupRouter.rtpCapabilities), isBinary);
    } else if (msg.command === 'createTransport') {
      const sctpCapabilities = msg.options;
      const webRtcTransportOptions =
      {
        listenIps : [
          // local & public ips
          { ip: '0.0.0.0', announcedIp: null }
        ],
        initialAvailableOutgoingBitrate : 1000000,
        minimumAvailableOutgoingBitrate : 600000,
        maxSctpMessageSize              : 262144,
        // Additional options that are not part of WebRtcTransportOptions.
        maxIncomingBitrate              : 1500000,
        enableSctp     : Boolean(sctpCapabilities),
        numSctpStreams : (sctpCapabilities || {}).numStreams
      };

      const transport = await mediasoupRouter.createWebRtcTransport(
        webRtcTransportOptions);

      transports[transport.id] = transport;

      ws.send(JSON.stringify({
        id             : transport.id,
        iceParameters  : transport.iceParameters,
        iceCandidates  : transport.iceCandidates,
        dtlsParameters : transport.dtlsParameters,
        sctpParameters : transport.sctpParameters
      }));
    } else if (msg.command === 'transport-connect') {
      const { transportId, dtlsParameters } = msg.options;
      const transport = transports[transportId];

      if (!transport)
        throw new Error(`transport with id "${transportId}" not found`);

      await transport.connect({ dtlsParameters });

      ws.send(JSON.stringify({
        'transport-connect': 'ok'
      }));
    } else if (msg.command === 'produce') {
      const { transportId, kind, rtpParameters } = msg.options;
      let { appData } = msg.options;
      const transport = transports[transportId];
      appData = { ...appData, peerId: '1234' };
      const producer =
        await transport.produce({ kind, rtpParameters, appData });

      // Store the Producer into the protoo Peer data Object.
      producers[producer.id] = producer;

      // Set Producer events.
      producer.on('score', (score) => {
        peer.notify('producerScore', { producerId: producer.id, score })
          .catch(() => {});
      });

      producer.on('videoorientationchange', (videoOrientation) => {
        console.log(
          'producer "videoorientationchange" event [producerId:%s, videoOrientation:%o]',
          producer.id, videoOrientation);
      });

      // Optimization: Create a server-side Consumer for each Peer.

      // Add into the audioLevelObserver.
      if (producer.kind === 'audio') {
        this._audioLevelObserver.addProducer({ producerId: producer.id })
          .catch(() => {});
      }

      ws.send(JSON.stringify({
        produce: 'ok',
        id: producer.id
      }));
    } else if (msg.command === 'producedata') {
      // todo producedata
      ws.send(JSON.stringify({
        'producedata': 'ok'
      }));
    }
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
