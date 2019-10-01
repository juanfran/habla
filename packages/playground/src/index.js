import * as mediasoup from 'mediasoup-client';
import signaling from './signaling';

async function init() {
  const ws = new WebSocket('ws://127.0.0.1:7001');
  ws.onopen = () => {
    signaling.init(ws);
    mainProgram();
  };
}

async function mainProgram() {
  const routerRtpCapabilities = await signaling.request('rtpCapabilities');

  // A device represents an endpoint that connects to a mediasoup Router to send and/or receive media.
  const device = new mediasoup.Device();

  await device.load({
    routerRtpCapabilities
  });

  // create server-side transport for sending/receiving media
  const {
    id,
    iceParameters,
    iceCandidates,
    dtlsParameters,
    sctpParameters
  } = await signaling.request(
    'createTransport',
    {
      sctpCapabilities : device.sctpCapabilities
    });

  console.log(id);

  // local transport
  const sendTransport = device.createSendTransport(
    {
      id,
      iceParameters,
      iceCandidates,
      dtlsParameters,
      sctpParameters
    });

  console.log('1');

  // Set transport "connect" event handler.
  sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) =>
  {
    console.log('2');
    // Here we must communicate our local parameters to our remote transport.
    try {
      await signaling.request(
        'transport-connect',
        {
          transportId: sendTransport.id,
          dtlsParameters
        });
      console.log('bien?');

      // Done in the server, tell our transport.
      callback();
    } catch (error) {
      // Something was wrong in server side.
      errback(error);
    }
  });
}

init();
