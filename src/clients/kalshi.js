const WebSocket = require('ws');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

class KalshiClient {
    constructor(apiKey, privKeyPath) {
        // keys for kalshi auth
        this.apiKey = apiKey;
        this.privateKey = fs.readFileSync(path.resolve(privKeyPath), 'utf8');

        this.socket = null;
        this.messageId = 1;

        // stores callback function for subscription updates
        this.callback = null;

        // keeps track of markets and their current states
        this.marketStates = new Map();

        // acts as filter for leagues to subscribe to live events for 
        this.leagues = [];
    }

    // create Kalshi signature
    sign(timestamp, method, path) {
        const message = timestamp + method + path;
        const sign = crypto.createSign('RSA-SHA256');

        sign.update(message);
        sign.end();
        return sign.sign({
            key: this.privateKey,
            padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
            saltLength: crypto.constants.RSA_PSS_SALTEN_DIGEST
        }, 'base64');
    }

    // connect/authenticate to kalshi websocket using signature
    async connect() {
        return new Promise((resolve, reject) => {
            const timeStamp = Date.now().toString();
            const method = 'GET';
            const path = '/trade-api/ws/v2';

            const signature = this.sign(timeStamp, method, path);

            this.socket = new WebSocket('wss://api.elections.kalshi.com/trade-api/ws/v2', {
                headers: {
                    'KALSHI-ACCESS-KEY': this.apiKey,
                    'KALSHI-ACCESS-SIGNATURE': signature,
                    'KALSHI-ACCESS-TIMESTAMP': timeStamp
                }
            });

            this.socket.on('open', () => {
                console.log('Connected to Kalshi');
                resolve();
            })

            this.socket.on('error', (err) => {
                console.error('Kalshi connection error: ', err);
                reject(err);
            })

            // call handler function for each received message
            this.socket.on('message', (data) => {
                this.handleMessage(data);
            })
        });
    }

    // preforms all necesarry operations necesarry before subscribing to markets
    async start(league) {
        await this.connect();

        // add league to filter
        this.addLeague(league);

        // empty susbcribe callback just to fetch markets for buildEvents function
        this.subscribe(() => {});

        // wait to collect markets
        await sleep(10000);

        return this.getMarkets();
    }

    // subscribe to market odds updates
    subscribe(callback) {
        // set callback to handle odds updates
        this.callback = callback;

        this.socket.send(JSON.stringify({
            id: this.id++,
            cmd: 'subscribe',
            params: {
                channels: ['ticker']
            }
        }));
    }

    // handler function for websocket messages
    handleMessage(data) {
        const msg = JSON.parse(data);

        if(msg.type === 'ticker' && this.callback) {
            const ticker = msg.msg.market_ticker;

            // split ticker into ticker-marketId-winningTeam
            const tickerSplit = ticker.split('-');
            const marketId = tickerSplit[1];

            // price represents a yes win wager on team at this index
            const winningTeam = tickerSplit[2];

            // filter tickers based on set league filters 
            const matchesLeaugue = this.leagues.some(prefix => ticker.startsWith(prefix));

            // if event is of a league in the league filter, cache it and call callback on marketData
            if (matchesLeaugue) {
                // cache event state
                this.marketStates.set(ticker, {
                    ticker: ticker,
                    id: marketId,
                    winningTeam: winningTeam,
                    price: msg.msg.price,
                    noPrice: 100 - msg.msg.price,
                    yesBid: msg.msg.yes_bid,
                    yesAsk: msg.msg.yes_ask,
                    volume: msg.msg.volume,
                    timestamp: msg.msg.startsWith
                });

                this.callback(this.marketStates.get(ticker));
            }
        }
    }

    // add league to filter 
    addLeague(leaguePrefix) {
        if (!this.leagues.includes(leaguePrefix)) {
            this.leagues.push(leaguePrefix);
        }
    }

    // remove league from filter
    removeLeague(leaguePrefix) {
        const index =  this.leagues.indexOf(leaguePrefix);
        if (index > -1) {
            this.leagues.splice(index, 1);
        }
    }
    
    // returns market state of given ticker 
    getMarketState(ticker) {
        return this.marketStates.get(ticker);
    }

    // returns all markets in cache
    getMarkets() {
        return Array.from(this.marketStates.values());
    }
}

module.exports = KalshiClient;