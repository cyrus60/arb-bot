const Bet105Client = require('./clients/bet105');
const KalshiClient = require('./clients/kalshi');
const EventMatcher = require('./engine/eventMatcher');
const ArbDetector = require('./engine/arbDetector');
const sleep = require('sleep-promise');
require('dotenv').config();

const kalshiAPIKey = process.env.KALSHI_API_KEY;
const pathToPrivKey = process.env.KALSHI_KEY_PATH;

async function main() {
    //instantiate clients
    const bet105 = new Bet105Client();
    const kalshi = new KalshiClient(kalshiAPIKey, pathToPrivKey);

    const matcher = new EventMatcher(bet105, kalshi);
    const finder =  new ArbDetector(matcher);

    // connect to websockets
    await bet105.connect();
    await kalshi.connect();

    // bet105 setup
    await bet105.loadLeagues();

    const eventData = await bet105.getLiveEventData();

    const leagueId = bet105.getLeagueId('NBA');

    // kalshi setup
    kalshi.addLeague('KXNBAGAME')

    // empty susbcribe callback just to fetch markets for buildEvents function
    kalshi.subscribe(() => {});
    
    // wait to collect markets
    await sleep(20000);

    // fetch events from both clients 
    const liveEvents = bet105.fetchEventsByLeague(eventData, leagueId);
    const kalshiMarkets = kalshi.getMarkets();

    // build association of kalshi and bet105 events 
    matcher.buildEvents(liveEvents, kalshiMarkets, 'NBA');

    // loop through live bet105 events and subscribe to each 
    for (const event of liveEvents) {
        // callback function for received update of each bet105Event
        bet105.subscribeToEvent(event.eventId, (odds) => {
            // console.log(`BET105: ${event.awayTeam} @ ${event.homeTeam}:`, odds );
            const gameKey = matcher.getGameKey(event.eventId);
            
            if (gameKey) {
                console.log(matcher.getGameInfo(gameKey));
                console.log();
            }
        });
    }

    // subscribe to kalshi tickers 
    kalshi.subscribe((update) => {
        // console.log(`KALSHI: ${update.ticker}: ${update.price}`)
        const gameKey = matcher.getGameKeyFromTicker(update.ticker);

        if (gameKey) {
            console.log(matcher.getGameInfo(gameKey));
            console.log();
        }
    })
}

main();
