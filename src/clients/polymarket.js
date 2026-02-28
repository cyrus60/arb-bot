const WebSocket = require('ws');

class PolymarketClient {
    constructor() {
        this.socket = null;

        // store callback for ws messages
        this.callback = null;

        // orderbook state for every subscribed event
        this.orderBook = new Map();

        // maps assetId of outcome to winning team of outcome
        this.idMap = new Map();
    }

    // connect to ws 
    async connect() {
        return new Promise((resolve, reject) => {
            this.socket = new WebSocket('wss://ws-subscriptions-clob.polymarket.com/ws/market');

            this.socket.on('open', () => {
                console.log('Connected to Polymarket');
                resolve();
            });

            // call handler on every ws message
            this.socket.on('message', (data) => this.handler(data));
            
            this.socket.on('error', (err) => reject(err));
        });
    }

    async start() {

    }

    // subscribes to ws updates for live events in select league
    async subscribeToLeague(league, callback) {
        this.callback = callback;

        // retrieve series id for given league
        const seriesId = await this.getSeriesId(league);

        // retrieve events of given league using seriesId
        const events = await this.getLeagueEvents(seriesId);

        // store Ids of every ml market for every event of league
        const assetIds = [];
        
        for (const event of events) {
            if (!event.live) continue;

            // cache asset ids of live events
            for (const market of event.markets) {
                if (market.sportsMarketType === 'moneyline') {
                    assetIds.push(...JSON.parse(market.clobTokenIds));

                    // store assetId for each outcome of event 
                    this.idMap.set(JSON.parse(market.clobTokenIds)[0], {
                        market: market.conditionId,
                        slug: event.slug,
                        team: JSON.parse(market.outcomes)[0]
                    });

                    this.idMap.set(JSON.parse(market.clobTokenIds)[1], {
                        market: market.conditionId,
                        slug: market.slug,
                        team: JSON.parse(market.outcomes)[1]
                    });
                }
            }
        }

        // send subscribe message via socket
        this.socket.send(JSON.stringify({
            assets_ids: assetIds,
            type: 'market'
        }));
    }

    // handler function for ws messages 
    async handler(msg) {
        // handle server heartbeat
        if(msg.toString() === 'ping') { 
            this.socket.send('pong');
            return;
        }

        // parse raw ws message
        const data = JSON.parse(msg);

        // handle initial orderbook snapshot -- snapshots come as array of objects 
        if (Array.isArray(data)) {

            // loop through every book in snapshot
            for (const book of data) {
                // retrieve asset and market id from assetId map
                const assetInfo = this.idMap.get(book.asset_id);

                // set existing orderbook data, or empty obj if no orderbook yet
                const existing = this.orderBook.get(book.market) || {};

                // store orderbook data under team that corresponds with given assetId
                existing[assetInfo.team] = {
                    assetId: book.asset_id,
                    bestAsk: parseFloat(book.asks[0]?.price),
                    bestBid: parseFloat(book.bids[book.bids.length - 1]?.price)
                };

                // store snapshot data under marketId key
                this.orderBook.set(book.market, existing);
            }
            return;
        }

        // handle price changes for orderbook -- update state
        if (data.event_type === 'price_change') {

            // price changes for each event come in a length 2 array, 1st index being away team price change, 2nd home team
            for (const changes of data.price_changes) {

            }
        }

        // ?
        this.callback(data);
    }

    // return series ids for given league
    async getSeriesId(league) {
        // fetch league data from REST API
        const res = await (await fetch('https://gamma-api.polymarket.com/sports')).json();
        
        // return series id for given league
        return res.filter(l => l.sport === league)[0].series;
    }

    // return data for live events in given leagues 
    async getLeagueEvents(seriesId) {
        const res = await fetch(
            `https://gamma-api.polymarket.com/events?series_id=${seriesId}&active=true&closed=false`
        );
        return res.json();
    }
}

module.exports = PolymarketClient;