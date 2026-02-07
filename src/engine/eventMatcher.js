class EventMatcher {
    constructor(bet105Client, kalshiClient) {
        this.bet105 = bet105Client;
        this.kalshi = kalshiClient;

        // mapping from ID/ticker to gameKey for each game 
        this.gamesByBet105Id = new Map();
        this.gamesByKalshiTicker = new Map();
        this.games = new Map();

        // maps team abbreviations for each league to team name
        this.teamMap = {
            NBA: {
                'Atlanta Hawks': 'ATL',
                'Boston Celtics': 'BOS',
                'Brooklyn Nets': 'BKN',
                'Charlotte Hornets': 'CHA',
                'Chicago Bulls': 'CHI',
                'Cleveland Cavaliers': 'CLE',
                'Dallas Mavericks': 'DAL',
                'Denver Nuggets': 'DEN',
                'Detroit Pistons': 'DET',
                'Golden State Warriors': 'GSW',
                'Houston Rockets': 'HOU',
                'Indiana Pacers': 'IND',
                'Los Angeles Clippers': 'LAC',
                'Los Angeles Lakers': 'LAL',
                'Memphis Grizzlies': 'MEM',
                'Miami Heat': 'MIA',
                'Milwaukee Bucks': 'MIL',
                'Minnesota Timberwolves': 'MIN',
                'New Orleans Pelicans': 'NOP',
                'New York Knicks': 'NYK',
                'Oklahoma City Thunder': 'OKC',
                'Orlando Magic': 'ORL',
                'Philadelphia 76ers': 'PHI',
                'Phoenix Suns': 'PHX',
                'Portland Trail Blazers': 'POR',
                'Sacramento Kings': 'SAC',
                'San Antonio Spurs': 'SAS',
                'Toronto Raptors': 'TOR',
                'Utah Jazz': 'UTA',
                'Washington Wizards': 'WAS'
            },

            NFL: {

            },

            NHL: {
                'Anaheim Ducks': 'ANA',
                'Boston Bruins': 'BOS',
                'Carolina Hurricanes': 'CAR',
                'Columbus Blue Jackets': 'CBJ',
                'Calgary Flames': 'CGY',
                'Chicago Blackhawks': 'CHI',
                'Colorado Avalanche': 'COL',
                'Dallas Stars': 'DAL',
                'Detroit Red Wings': 'DET',
                'Edmonton Oilers': 'EDM',
                'Florida Panthers': 'FLA',
                'Los Angeles Kings': 'LA',
                'Minnesota Wild': 'MIN',
                'Montreal Canadiens': 'MTL',
                'New Jersey Devils': 'NJD',
                'Nashville Predators': 'NSH',
                'New York Islanders': 'NYI',
                'New York Rangers': 'NYR',
                'Ottowa Senators': 'OTT',
                'Philadelphia Flyers': 'PHI',
                'Pittsburgh Penguins': 'PIT',
                'Seattle Kraken': 'SEA',
                'San Jose Sharks': 'SJS',
                'St. Louis Blues': 'STL',
                'Tampa Bay Lightning': 'TBL',
                'Toronto Maple Leafs': 'TOR',
                'Utah Mammoth': 'UTA', 
                'Vancouver Canucks': 'VAN',
                'Vegas Golden Knights': 'VGK',
                'Winnipeg Jets': 'WPG',
                'Washington Capitals': 'WSH'
            }, 

            MLB: {

            }, 

            NCAAMB: {

            }
        };
    }

    // main matcher function. builds map of games from each client 
    async buildEvents(bet105Events, kalshiMarkets, league) {
        // find corresponding kalshiMarket for each bet105Event
        for (const event of bet105Events) {
            const kalshiMatch = this.findKalshiMatch(event, kalshiMarkets, league);

            // if kalshiMatch is found, create gameKey and set maps for 
            if (kalshiMatch) {
                const gameKey = this.createGameKey(event);
                const parsed = this.parseTicker(kalshiMatch.ticker);

                // find both kalshi tickers associated with spcific market
                const relatedTickers = kalshiMarkets.filter(m => m.ticker.includes(parsed.teams))
                    .map(m => m.ticker);

                // set gamekey for bet105 map
                this.gamesByBet105Id.set(event.eventId, gameKey);

                // set gamekey for both kalshi tickers 
                relatedTickers.forEach(ticker => {
                    this.gamesByKalshiTicker.set(ticker, gameKey);
                });

                // set map for overall games map
                this.games.set(gameKey, {
                    bet105EventId: event.eventId,
                    kalshiTickers: relatedTickers,
                    homeTeam: event.homeTeam,
                    awayTeam: event.awayTeam
                });
            }
        }
    }

    // return abbreviation for team
    getAbbreviation(teamName, league) {
        return this.teamMap[league]?.[teamName];
    }

    // finds corresponding kalshi match for a given bet105 event
    findKalshiMatch(bet105Event, kalshiMarkets, league) {
        // convert bet105 home and away teams to abbreviations to be checked against kalshiTickers
        const home = this.getAbbreviation(bet105Event.homeTeam, league);
        const away = this.getAbbreviation(bet105Event.awayTeam, league);

        // both blocks of code below should do the same thing -- test to see which is more effecient

        // return kalshi market that satisfies condition: contains both home and away team abbreviations 
        // return kalshiMarkets.find(market => {
        //     console.log(market.ticker);
        //     const parsed = this.parseTicker(market.ticker);
        //     console.log(parsed);
        //     return parsed.teams.includes(home) && parsed.teams.includes(away);
        // });

        // loop through kalshiMarkets, parse the tickers and check whether both home and away abbreviations are included in ticker 
        for (const market of kalshiMarkets) {
            const parsed = this.parseTicker(market.ticker);

            if (parsed.teams.includes(home) && parsed.teams.includes(away)) {
                console.log('match');
                return market;
            }
        }
    }

    // parses kalshi ticker. returns object of teams in market and winning team of market 
    parseTicker(ticker) {
        const parts = ticker.split('-');
        const dateTeams = parts[1];
        return {
            teams: dateTeams.slice(7),
            team: parts[2]
        };
    }

    // creates game key from bet105 event 
    createGameKey(bet105Event) {
        return `${bet105Event.homeTeam}-${bet105Event.awayTeam}-${bet105Event.startTime}`;
    }

    // returns gameKey associated with bet105Id
    getGameKey(eventId) {
        return this.gamesByBet105Id.get(eventId);
    }

    // returns gameKey associated with kalshiTicker
    getGameKeyFromTicker(ticker) {
        return this.gamesByKalshiTicker.get(ticker);
    }

    // returns game information associated with gameKey
    getGameInfo(gameKey) {
        return this.games.get(gameKey);
    }
}

module.exports = EventMatcher;