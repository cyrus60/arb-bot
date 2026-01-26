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

  // retrieves event data of all current live events on bet105
  getLiveEventData() {
    return new Promise((resolve) => {
      const event = "live.main.VEZBZ1VFbE9Ua0ZEVEVVZ1MwbENUQT09.eventData";

      this.socket.emit("subscribe", [{
        roomName: event
      }]);

      const handler = (binaryData) => {
        const data = this.decompressData(binaryData);

        // after receiving full live state, unsubscribe and remove listener
        if (!data.isDiff) {
          this.socket.emit("unsubscribe", [{
            roomName: event
          }]);
          this.socket.off(event, handler);

          resolve(data);
        } 
      };

      this.socket.on(event, handler);
    });
  }

  // extracts odds data from given state
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

  // returns live events of given league
  fetchEventsByLeague(eventData, targetLeagueId) {
    const events = [];
    const sports = eventData.payload.s;

    for (const [sportId, categories] of Object.entries(sports)) {
      for (const [categoryId, leagues] of Object.entries(categories)) {
        for (const [leagueId, leagueEvents] of Object.entries(leagues)) {
        
          if (leagueId === targetLeagueId) {
            // Found the league - extract events
            for (const [eventId, eventData] of Object.entries(leagueEvents)) {
              events.push({
                eventId
              });
            }
          }
        }
      }
    }

    return events;
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