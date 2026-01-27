const io = require('socket.io-client');
const pako = require('pako');

class Bet105Client {
  constructor() {
    this.socket = null;

    // cache for league lookups
    this.leagues = new Map();

    // State management
    this.eventStates = new Map();      // Full state for each subscribed event
    this.eventCallbacks = new Map();   // Callbacks for odds updates
  }

  // connect to bet105 websocket 
  async connect() {
    return new Promise((resolve) => {
      this.socket = io('https://pandora.ganchrow.com', {
        path: '/socket.io',
        transports: ['websocket'],
      });

      this.socket.on('connect', () => {
        console.log("Connected to Bet105");
        resolve();  // Signal that connection is ready
      });
    });
  }

  // retrieves event data of all current live events on bet105
  async getLiveEventData() {
    return new Promise((resolve) => {
      const event = "live.main.VEZBZ1VFbE9Ua0ZEVEVVZ1MwbENUQT09.eventData";

      this.socket.emit("subscribe", [{
        roomName: event
      }]);

      const handler = (binaryData) => {
        const data = this.decompressData(binaryData);

        // after receiving full live state, unsubscribe and remove listener
        if (!data.isDiff) {
          // unsubscribing from live event socket at this point causes issues, fix later

          // this.socket.emit("unsubscribe", [{
          //   roomName: event
          // }]);
          // this.socket.off(event, handler);

          resolve(data);
        } 
      };

      this.socket.on(event, handler);
    });
  }

  // extracts odds data from given state
  extractOdds(eventId, state) {
    if (!state || !state.payload) {
      return null;
    }

    try {
      const mlMarket = state.payload.c?.m?.['3'];
      const matchData = state.payload.m;

      if (!mlMarket?.o) return null;

      return {
        eventId,
        timestamp: state.ti?.t || Date.now(),
        
        // Moneyline odds
        odds: {
          home: mlMarket.o['1'],
          away: mlMarket.o['2']
        },

        // Match info (optional but useful)
        match: matchData ? {
          score: {
            home: matchData.m?.[0],
            away: matchData.m?.[1]
          },
          period: matchData.p,
          timeRemaining: matchData.t
        } : null
      };
    } catch (err) {
      console.error('Error extracting odds:', err);
      return null;
    }
  }

  // patches parent state with updated state based on op from websocket
  applyPatch(state, patch) {
    // splits payload update into its different parts
    const { op, path, value } = patch;
    const keys = path.split('/').filter(k => k);

    if (op === 'replace' || op === 'add') {
      let obj = state;
    
      // update state with new patch data
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }

      // set state value to updated value
      obj[keys[keys.length - 1]] = value;

    } else if (op === 'remove') {
      let obj = state;

      for (let i = 0; i < keys.length; i++) {
        obj = obj[keys[i]];

        if (!obj) {
          return state;
        }
      }
      delete obj[keys[keys.length - 1]];
    }

    return state;
  }

  // updates state for given channel 
  applyUpdate(channel, data) {
    // if data isDiff, patch state with odds update
    if (data.isDiff) {

      // retrieve existing state
      let state = (this.eventStates.get(channel));

      if (!state) {
        console.warn("Recieved diff but no base state.")
        return null;
      }

      // apply each patch from the payload to the retrieved state
      for (const patch of data.payload) {
        state = this.applyPatch(state, patch);
      }

      // update event state in cache 
      this.eventStates.set(channel, state);
      
      return { payload: state, ti: data.ti }

    } else { // if isDiff is false, store full snapshot 
      this.eventStates.set(channel, data.payload);
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
      if (odds) {
        callback(odds);
      }
    });
  }

  // returns live events of given league
  fetchEventsByLeague(eventData, targetLeagueId) {
    const events = [];
    const sports = eventData.payload.s;

    // loop through eventData -- get to league events
    for (const [sportId, categories] of Object.entries(sports)) {
      for (const [categoryId, leagues] of Object.entries(categories)) {
        for (const [leagueId, leagueEvents] of Object.entries(leagues)) {
        
          if (leagueId === targetLeagueId) {
            // found league - extract events
            for (const [eventId, eventData] of Object.entries(leagueEvents)) {
              events.push({
                eventId,
                homeTeam: eventData[0][0],  // Full name
                awayTeam: eventData[1][0],  // Full name
                startTime: eventData[2],
                status: eventData[12]
              });
            }
          }
        }
      }
    }

    return events;
  }

  async loadLeagues() {
    return new Promise((resolve) => {
      const channel = 'live.leaguesDiff';

      this.socket.emit('subscribe', [{roomName: channel}]);

      const handler = (binaryData) => {
        const data = this.decompressData(binaryData);

        if (!data.isDiff) {
          this.leagues = data.payload;
          resolve(data.payload);  
        }
      }
      
      this.socket.on(channel, handler);
    }); 
  }

  // function to lookup leagueIds
  getLeagueId(leagueName) {
    // loop through league cache and return leagueId of league leagueName 
    for (const [id, league] of Object.entries(this.leagues)) {
      if (league.n.toLowerCase().includes(leagueName.toLowerCase())) {
        return id;
      }
    }
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