import * as mediasoup from 'mediasoup-client';

async function init() {
  const ws = new WebSocket('ws://127.0.0.1:7001');

  const start = new Date().getTime();

  ws.onopen = () => {
    console.log("onopen of", "in", (new Date().getTime() - start), "ms");
    ws.send('eeii');
  };

  ws.onmessage = async (message) => {
    console.log(message);

    const device = new mediasoup.Device();

    await device.load({
      routerRtpCapabilities: JSON.parse(message.data)
    });

    const transport = device.createSendTransport({
      id: "test",
      iceParameters  : {},
      iceCandidates  : [],
      dtlsParameters : {
        fingerprints: [
          'sha-1'
        ]
      },
      sctpParameters : {}
    });

    console.log(transport);
  };
}

init();
