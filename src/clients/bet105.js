const io = require('socket.io-client');
const pako = require('pako');

class Bet105Client {
  constructor() {
    this.socket = null;

    // cache for league lookup of all leagues
    this.leagues = new Map();

    // state management
    this.eventStates = new Map();      // full state for each subscribed event

    // array holding events to be subscribed to 
    this.events = [];

    // keeps track of which leagues are being monitored
    this.selectedLeagues = [];

    // set of all subscribed eventIds - used to ensure events aren't subscribed to twice
    this.subscribedEvents = new Set();

    this.eventData = null;
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

  // preforms all operations necesarry before subscribing to events
  async start() {
    await this.connect();
    
    // caches league information of all live leagues
    await this.loadLeagues();
  }

  // retrieves event data of all current live events on bet105
  async getLiveEventData() {
      // Return cached if exists
      if (this.eventData) {
          return this.eventData;
      }

      return new Promise((resolve) => {
          const event = "live.main.VEZBZ1VFbE9Ua0ZEVEVVZ1MwbENUQT09.eventData";

          this.socket.emit("subscribe", [{ roomName: event }]);

          const handler = (binaryData) => {
              const data = this.decompressData(binaryData);

              if (!data.isDiff) {
                  this.eventData = data;
                  this.socket.off(event, handler);
                  resolve(data);
              }
          };

          this.socket.on(event, handler);
      });
  }

  // loads and caches all live league data at start
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
    // loop through league cache and return leagueId of leagueName 
    for (const [id, league] of Object.entries(this.leagues)) {
      if (league.n.toLowerCase().includes(leagueName.toLowerCase())) {
        return id;
      }
    }
  }

  // adds events of given league to event cache 
  async addLeague(league) {
    const leagueId = this.getLeagueId(league);

    // keep track of leagues being monitored
    this.selectedLeagues.push(league);

    // adds events from given league to event cache
    await this.fetchEventsByLeague(leagueId);
  }

  // extracts odds data from given state
  extractOdds(eventId, state) {
    if (!state || !state.payload) {
      return null;
    }

    try {
      // store ml market data from payload
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

  // subscribes to each event in given events array
  subscribeToEvents(callback) {
    // loops through all events 
    for (const event of this.events) {

      // verifies event hasn't already been subscribed to 
      if (!this.subscribedEvents.has(event.eventId)) {
        this.subscribedEvents.add(event.eventId);

        // calls main subscribe function with callback
        this.subscribeToEvent(event, callback);
      }
    }
  }

  // subscribe to specific live sporting event 
  subscribeToEvent(event, callback) {
    const channel = `live.main.VEZBZ1VFbE9Ua0ZEVEVVZ1MwbENUQT09.eventCoefficients.${event.eventId}`;

    this.socket.emit('subscribe', [{ roomName: channel }]);

    // handler function for all messages through subscribed channel
    const handler = (binaryData) => {
      const data = this.decompressData(binaryData);
      if (!data) return;

      // applyUpdate stores full snapshot if message !isDiff, updates state otherwise
      const state = this.applyUpdate(channel, data);
      
      // extract odds from state and call callback on data
      const odds = this.extractOdds(event.eventId, state);
      if (odds) {
        callback(event, odds);
      }
    };

    // call handler on any message for channel
    this.socket.on(channel, handler);
  }

  // called periodically to cache any events that have started since program started running
  async refreshEvents() {
    // reset eventData cache to null
    this.eventData = null;

    // remove listeners from liveEvent channel
    const event = "live.main.VEZBZ1VFbE9Ua0ZEVEVVZ1MwbENUQT09.eventData";
    this.socket.removeAllListeners(event);

    // cache new liveEventData
    await this.getLiveEventData();

    // adds all live events of selected leagues to event cache
    for (const league of this.selectedLeagues) {
      await this.fetchEventsByLeague(this.getLeagueId(league));
    }
  }

  getEvents() {
    return this.events;
  }

  // returns live events of given league
  async fetchEventsByLeague(targetLeagueId) {
    const eventData = await this.getLiveEventData();
    const sports = eventData.payload.s;

    // loop through eventData payload -- get to league events
    for (const [sportId, categories] of Object.entries(sports)) {
      for (const [categoryId, leagues] of Object.entries(categories)) {
        for (const [leagueId, leagueEvents] of Object.entries(leagues)) {
        
          if (leagueId === targetLeagueId) {
            // found league - extract eventData for all events 
            for (const [eventId, eventData] of Object.entries(leagueEvents)) {
              // check if event is already in cache, push event to cache if not
              if (!this.events.some(e => e.eventId == eventId)) {
                  this.events.push({
                  eventId,
                  homeTeam: eventData[0][0],  // full home team name
                  awayTeam: eventData[1][0],  // full away team name 
                  startTime: eventData[2],
                  status: eventData[12]
                });  
              }
            }
          }
        }
      }
    }
  }

  // decompresses raw binary data received from websocket 
  decompressData(binaryData) {
    try {
      const rawBytes = pako.ungzip(binaryData);

      const json = Buffer.from(rawBytes).toString("utf8");

      return JSON.parse(json)

    } catch (e) {
      console.log("Error: ", e)
    }
  }

  // havent tested - not sure if needed
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

}

module.exports = Bet105Client;