class ArbDetector {
    constructor(matcher) {
        this.matcher = matcher;

        // mapping stores game odds under corresponding gameKey
        this.odds = new Map();

        // mapping stores active arbs for display
        this.activeArbs = new Map();
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

        // call checkArb function after setting new odds update in mapping
        this.checkArbitrage(gameKey);
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

        // call checkArb function after setting new odds update in mapping
        this.checkArbitrage(gameKey);
    }

    // compares odds from each client for an event and checks for arbitrage 
    checkArbitrage(gameKey) {
        const odds = this.getOdds(gameKey);

        // if there are no odds for any side of event, return 
        if (!odds?.bet105?.home || !odds?.bet105?.away ||
            !odds?.kalshi?.home || !odds?.kalshi?.away) {
                return;
        }

        const gameInfo = this.matcher.getGameInfo(gameKey);

        // first variation - kalshi home + bet105 away
        const impliedProb1 = (1 / odds.kalshi.home) + (1 / odds.bet105.away);

        // second variation - bet105 home + kalshi away
        const impliedProb2 = (1 / odds.bet105.home) + (1 / odds.kalshi.away);

        // if implied probability for either variation is less than one, cache arb in activeArb cache and display arbs 
        if (impliedProb1 < 1) {
            const arb = this.calculateStakes(odds.kalshi.home, odds.bet105.away, gameInfo, 'KALSHI', gameInfo.homeTeam, 'BET105', gameInfo.awayTeam);

            this.activeArbs.set(gameKey, arb);
        }

        if (impliedProb2 < 1) {
            const arb = this.calculateStakes(odds.bet105.home, odds.kalshi.away, gameInfo, 'BET105', gameInfo.homeTeam, 'KALSHI', gameInfo.awayTeam);

            this.activeArbs.set(gameKey, arb);
        }

        // Remove arb if neither condition met
        if (impliedProb1 >= 1 && impliedProb2 >= 1) {
            this.activeArbs.delete(gameKey);
        }

        this.displayArbs();
    }

    // calculates stake for each side of arb as well as profit and profit %
    calculateStakes(odds1, odds2, gameInfo, platform1, team1, platform2, team2, totalStake = 1000) {
        const prob1 = 1 / odds1;
        const prob2 = 1 / odds2;
        const totalProb = prob1 + prob2;

        // calculate each stake proportional to implied probability
        const stake1 = totalStake * (prob1 / totalProb);
        const stake2 = totalStake * (prob2 / totalProb);

        const payout = stake1 * odds1;
        const profit = payout - totalStake;

        // return object of necesarry data for arb
        return {
            homeTeam: gameInfo.homeTeam,
            awayTeam: gameInfo.awayTeam,
            platform1,
            team1,
            stake1: stake1.toFixed(2),
            odds1: odds1.toFixed(2),
            platform2,
            team2,
            stake2: stake2.toFixed(2),
            odds2: odds2.toFixed(2),
            payout: payout.toFixed(2),
            profit: profit.toFixed(2),
            profitPct: ((profit / totalStake) * 100).toFixed(2)
        }
    }

    // displays current arbs cached 
    displayArbs() {
        console.clear();
        console.log('========= ARB MONITOR =========');
        console.log(`Active arbs: ${this.activeArbs.size}`);
        console.log('');

        if (this.activeArbs.size === 0) {
            console.log('No arbs detected. Monitoring...');
        }

        // sort by profit descending 
        const sorted = [...this.activeArbs.values()]
            .sort((a, b) => b.profitPct - a.profitPct);

        for (const arb of sorted) {
            console.log(`${arb.profitPct}% | ${arb.awayTeam} @ ${arb.homeTeam}`);
            console.log(`   ${arb.platform1} $${arb.stake1} @ ${arb.odds1}`);
            console.log(`   ${arb.platform2} $${arb.stake2} @ ${arb.odds2}`);
            console.log('');
        }

        console.log(`Updated ${new Date().toLocaleTimeString()}`);
    }

    // returns kalshi odds as 
    normalizeKalshiOdds(price) {
        return 100 / price;
    }

    // returns map of gamekey to odds for each event
    getOdds(gameKey) {
        return this.odds.get(gameKey);
    }
}

module.exports = ArbDetector;