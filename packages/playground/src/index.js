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

  const transport = device.createSendTransport(
    {
      id,
      iceParameters,
      iceCandidates,
      dtlsParameters,
      sctpParameters
    });

  console.log('transport', transport);
}

init();
