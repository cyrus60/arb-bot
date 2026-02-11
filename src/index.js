const Bet105Client = require('./clients/bet105');
const KalshiClient = require('./clients/kalshi');
const EventMatcher = require('./engine/eventMatcher');
const ArbDetector = require('./engine/arbDetector');
require('dotenv').config();

const kalshiAPIKey = process.env.KALSHI_API_KEY;
const pathToPrivKey = process.env.KALSHI_KEY_PATH;

// adds league to both clients and builds events 
async function addLeague(bet105, kalshi, matcher, kalshiLeague, bet105League, callback) {
    const kalshiLeagueName = `KX${kalshiLeague}GAME`;

    const events = await bet105.addLeague(bet105League, callback);
    const markets = await kalshi.addLeague(kalshiLeagueName);

    matcher.buildEvents(events, markets, kalshiLeague);
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
        }
    }

    // start clients 
    await bet105.start();
    await kalshi.start();
   
    // add league to both clients to search for arbs in
    // await addLeague(bet105, kalshi, matcher, 'NCAAMB', 'College Basketball', onBet105Update);
    // await addLeague(bet105, kalshi, matcher, 'NBA', 'NBA', onBet105Update);
    await addLeague(bet105, kalshi, matcher, 'WOMHOCKEY', 'INTERNATIONAL HOCKEY OLYMPIC GAMES', onBet105Update);

    kalshi.subscribe((update) => {
        // callback for each kalshi odds update
        const gameKey = matcher.getGameKeyFromTicker(update.ticker);

        if (gameKey) {
            const league = matcher.getLeagueFromTicker(update.ticker);
            finder.onKalshiUpdate(update, gameKey, league);
        }
    })
}

main();
