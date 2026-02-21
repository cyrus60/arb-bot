const WebSocket = require('ws');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const sleep = require('sleep-promise');

class KalshiClient {
    constructor(apiKey, privKeyPath) {
        // keys for kalshi auth
        this.apiKey = apiKey;
        this.privateKey = fs.readFileSync(path.resolve(privKeyPath), 'utf8');

        this.socket = null;
        this.messageId = 1;

        // stores callback function for subscription updates
        this.callback = null;

        // stores map from ticker to orderbook
        this.orderBooks = new Map();

        // cache for tickers for live events        
        this.tickers = new Set();

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

    // connects to websocket 
    async start() {
        await this.connect();
        
        // initial subscribe to collect ticker data
        this.socket.send(JSON.stringify({
            id: this.id++,
            cmd: 'subscribe',
            params: {
                channels: ['ticker']
            }
        }));
    }

    // subscribe to orderbook updates for select tickers
    subscribe(callback) {
        // set callback to handle odds updates
        this.callback = callback;

        this.socket.send(JSON.stringify({
            id: this.id++,
            cmd: 'subscribe',
            params: {
                channels: ['orderbook_snapshot', 'orderbook_delta'],
                market_tickers: [...this.tickers]
            }
        }));
    }

    // handler function for websocket messages
    handleMessage(data) {
        const msg = JSON.parse(data);

        if (!msg.msg) return;

        const ticker = msg.msg.market_ticker;

        // hnadles ticker messages - if ticker is of a league filter, cache it for use later
        if (msg.type === 'ticker') {
            // filter tickers based on league filter and todays date
            const matchesLeaugue = this.leagues.some(prefix => ticker.startsWith(prefix) && ticker.includes(this.getTodayString()));

            if (matchesLeaugue && !ticker.includes('SPREAD') && !ticker.includes('TOTAL')) {
                this.tickers.add(ticker);
            }
        }

        // cache orderbook snapshot under tickers
        if ((msg.type === 'orderbook_snapshot') && this.callback) {            
            this.orderBooks.set(ticker, {

                // map price and quantity of bids on each side of market (yes/no)
                yes: new Map(msg.msg.yes),
                no: new Map(msg.msg.no)
            })

            this.emitPrices(ticker);

        } else if ((msg.type === 'orderbook_delta') && this.callback) {
            const book = this.orderBooks.get(ticker);
            if (!book) return;

            // retrieve side of delta update (yes/no), 
            const side = msg.msg.side === 'yes' ? book.yes : book.no;

            const price = msg.msg.price;

            // represents movement in quantity available at price 
            const delta = msg.msg.delta;

            const currentQty = side.get(price) || 0;
            const qty = currentQty + delta;

            // if updated quantity at price is less than 0, remove price, else update the quantity in map
            if (qty <= 0) {
                side.delete(price);
            } else {
                side.set(price, qty);
            }

            this.emitPrices(ticker);
        }
    }

    // calculates yesAsk from given ticker and calls callback on data
    emitPrices(ticker) {
        const book = this.orderBooks.get(ticker);
        if (!book || !this.callback) return;
 
        const yesBid = book.yes.size ? Math.max(...book.yes.keys()) : null;
        const noBid = book.no.size ? Math.max(...book.no.keys()) : null;

        // yesAsk represents available price for yes
        const yesAsk = noBid ? (100 - noBid) : null;

        // liquidity at display price
        const liquidityAtAsk = noBid ? book.no.get(noBid) : 0;

        this.callback({
            ticker,
            yesBid,
            yesAsk,
            liquidityAtAsk,
            winningTeam: ticker.split('-')[2]
        })
    }

    // add league to filter, waits for markets to populate cache, and returns markets for given leagues
    async addLeague(league) {
        if (!this.leagues.includes(league)) {
            this.leagues.push(league);
            // pause to collect markets 
            await sleep(10000);
        }
    }

    // remove league from filter
    removeLeague(leaguePrefix) {
        const index =  this.leagues.indexOf(leaguePrefix);
        if (index > -1) {
            this.leagues.splice(index, 1);
        }
    }

    // retrieves todays date in kalshi format
    getTodayString() {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const month = months[now.getMonth()];
        const year = String(now.getFullYear()).slice(-2);
        
        return `${year}${month}${day}`;  // e.g., "26FEB12"
    }

    // retrieve tickers of live events for select leagues -- MAY NOT NEED
    getTickers() {
        return [...this.tickers];
    }
}

module.exports = KalshiClient;