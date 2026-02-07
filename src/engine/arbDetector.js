class ArbDetector {
    constructor(matcher) {
        this.matcher = matcher;

        // mapping stores game odds under corresponding gameKey
        this.odds = new Map();
    }

    // function called every time there is an odds update on a bet105Event
    onBet105Update(event) {

    }

    // function called every time there is an odds update on a desired kalshiMarket 
    onKalshiUpdate(market) {

    }

    // returns kalshi odds as 
    normalizeKalshiOdds(odds) {

    }

    // compares odds from each platform for an event and checks for arbitrage 
    checkArbitrage(gameKey) {

    }
}

module.exports = ArbDetector;