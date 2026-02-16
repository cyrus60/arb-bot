# Live Arbitrage Scanner
This project compares real-time odds from live sporting events between Kalshi and Bet105 to find arbitrage opportunities. Although this project is still a work in progress, it is functional in its current form on the command line, detecting and displaying live arbitrage opportunities from select leagues as they appear. 

## What is arbitrage? 
Arbitrage can occur when the price of a sporting event is inconsistent on two different betting platforms. This allows for execution of a bet on both outcomes of the same event such that you are guaranteed a profit, regardless of the outcome. For example, Team A and Team B play each other in a basketball game. Lets suppose Bet105 has Team A to win priced at 8.99 odds, and Kalshi has Team B to win priced at 1.15. The convergence of these prices on opposite outcomes allows for a guaranteed profit of 1.91%. Meaning if someone with a total stake of $1000 were to bet $113.36 on Team A at 8.99 odds and $886.64 on Team B at 1.15 odds, they would be guaranteed almost $20 of profit regardless of the events outcome.

## How does it work? 
This program leverages websocket connections from both platforms to obtain real time odds data from live events of select leagues, compare the odds, and display relevant arb stats while the arbs are available. Websockets were a requirement of this project from the start, because I wanted the scanner to operate specifically on live events. Live arbitrage has little margin for error, as odds can change multiple times per second during a sporting event, so websocket connections were a must have. 

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

### Flags
| Flag | Required | Description | Default |
|------|----------|-------------|---------|
| `--league` | Yes | League to monitor: `NBA`, `NCAAMB`, `NHL`, `MLB`. Can use multiple times. | - |
| `--threshold` | No | Minimum profit percentage to display | 1.5 |
| `--stake` | No | Total stake per arb in dollars | 1000 |

### Example
```bash
node src/index.js --league NBA --league NCAAMB --stake 1000 --threshold 2
```

## Future plans
In the near future, I plan to continue work on this project and implement a clean, dynamic frontend dashboard for displaying arbs and even logging/storing data for each discovered arb. Will also continue to expand support for more leagues and teams.
