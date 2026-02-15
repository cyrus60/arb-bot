const Bet105Client = require('./clients/bet105');
const KalshiClient = require('./clients/kalshi');
const EventMatcher = require('./engine/eventMatcher');
const ArbDetector = require('./engine/arbDetector');
// const ArbDetector =  require('./engine/arbDetectorTest');
require('dotenv').config();

const kalshiAPIKey = process.env.KALSHI_API_KEY;
const pathToPrivKey = process.env.KALSHI_KEY_PATH;

// map of kalshi league abbreviations to bet105 league names
const leagueMap = {
    'NCAAMB': 'College Basketball',
    'WOMHOCKEY': 'WINTER OLYMPICS HOCKEY - MEN',
    'NBA': 'NBA',
    'NHL': 'NHL',
    'MLB': 'MLB'
}

async function main() {
    // instantiate clients
    const bet105 = new Bet105Client();
    const kalshi = new KalshiClient(kalshiAPIKey, pathToPrivKey);

    const matcher = new EventMatcher();
    const finder =  new ArbDetector(matcher);

    const activeLeagues = [];

    // callback function for bet105 odds update
    const onBet105Update = (event, odds) => {
        const gameKey = matcher.getGameKey(event.eventId);
                
        if (gameKey) {
            finder.onBet105Update(odds, gameKey);
        }
    }

    // callback for kalshi orderbook update
    const onKalshiUpdate = (update) => {
        const gameKey = matcher.getGameKeyFromTicker(update.ticker);
                
        if (gameKey) {
            finder.onKalshiUpdate(update, gameKey, matcher.getLeagueFromTicker(update.ticker));
        }
    }

    // adds league to each client
    const addLeague = async (kalshiLeague) => {
        await bet105.addLeague(leagueMap[kalshiLeague]);
        await kalshi.addLeague(`KX${kalshiLeague}GAME`);

        activeLeagues.push(kalshiLeague);
    }

    // builds events via matcher, subscribes to events with each client
    const buildAndSubscribe = () => {
        // loop through curren activeLeagues -> build events and subscribe
        for (const league of activeLeagues) {
            matcher.buildEvents(bet105.getEvents(), kalshi.getTickers(), league);

            bet105.subscribeToEvents(onBet105Update);
            kalshi.subscribe(onKalshiUpdate);
        }
    }

    // start clients 
    await bet105.start();
    await kalshi.start();

    // adds league to both clients 
    await addLeague('NCAAMB');

    // build events with matcher and subscribe to ws updates
    buildAndSubscribe();

    // refresh liveEvents for bet105 every 10 minutes
    setInterval(async () => {
        await bet105.refreshEvents();

        buildAndSubscribe();
    }, 10 * 60 * 1000);
}

main();
