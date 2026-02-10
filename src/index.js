const Bet105Client = require('./clients/bet105');
const KalshiClient = require('./clients/kalshi');
const EventMatcher = require('./engine/eventMatcher');
const ArbDetector = require('./engine/arbDetector');
const sleep = require('sleep-promise');
require('dotenv').config();

const kalshiAPIKey = process.env.KALSHI_API_KEY;
const pathToPrivKey = process.env.KALSHI_KEY_PATH;

// adds league to both clients and builds events 
async function addLeague(bet105, kalshi, matcher, league, callback) {
    // convert given league to kalshi league name
    const kalshiLeague = `KX${league}GAME`;

    const events = await bet105.addLeague(league, callback);
    const markets = await kalshi.addLeague(kalshiLeague);

    matcher.buildEvents(events, markets, league);
}

async function main() {
    //instantiate clients
    const bet105 = new Bet105Client();
    const kalshi = new KalshiClient(kalshiAPIKey, pathToPrivKey);

    const matcher = new EventMatcher();
    const finder =  new ArbDetector(matcher);

    // callback function for bet105 odds update
    const onBet105Update = (event, odds) => {
        const gameKey = matcher.getGameKey(event.eventId);
                
        if (gameKey) {
            finder.onBet105Update(odds, gameKey);
            console.log(`${event.homeTeam} @ ${event.awayTeam}`);
            console.log(finder.getOdds(gameKey));
            console.log();
        }
    }

    // start clients 
    bet105.start();
    kalshi.start();
   
    // add league to both clients to search for arbs in
    addLeague(bet105, kalshi, matcher, 'NBA', onBet105Update);

    kalshi.subscribe((update) => {
        const gameKey = matcher.getGameKeyFromTicker(update.ticker);

        if (gameKey) {
            const league = matcher.getLeagueFromTicker(update.ticker);
            finder.onKalshiUpdate(update, gameKey, league);
        }
    })
}

main();
