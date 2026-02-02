const WebSocket = require('ws');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

class KalshiClient {
    constructor(apiKey, privKeyPath) {
        this.apiKey = apiKey;
        this.privateKey = fs.readFileSync(path.resolve(privKeyPath), 'utf8');
        this.socket = null;
        this.messageId = 1;
        this.marketCallbacks = new Map();
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
                console.log('connected to Kalshi');
                resolve();
            })

            this.socket.on('error', (err) => {
                console.error('Kalshi connection error: ', err);
                reject(err);
            })

            this.socket.on('message', (data) => {
                this.handleMessage(data);
            })
        });
    }

    async getLiveSports() {
        const url = 'https://api.elections.kalshi.com/trade-api/v2/markets?status=open&limit=1000';
        
    }

    subscribe(ticker, callback) {

    }

    handleMessage(data) {
        const msg = JSON.parse(data);

        if(msg.type === 'ticker') {
            const ticker = msg.msg.market_ticker;
            const callback = this.marketCallbacks.get(ticker);

            if (callback) {
                callback({
                    
                })
            }
        }
    }
    
}

module.exports = KalshiClient;