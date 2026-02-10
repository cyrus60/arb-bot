class ArbDetector {
    constructor(matcher) {
        // mapping stores game odds under corresponding gameKey
        this.odds = new Map();
        this.matcher = matcher;
    }

    // function called every time there is an odds update on a bet105Event
    onBet105Update(eventOdds, gameKey) {
        // check if there are already odds for kalshi key in map -- set as empty obj if not
        const existing = this.getOdds(gameKey) || {};

        this.odds.set(gameKey, {
            ...existing, 
            bet105: {
                home: eventOdds.odds.home,
                away: eventOdds.odds.away
            }
        });
    }

    // function called every time there is an odds update on a kalshiMarket 
    // this implementation ensures that kalshi odds data is stored in odds mapping under same home: away format as bet105 for easy comparisons
    onKalshiUpdate(marketOdds, gameKey, league) {
        // check if there are already odds for bet105 key in odds map -- set as empty obj if not
        const existing = this.getOdds(gameKey) || {};

        // retrieve eventInfo of event stored under gameKey
        const gameInfo = this.matcher.getGameInfo(gameKey);

        // get 3 char abbreviation for home team of event(gameKey)
        const homeAbbrev = this.matcher.getAbbreviation(gameInfo.homeTeam, league);

        // evals to true if winning team of marketOdds ws update matches winning team stored in gameKey map
        const isHome = marketOdds.winningTeam === homeAbbrev;

        // checks if there are odds for home or away side of kalshi event, empty obj if not 
        const currentKalshi = existing.kalshi || {};

        this.odds.set(gameKey, {
            ...existing, 
            kalshi: {
                // spread currentKalshi odds (either home or away)
                ...currentKalshi, 
                // expression evals isHome and sets key(home/away) for the odds update accordingly 
                [isHome ? 'home': 'away']: this.normalizeKalshiOdds(marketOdds.yesAsk)
            }
        });
    }

    // returns kalshi odds as 
    normalizeKalshiOdds(price) {
        return 100 / price;
    }

    // compares odds from each client for an event and checks for arbitrage 
    checkArbitrage(gameKey) {
        // fetch odds of event for each client
        const kalshiOdds = this.odds.get(gameKey).bet105;
        const bet105Odds = this.odds.get(gameKey).kalshi;

        

    }

    // returns map of gamekey to odds for each event
    getOdds(gameKey) {
        return this.odds.get(gameKey);
    }
}

module.exports = ArbDetector;