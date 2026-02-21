class ArbDetector {
    constructor(matcher, profitThreshold = 1.5, totalStake = 1000) {
        this.matcher = matcher;

        // dont't display arbs with profitPct lower than threshold
        this.profitThreshold = profitThreshold;

        // total stake used to calculate $ amount for each side of arb as well as profit 
        this.totalStake = totalStake;

        // mapping stores game odds under corresponding gameKey
        this.odds = new Map();

        // mapping stores active arbs for display
        this.activeArbs = new Map();
    }

    // function called every time there is an odds update on a bet105Event
    onBet105Update(eventOdds, gameKey) {
        if (!gameKey) return;
        
        // check for suspended bet105 markets
        if (!eventOdds?.odds) {
            const existing = this.getOdds(gameKey) || {};

            // set bet105 odds as undefinded if odds do not exist
            this.odds.set(gameKey, {
                ...existing,
                bet105: {
                    home: undefined,
                    away: undefined
                }
            })

            this.activeArbs.delete(`${gameKey}-opt1`);
            this.activeArbs.delete(`${gameKey}-opt2`);
            this.displayArbs();
            return;
        }

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
    onKalshiUpdate(update, gameKey, league) {
        // check if there are already odds for bet105 key in odds map -- set as empty obj if not
        const existing = this.getOdds(gameKey) || {};

        // retrieve eventInfo of event stored under gameKey
        const gameInfo = this.matcher.getGameInfo(gameKey);

        const homeAbbrev = this.matcher.getAbbreviation(gameInfo.homeTeam, league);

        // evals to true if winning team of marketOdds ws update matches winning team stored in gameKey map
        const isHome = update.winningTeam === homeAbbrev;

        // checks if there are odds for home or away side of kalshi event, empty obj if not 
        const currentKalshi = existing.kalshi || {};

        this.odds.set(gameKey, {
            ...existing, 
            kalshi: {
                // spread currentKalshi odds (either home or away)
                ...currentKalshi, 
                // expression evals isHome and sets key(home/away) for the odds and liqudity update accordingly 
                [isHome ? 'home': 'away']: update.yesAsk,
                [isHome ? 'homeLiquidity' : 'awayLiquidity']: update.liquidityAtAsk
            }
        });

        // call checkArb function after setting new odds update in mapping
        this.checkArbitrage(gameKey);
    }

    // compares odds from each client for an event and checks for arbitrage 
    checkArbitrage(gameKey) {
        const odds = this.getOdds(gameKey);
        const gameInfo = this.matcher.getGameInfo(gameKey);

        // if there are no odds for any side of event, remove arb from active arbs, display and return
        if (!odds?.bet105?.home || !odds?.bet105?.away ||
            !odds?.kalshi?.home || !odds?.kalshi?.away) {
                this.activeArbs.delete(`${gameKey}-opt1`);
                this.activeArbs.delete(`${gameKey}-opt2`);

                this.displayArbs();
                return;
        }

        const now = Date.now();

        // calculate implied probability for both possible wl scenarios on each platform
        const impliedProb1 = (1 / (100 / (odds.kalshi.home)) + (1 / odds.bet105.away));
        const impliedProb2 = (1 / odds.bet105.home) + (1 / (100 / odds.kalshi.away));

        if (impliedProb1 < 1) {
            const arbKey = `${gameKey}-opt1`;
            const arb = this.calculateStakes((100 / odds.kalshi.home), odds.bet105.away, gameInfo, 'KALSHI', gameInfo.homeTeam, 'BET105', gameInfo.awayTeam, this.totalStake);

            // check kalshi liquidity 
            const kalshiStake = parseFloat(arb.stake1);
            const liquidity = odds.kalshi.homeLiquidity;

            // skip arb if not enough kalshi liquidity or profit threshold is not met
            if (kalshiStake > liquidity || parseFloat(arb.profitPct) < this.profitThreshold) {
                this.displayArbs();
                return;
            }

            arb.startTime = this.activeArbs.has(arbKey) ? this.activeArbs.get(arbKey).startTime : now;
            arb.arbKey = arbKey;
            this.activeArbs.set(arbKey, arb);
        } else { // remove arb from activeArbs if implied probability exceeds one
            this.activeArbs.delete(`${gameKey}-opt1`);
        }

        if (impliedProb2 < 1) {
            const arbKey = `${gameKey}-opt2`;
            const arb = this.calculateStakes(odds.bet105.home, (100 / odds.kalshi.away), gameInfo, 'BET105', gameInfo.homeTeam, 'KALSHI', gameInfo.awayTeam, this.totalStake);

            // check kalshi liquidity 
            const kalshiStake = parseFloat(arb.stake2);
            const liquidity = odds.kalshi.awayLiquidity;

            // skip arb if not enough kalshi liquidity or profit threshold is not met
            if (kalshiStake > liquidity || parseFloat(arb.profitPct) < this.profitThreshold) {
                this.displayArbs();
                return;
            }

            arb.startTime = this.activeArbs.has(arbKey) ? this.activeArbs.get(arbKey).startTime : now;
            arb.arbKey = arbKey;
            this.activeArbs.set(arbKey, arb);
        } else { // remove arb from activeArbs if implied probability exceeds one
            this.activeArbs.delete(`${gameKey}-opt2`);
        }

        this.displayArbs();
    }

    // calculates stake for each side of arb as well as profit and profit %
    calculateStakes(odds1, odds2, gameInfo, platform1, team1, platform2, team2, totalStake) {
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
            // set display odds based on platform
            odds1Display: platform1 === 'KALSHI'
                ? Math.round(100 / odds1) + '¢'
                : this.decimalToAmerican(odds1),
            platform2,
            team2,
            stake2: stake2.toFixed(2),
            odds2: odds2.toFixed(2),
            odds2Display: platform2 === 'KALSHI'
                ? Math.round(100 / odds2) + '¢'
                : this.decimalToAmerican(odds2),
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
        // console.log('Arbs found: ' + this.arbsFound);
        console.log('');

        if (this.activeArbs.size === 0) {
            console.log('No arbs detected. Monitoring...');
        }

        // sort by profit descending 
        const sorted = [...this.activeArbs.values()]
            .sort((a, b) => b.profitPct - a.profitPct);

        // loop through current arbs and display info
        for (const arb of sorted) {
            const duration = ((Date.now() - arb.startTime) / 1000).toFixed(0);

            let kalshiTeam, kalshiStake, kalshiOdds;
            let bet105Team, bet105Stake, bet105Odds;

            // set above vars based on platform
            if (arb.platform1 === 'KALSHI') {
                kalshiTeam = arb.team1,
                kalshiStake = arb.stake1, 
                kalshiOdds = arb.odds1Display,
                bet105Team = arb.team2;
                bet105Stake = arb.stake2;
                bet105Odds = arb.odds2Display;
            } else {
                kalshiTeam = arb.team2;
                kalshiStake = arb.stake2;
                kalshiOdds = arb.odds2Display;
                bet105Team = arb.team1;
                bet105Stake = arb.stake1;
                bet105Odds = arb.odds1Display;
            }

            // always display kalshi odds on top (first)
            console.log(`${arb.profitPct}% | ${arb.awayTeam} @ ${arb.homeTeam} (${duration}s)`);
            console.log(` KALSHI | $${kalshiStake} on ${kalshiTeam} @ ${kalshiOdds}`);
            console.log(` BET105 | $${bet105Stake} on ${bet105Team} @ ${bet105Odds}`);
            console.log('');
        }

        console.log(`Updated ${new Date().toLocaleTimeString()}`);
    }

    // convert decimal odds to american
    decimalToAmerican(decimalOdds) {
        if (decimalOdds >= 2) {
            return Math.round((decimalOdds - 1) * 100);
        } else {
            return Math.round(-100 / (decimalOdds - 1));
        }
    }

    // returns map of gamekey to odds for each event
    getOdds(gameKey) {
        return this.odds.get(gameKey);
    }
}

module.exports = ArbDetector;