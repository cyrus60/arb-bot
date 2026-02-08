class ArbDetector {
    constructor() {
        // mapping stores game odds under corresponding gameKey
        this.odds = new Map();
    }

    // function called every time there is an odds update on a bet105Event
    onBet105Update(eventOdds, gameKey) {
        const existing = this.getOdds(gameKey) || {};

        this.odds.set(gameKey, {
            ...existing, 
            bet105Odds: {
                home: eventOdds.odds.home,
                away: eventOdds.odds.away
            }
        });
    }

    // function called every time there is an odds update on a kalshiMarket -- (not sure how to handle the fact that there are two markets for each game (a market/price for each team to win)) ?? Look into
    onKalshiUpdate(marketOdds, gameKey) {
        const existing = this.getOdds(gameKey) || {};

        this.odds.set(gameKey, {
            ...existing, 
            kalshiOdds: {
                winner: marketOdds.winningTeam, 
                odds: marketOdds.price
                // odds: this.normalizeKalshiOdds(marketOdds.price)
            }
        });
    }

    // returns kalshi odds as 
    normalizeKalshiOdds(odds) {

    }

    // compares odds from each client for an event and checks for arbitrage 
    checkArbitrage(gameKey) {
        const kalshiOdds = this.odds.get(gameKey).bet105Odds;
        const bet105Odds = this.odds.get(gameKey).kalshiOdds;


    }

    // returns map of gamekey to odds
    getOdds(gameKey) {
        return this.odds.get(gameKey);
    }
}

module.exports = ArbDetector;