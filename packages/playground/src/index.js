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

  // Set transport "connect" event handler.
  sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) =>
  {
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

  // Set transport "produce" event handler.
  sendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
    console.log('produce', appData);
    // Here we must communicate our local parameters to our remote transport.
    try {
      const { id } = await signaling.request(
        'produce',
        {
          transportId : sendTransport.id,
          kind,
          rtpParameters,
          appData
        });

      // Done in the server, pass the response to our transport.
      callback({ id });
    } catch (error) {
      // Something was wrong in server side.
      errback(error);
    }
  });

  // Set transport "producedata" event handler.
  sendTransport.on('producedata', async ({ sctpStreamParameters, label, protocol, appData }, callback, errback) => {
    console.log('producedata');
    // Here we must communicate our local parameters to our remote transport.
    try {
      const { id } = await signaling.request(
        'produceData',
        {
          transportId : sendTransport.id,
          sctpStreamParameters,
          label,
          protocol,
          appData
        });

      // Done in the server, pass the response to our transport.
      callback({ id });
    } catch (error) {
      // Something was wrong in server side.
      errback(error);
    }
  });

  // al usar sendTransport hace el on.connect

  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  const webcamTrack = stream.getVideoTracks()[0];
  const webcamProducer = await sendTransport.produce({ track: webcamTrack });
/*   setTimeout(async () => {
    const dataProducer = await sendTransport.produceData({ ordered: true, label: 'foo' });
    console.log('xxx');
  }, 4000); */
}

init();
