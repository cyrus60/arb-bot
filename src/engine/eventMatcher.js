class EventMatcher {
    constructor() {
        // mappings from ID/ticker to gameKey for each game 
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
                // BIG10
                'Purdue': 'PUR',
                'Nebraska': 'NEB',
                'Wisconsin': 'WIS',
                'Illinois': 'ILL',
                'USC': 'USC',
                'Ohio State': 'OSU',
                'Michigan': 'MICH',
                'Northwestern': 'NW',
                'Penn State': 'PSU',
                'Washington': 'WASH',
                'Iowa': 'IOWA',
                'Maryland': 'MD',
                'Michigan State': 'MSU',
                'UCLA': 'UCLA',
                'Minnesota': 'MINN',
                'Indiana': 'IND',
                'Oregon': 'ORE',
                'Rutgers': 'RUTG',

                // SEC
                'Auburn': 'AUB',
                'Arkansas': 'ARK',
                'Vanderbilt': 'VAN',
                'Tennessee': 'TENN',
                'Mississippi St': 'MSST',
                'Florida': 'FLA',
                'Georgia': 'UGA', 
                'Alabama': 'ALA',
                'Ole Miss': 'MISS',
                'LSU': 'LSU',
                'Missouri': 'MIZZ',
                'Texas A&M': 'TXAM',
                'Kentucky': 'UK',
                'South Carolina': 'SCAR',
                'Texas': 'TEX',
                'Oklahoma': 'OKLA',


                // ACC
                'North Carolina': 'UNC',
                'Miami Florida': 'MIA',
                'Virginia': 'UVA',
                'Florida State': 'FSU',
                'Duke': 'DUKE',
                'Pittsburgh': 'PITT',
                'Notre Dame': 'ND',
                'Virginia Tech': 'VT',
                'Clemson': 'CLEM',
                'California': 'CAL',
                'Syracuse': 'SYR',
                'Wake Forest': 'WAKE',
                'Georgia Tech': 'GT',
                'SMU': 'SMU',
                'Boston College': 'BC',
                'Stanford': 'STAN',
                'Louisville': 'LOU',

                // BIG 12
                'Baylor': 'BAY',
                'Utah U': 'UTAH',
                'Houston': 'HOU',
                'Oklahoma State': 'OKST',
                'Arizona State': 'ASU',
                'Iowa State': 'ISU',
                'TCU': 'TCU',
                'Cincinnati': 'CIN',
                'Kansas State': 'KSU',
                'Colorado': 'COLO',
                'Texas Tech': 'TTU',
                'UCF': 'UCF',
                'BYU': 'BYU',
                'West Virginia': 'WVU',
                'Kansas': 'KU',
                'Arizona': 'ARIZ',

                // other (fill out as needed)
                'Louisiana Tech': 'LT',
                'Missouri State': 'MOSU',
                'Memphis': 'MEM',
                'North Texas': 'UNT',
                'Oregon State': 'ORST',
                'San Francisco': 'SF',
                'Coastal Carolina': 'CCAR',
                'UL Lafayette': 'ULL',
                'Hawaii': 'HAW',
                'CS Bakersfield': 'CSB',
                'Yale': 'YALE',
                'Dartmouth': 'DART',
                'Ohio': 'OHIO',
                'Miami Ohio': 'MOH',
                'Massachussets': 'MASS',
                'Akron': 'AKR',
                'UNLV': 'UNLV',
                'Boise State': 'BSU',
                'Columbia': 'CLMB',
                'Brown': 'BRWN',
                'Harvard': 'HARV',
                'Villanova': 'VILL',
                'Creighton': 'CREI',
                'Utah State': 'USU',
                'Gonzaga': 'GONZ',
                'Santa Clara': 'SCU',
                'South Florida': 'USF',
                'Florida Atlantic': 'FAU',
                'Drexel': 'DREX',
                'Stony Brook': 'STON',
                'Albine Christian': 'AC',
                'Tarleton St': 'TARL',
                'Old Dominion': 'ODU',
                'Colgate': 'COLG',
                'Xavier': 'XAV',
                'Bowling Green': 'BGSU',
                'Kent State': 'KENT',
                'NC State': 'NCST',
                'Central Michigan': 'CMU',
                'Eastern Michigan': 'EMU',
                'Northern Illinois': 'NIU',
                'Buffalo': 'BUFF',
                'Central Florida': 'UCF',
                'Nevada': '',
                'San Jose State': '',
                'Grand Canyon': '',
                'San Diego State' : 'SDSU',
                'UAB': 'UAB',
                'Temple': 'TEM', 
                'Cleveland State': 'CLEV',
                'Youngstown State': 'YSU',
                'Butler': 'BUT',
                'Georgetown': 'GTWN',
                'VMI': 'VMI',
                'Wofford': 'WOF',
                'Connecticut': 'CONN',
                'Texas State': 'TXST',
                "St. John's": 'SJU',
                'Chattanooga': 'CHAT',
                'The Citadel': 'CIT',
                'Cornell': 'COR',
                'Dayton': 'DAY',
                'Duquesne': 'DUQ',
                'Davidson': 'DAV',
                'Fordham': 'FOR',
                'Marshall': 'MRSH',
                'Coastal Carolina': 'CCAR',
                'Delaware': 'DEL',
                'Middle Tennessee State': 'MTU',
                'Pennsylvania': 'PENN',
                'Air Force': 'AFA',
                'So Mississippi': 'USM',
            },

            // mens olympic hockey 
            WOMHOCKEY: {
                'Finland': 'FIN',
                'Slovakia': 'SVK',
                'Italy': 'ITA',
                'Sweden': 'SWE', 
                'Latvia': 'LVA',
                'USA': 'USA',
                'Czech Republic': 'CZE',
                'Canada': 'CAN',
                'Switzerland': 'CHE',
                'France': 'FRA',
                'Denmark': 'DNK',
                'Germany': 'DEU'
            }
        };
    }

    // main matcher function. builds map of games from each client 
    buildEvents(bet105Events, tickers, league) {
        // find corresponding kalshiMarket for each bet105Event
        for (const event of bet105Events) {
            const kalshiMatch = this.findKalshiMatch(event, tickers, league);

            // if kalshiMatch is found, create gameKey and set maps for 
            if (kalshiMatch) {
                const gameKey = this.createGameKey(event);
                const parsed = this.parseTicker(kalshiMatch);

                // find both kalshi tickers associated with spcific market
                const relatedTickers = tickers.filter(m => m.includes(parsed.teams))
                    .map(m => m);

                // set gamekey for bet105 map
                this.gamesByBet105Id.set(String(event.eventId), gameKey);

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
    findKalshiMatch(bet105Event, tickers, league) {
        // convert bet105 home and away teams to abbreviations to be checked against kalshiTickers
        const home = this.getAbbreviation(bet105Event.homeTeam, league);
        const away = this.getAbbreviation(bet105Event.awayTeam, league);

        // loop through kalshiMarkets, parse the tickers and check whether both home and away abbreviations are included in ticker 
        for (const ticker of tickers) {
            const parsed = this.parseTicker(ticker);

            if (parsed.teams.includes(home) && parsed.teams.includes(away)) {
                return ticker;
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

    // returns league associated with kalshi ticker
    getLeagueFromTicker(ticker) {
        if (ticker.startsWith('KXNBAGAME')) return 'NBA';
        if (ticker.startsWith('KXNHLGAME')) return 'NHL';
        if (ticker.startsWith('KXNFLGAME')) return 'NFL';
        if (ticker.startsWith('KXMLBGAME')) return 'MLB';
        if (ticker.startsWith('KXNCAAMBGAME')) return 'NCAAMB';
        if (ticker.startsWith('KXWOMHOCKEY')) return 'WOMHOCKEY';
        return null;
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