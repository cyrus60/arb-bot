const Bet105Client = require('./clients/bet105');
const KalshiClient = require('./clients/kalshi');
const EventMatcher = require('./engine/eventMatcher');
// const ArbDetector = require('./engine/arbDetector');
const ArbDetector =  require('./engine/arbDetectorLog');
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

    // tracks which leagues are currently monitored
    const activeLeagues = [];

    // starting args
    const args = process.argv.slice(2);

    let stake;
    let threshold;

    // loop through args and set vars accordingly
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--league') {
            activeLeagues.push(args[i + 1]);
            i++;
        }

        if (args[i] === '--stake') {
            stake = parseInt(args[i + 1]);
            i++;
        }

        if (args [i] === '--threshold') {
            threshold = parseFloat(args[i + 1]);
            i++;
        }
    }

    // instantiate arbDetector with stake and threshold args 
    const finder = new ArbDetector(matcher, threshold, stake);

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
            finder.onKalshiUpdate(update, gameKey, matcher.getGameInfo(gameKey).league);
        }
    }

    // adds league to each client -- used for live league adding
    const addLeague = async (kalshiLeague) => {
        await bet105.addLeague(leagueMap[kalshiLeague]);
        await kalshi.addLeague(`KX${kalshiLeague}GAME`);

        activeLeagues.push(kalshiLeague);
    }

    const buildAndSubscribe = () => {
        // loop through current activeLeagues -> build events for each
        for (const league of activeLeagues) {
            matcher.buildEvents(bet105.getEvents(), kalshi.getTickers(), league);
        }

        // subscribe to all events 
        bet105.subscribeToEvents(onBet105Update);
        kalshi.subscribe(onKalshiUpdate);
    }

    // start clients 
    await bet105.start();
    await kalshi.start();

    // add leagues to each client at start
    for (const league of activeLeagues) {
        await bet105.addLeague(leagueMap[league]);
        await kalshi.addLeague(`KX${league}GAME`);
    }

    // build events with matcher and subscribe to ws updates
    buildAndSubscribe();

    // refresh liveEvents for bet105 every 10 minutes -- DEBUG
    // setInterval(async () => {
    //     await bet105.refreshEvents();

    //     buildAndSubscribe();
    // }, 5 * 60 * 1000);
}

main();
