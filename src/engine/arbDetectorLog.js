const fs = require('fs');

class ArbDetectorTest {
    constructor(matcher, profitThreshold = 1.5, totalStake = 1000) {
        this.matcher = matcher;
        this.odds = new Map();
        this.activeArbs = new Map();
        this.arbLog = [];
        this.logFile = 'arb-log2.json';
        // dont't display arbs with profitPct lower than threshold
        this.profitThreshold = profitThreshold;

        // total stake used to calculate $ amount for each side of arb as well as profit 
        this.totalStake = totalStake;
    }

    onBet105Update(eventOdds, gameKey) {
        if (!gameKey) return;

        // handle suspended bet105 markets
        if (!eventOdds?.odds) {
            // clear stale odds
            const existing = this.getOdds(gameKey) || {};
            this.odds.set(gameKey, {
                ...existing,
                bet105: {
                    home: undefined,
                    away: undefined
                }
            })

            this.closeArb(`${gameKey}-opt1`);
            this.closeArb(`${gameKey}-opt2`);
            this.displayArbs();
            return;
        }

        const existing = this.getOdds(gameKey) || {};

        this.odds.set(gameKey, {
            ...existing,
            bet105: {
                home: eventOdds.odds.home,
                away: eventOdds.odds.away
            }
        });

        this.checkArbitrage(gameKey);
    }

    onKalshiUpdate(update, gameKey, league) {
        if (!gameKey || !update || !league) return;

        const existing = this.getOdds(gameKey) || {};
        const gameInfo = this.matcher.getGameInfo(gameKey);
        if (!gameInfo) return;

        const homeAbbrev = this.matcher.getAbbreviation(gameInfo.homeTeam, league);
        const isHome = update.winningTeam === homeAbbrev;
        const currentKalshi = existing.kalshi || {};

        this.odds.set(gameKey, {
            ...existing,
            kalshi: {
                ...currentKalshi,
                [isHome ? 'home' : 'away']: update.yesAsk,
                [isHome ? 'homeLiquidity' : 'awayLiquidity']: update.liquidityAtAsk
            }
        });

        this.checkArbitrage(gameKey);
    }

    checkArbitrage(gameKey) {
        const odds = this.getOdds(gameKey);
        const gameInfo = this.matcher.getGameInfo(gameKey);

        // remove from active arbs if any odds are undefined (think solved hanging arb issue)
        if (!odds?.bet105?.home || !odds?.bet105?.away ||
            !odds?.kalshi?.home || !odds?.kalshi?.away) {
            this.closeArb(`${gameKey}-opt1`);
            this.closeArb(`${gameKey}-opt2`);

            this.displayArbs();
            return;
        }

        const now = Date.now();
        const impliedProb1 = (1 / (100 / (odds.kalshi.home)) + (1 / odds.bet105.away));
        const impliedProb2 = (1 / odds.bet105.home) + (1 / (100 / odds.kalshi.away));

        if (impliedProb1 < 1) {
            const arbKey = `${gameKey}-opt1`;
            const arb = this.calculateStakes(
                    (100 / odds.kalshi.home), odds.bet105.away, gameInfo,
                    'KALSHI', gameInfo.homeTeam, 'BET105', gameInfo.awayTeam, this.totalStake
                );

                // check kalshi liquidity 
                const kalshiStake = parseFloat(arb.stake1);
                const liquidity = odds.kalshi.homeLiquidity;

                // skip arb if not enough liquidity
                if (kalshiStake > liquidity || parseFloat(arb.profitPct) < this.profitThreshold) {
                    this.closeArb(arbKey);
                    this.displayArbs();
                    return;
                }

                arb.startTime = this.activeArbs.has(arbKey) ? this.activeArbs.get(arbKey).startTime : now;
                arb.arbKey = arbKey;
                this.activeArbs.set(arbKey, arb);
        } else {
            this.closeArb(`${gameKey}-opt1`);
        }

        if (impliedProb2 < 1) {
            const arbKey = `${gameKey}-opt2`;
            const arb = this.calculateStakes(
                odds.bet105.home, (100 / odds.kalshi.away), gameInfo,
                'BET105', gameInfo.homeTeam, 'KALSHI', gameInfo.awayTeam, this.totalStake
            );

            // check kalshi liquidity 
            const kalshiStake = parseFloat(arb.stake2);
            const liquidity = odds.kalshi.awayLiquidity;

            // skip arb if not enough liquidity
            if (kalshiStake > liquidity || parseFloat(arb.profitPct) < this.profitThreshold) {
                this.closeArb(arbKey);
                this.displayArbs();
                return;
            }

            arb.startTime = this.activeArbs.has(arbKey) ? this.activeArbs.get(arbKey).startTime : now;
            arb.arbKey = arbKey;
            this.activeArbs.set(arbKey, arb);
        } else {
            this.closeArb(`${gameKey}-opt2`);
        }

        this.displayArbs();
    }

    calculateStakes(odds1, odds2, gameInfo, platform1, team1, platform2, team2, totalStake) {
        const prob1 = 1 / odds1;
        const prob2 = 1 / odds2;
        const totalProb = prob1 + prob2;

        const stake1 = totalStake * (prob1 / totalProb);
        const stake2 = totalStake * (prob2 / totalProb);
        const payout = stake1 * odds1;
        const profit = payout - totalStake;

        return {
            homeTeam: gameInfo.homeTeam,
            awayTeam: gameInfo.awayTeam,
            platform1,
            team1,
            stake1: stake1.toFixed(2),
            odds1: odds1.toFixed(2),
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
            profitPct: ((profit / totalStake) * 100).toFixed(2),
            detectedAt: new Date().toISOString()
        };
    }

    closeArb(arbKey) {
        const arb = this.activeArbs.get(arbKey);
        if (arb) {
            arb.durationSeconds = ((Date.now() - arb.startTime) / 1000).toFixed(1);
            arb.closedAt = new Date().toISOString();
            this.arbLog.push(arb);
            this.activeArbs.delete(arbKey);
            this.saveLog();
        }
    }

    saveLog() {
        fs.writeFileSync(this.logFile, JSON.stringify(this.arbLog, null, 2));
    }

    displayArbs() {
        console.clear();
        console.log('========= ARB MONITOR =========');
        console.log(`Active arbs: ${this.activeArbs.size} | Logged: ${this.arbLog.length}`);
        console.log('');

        if (this.activeArbs.size === 0) {
            console.log('No arbs detected. Monitoring...');
        }

        const sorted = [...this.activeArbs.values()]
            .sort((a, b) => b.profitPct - a.profitPct);

        for (const arb of sorted) {
            const duration = ((Date.now() - arb.startTime) / 1000).toFixed(0);

            let kalshiTeam, kalshiStake, kalshiOdds;
            let bet105Team, bet105Stake, bet105Odds;

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

            console.log(`${arb.profitPct}% | ${arb.awayTeam} @ ${arb.homeTeam} (${duration}s)`);
            console.log(` KALSHI | $${kalshiStake} on ${kalshiTeam} @ ${kalshiOdds}`);
            console.log(` BET105 | $${bet105Stake} on ${bet105Team} @ ${bet105Odds}`);
            console.log('');
        }

        console.log(`Updated: ${new Date().toLocaleTimeString()}`);
    }

    decimalToAmerican(decimal) {
        if (decimal >= 2) {
            return '+' + Math.round((decimal - 1) * 100);
        } else {
            return Math.round(-100 / (decimal - 1));
        }
    }

    getOdds(gameKey) {
        return this.odds.get(gameKey);
    }

    shutdown() {
        for (const arbKey of this.activeArbs.keys()) {
            this.closeArb(arbKey);
        }
        console.log(`Saved ${this.arbLog.length} arbs to ${this.logFile}`);
    }
}

module.exports = ArbDetectorTest;