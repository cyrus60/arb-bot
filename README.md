# Live Arbitrage Scanner
This project compares real-time odds from live sporting events between Kalshi and Bet105 to find arbitrage opportunities. Although this project is still a work in progress, it is functional in its current form on the command line, detecting and displaying live arbitrage opportunities from select leagues as they appear. 

## What is arbitrage? 
Arbitrage can occur when the price of a sporting event is inconsistent on two different betting platforms. This allows for execution of a bet on both outcomes of the same event such that you are guaranteed a profit, regardless of the outcome. For example, Team A and Team B play each other in a basketball game. Lets suppose Bet105 has Team A to win priced at 8.99 odds, and Kalshi has Team B to win priced at 1.15. The convergence of these prices on opposite outcomes allows for a guaranteed profit of 1.91%. Meaning if someone with a total stake of $1000 were to bet $113.36 on Team A at 8.99 odds and $886.64 on Team B at 1.15 odds, they would be guaranteed almost $20 of profit regardless of the events outcome.

## Tech Stack
- Runtime: Node.js
- Protocols: WebSocket (Native + Socket.io)
- APIs: Kalshi WebSocket API, Bet105 Websocket (reverse-engineered)
- Architecture: Event-driven modular data pipeline (clients -> event matcher -> arbitrage detector)

## How does it work? 
This program utilizes concurrent WebSocket connections to both Kalshi and Bet105 to obtain real time moneyline odds for select live sporting events. Bet105's WebSocket operates on the Socket.io protocol, which maintains state for events by sending a snapshot message on initial subscribe, and subsequently sends diffs (smaller, gzip compressed binary messages) for all odds updates. My Bet105 client handles each diff appropriately on every message received, by decompressing each message and patching each diff to its corresponding state, keeping a real-time map of moneyline odds for each event. Kalshi offers free WebSocket access with an API key, which is also free to generate, so obtaining live event data from their socket was much less of a process. 

On startup, the program fetches active events from both clients and runs them through the EventMatcher class, which cross-references team names, abbreviations, and game dates to link events across platforms in a lookup map. Once matched, incoming updates for odds on either platform triggers the ArbDetector class, which uses the lookup map of events to compare prices/probabilities on opposite outcomes and calculates whether an arbitrage opportunity exists. While an arbitrage opportunity exists, ArbDetector will display necessary stake for each side of the arb (based on --stake arg), as well as the overall profit percentage of the arb. 

## How to run program? 
Unfortunately, as of now, a Kalshi account is required to run the program. Fortunately though, it is free to signup and generate an API key.

### Prerequisites
- Node.js installed
- Kalshi account with API key ([Sign up here](https://kalshi.com))

### Steps on running program
1. Clone the repository and navigate to root directory
2. Run `npm install` to install dependencies 
3. Create a `.env` file in root directory with the following variables: 
```
    KALSHI_API_KEY=your-api-key
    KALSHI_KEY_PATH=/path/to/privatekey.pem
```
4. Run program:
```bash
node src/index.js --league NBA --threshold 2.5 --stake 1000
```
> **Note:** Ensure there are live events in progress for given leagues in order for the scanner to work properly. If no events are found, the scanner refreshes for new live events every 10 minutes and will monitor them as they begin. 

### Flags
| Flag | Required | Description | Default |
|------|----------|-------------|---------|
| `--league` | Yes | League to monitor: `NBA`, `NCAAMB`, `NHL`, `MLB`. Can use multiple times. | - |
| `--threshold` | No | Minimum profit percentage to display | 1.5 |
| `--stake` | No | Total stake per arb in dollars | 1000 |

### Example
```bash
node src/index.js --league NBA --league NCAAMB --stake 1000 --threshold 1.5
```

## Future plans
- Implement clean, dynamic frontend dashboard for displaying arbs 
- Implmenent support for spread and total markets
- Expand support for more leagues and teams