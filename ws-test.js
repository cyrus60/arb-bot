const io = require('socket.io-client');
const pako = require('pako');

// hardcoded event ID for now
const event = "prematch.main.VEZBZ1VFbE9Ua0ZEVEVVZ1MwbENUQT09.eventCoefficients.174469741"

// Connect to Bet105 WS using socket.io protocol
const socket = io('https://pandora.ganchrow.com', {
  path: '/socket.io',
  transports: ['websocket'],
});


socket.on('connect', () => {
  console.log('Connected to WS');

  socket.emit("subscribe", [
    { roomName: "prematch.sportsDiff" },
    {
      roomName: "prematch.leaguesDiff",
      params: { sportId: 3 }
    }
  ]);
});

// accounting for pings to maintain socket subscription // doesn't seem needed
// socket.on('ping', () => socket.emit('pong'));

// load event information to build event registry
socket.on("prematch.sportsDiff", (data) => {
  try {
    const rawBytes = pako.ungzip(data);

    const json = Buffer.from(rawBytes).toString("utf8");

    const obj = JSON.parse(json);

    console.log(Object.keys(obj.payload));

    // console.log(obj.payload[3].mo)
  } catch (e) {
    console.log("Error: ", e)
  }
});


socket.on("prematch.leaguesDiff", (data) => {
  try {
    const rawBytes = pako.ungzip(data);

    const json = Buffer.from(rawBytes).toString("utf8");

    const obj = JSON.parse(json);

  } catch (e) {
    console.log("Error: ", e)
  }
})

// Handle the odds event
// socket.on(event, (binaryData) => {
//   try {

//     const rawBytes = pako.ungzip(binaryData);

//     // 2. Convert bytes → UTF-8 string
//     const jsonText = Buffer.from(rawBytes).toString("utf8");

//     // 3. Parse JSON
//     const json = JSON.parse(jsonText);

//     const mlMarket = json.payload.c.m?.['3'];
//     if (!mlMarket) {
//       console.log("No ml")
//     }

//     const odds = mlMarket.o;

//     const home = odds['1'];
//     const away = odds['2'];

//     console.log("Home odds: " + home);
//     console.log("Away odds: " + away);

//   } catch (err) {
//     console.error('Error decoding odds:', err);
//   }
// });

socket.on('disconnect', () => {
  console.log('Disconnected from WS');
});
