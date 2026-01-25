const io = require('socket.io-client');
const pako = require('pako');


class Bet105Client {
  constructor() {
    this.socket = null;

    // State management
    this.eventStates = new Map();      // Full state for each subscribed event
    this.eventCallbacks = new Map();   // Callbacks for odds updates
  }

  // connect to bet105 websocket 
  connect() {
    this.socket = io('https://pandora.ganchrow.com', {
      path: '/socket.io',
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log("Connected to Bet105")
    });
  }

  // test function for now 
  subscribeToLiveSports() {
    const event = "live.main.VEZBZ1VFbE9Ua0ZEVEVVZ1MwbENUQT09.eventCoefficients.177958511";

    this.socket.emit("subscribe", [{
      roomName: event
    }]);

    this.socket.on(event, (binaryData) => {
      const data = this.decompressData(binaryData);

      console.log(JSON.stringify(data));
    });
  }

  // extracts odds data from state
  extractOdds(eventId, state) {

  }

  // 
  applyPatch(state, patch) {

  }

  // updates state for given channel 
  applyUpdate(channel, data) {
    if (data.isDiff) {


    } else {
      this.eventStates.set(channel, data);
      return data;
    }
  }

  // subscribe to specific live sporting event 
  subscribeToEvent(eventId, callback) {
    const channel = `live.main.VEZBZ1VFbE9Ua0ZEVEVVZ1MwbENUQT09.eventCoefficients.${eventId}`;

    this.eventCallbacks.set(channel, callback);

    // Subscribe
    this.socket.emit('subscribe', [{ roomName: channel }]);

    // Handle incoming data
    this.socket.on(channel, (binaryData) => {
      const data = this.decompressData(binaryData);
      if (!data) return;

      // Apply update (full snapshot or diff)
      const state = this.applyUpdate(channel, data);
      
      // Extract odds and call callback
      const odds = this.extractOdds(eventId, state);
      if (odds && callback) {
        callback(odds);
      }
    });
  }

  // decompresses raw binary data received from websocket connection
  decompressData(binaryData) {
    try {
      const rawBytes = pako.ungzip(binaryData);

      const json = Buffer.from(rawBytes).toString("utf8");

      return JSON.parse(json)

    } catch (e) {
      console.log("Error: ", e)
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

}

module.exports = Bet105Client;
