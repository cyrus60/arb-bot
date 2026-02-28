const Bet105Client = require('./clients/bet105');
const PolymarketClient = require('./clients/polymarket');
const EventMatcher = require('./engine/eventMatcher');
// const ArbDetector = require('./engine/arbDetector');
const ArbDetector =  require('./engine/arbDetectorLog');

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
    const polymarket = new PolymarketClient();
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

    // callback for polymarket odds update
    const onPolyUpdate = (odds) => {
        console.log(odds);
    }

    await polymarket.connect();
    await polymarket.subscribeToLeague('nhl', onPolyUpdate);

    // build events with matcher and subscribe to ws updates
    // buildAndSubscribe();

    // refresh liveEvents for bet105 every 10 minutes -- DEBUG
    // setInterval(async () => {
    //     await bet105.refreshEvents();

    //     buildAndSubscribe();
    // }, 5 * 60 * 1000);
}

main();
