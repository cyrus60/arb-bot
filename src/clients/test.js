const Bet105Client = require('./bet105');
const KalshiClient = require('./kalshi');

const kalshiAPIKey = '';
const pathToPrivKey = '/home/cyrus/keys/arbkey.pem';

// KALSHI
async function main() {
    const client = new KalshiClient(
        kalshiAPIKey,
        pathToPrivKey
    )

    client.connect();

    const liveSports = client.getLiveSports();

    console.log(liveSports);
}

// BET105
// async function main() {
//     const client = new Bet105Client();

//     // connect to bet105 socket
//     await client.connect();

//     // cache league information/ids
//     await client.loadLeagues();

//     // retrieve eventIds of all live evenets
//     const eventData = await client.getLiveEventData();

//     // find leagueId of specified league
//     const nbaId = client.getLeagueId('College Basketball');

//     // retrieve eventIds of given league
//     const liveNbaEvents = client.fetchEventsByLeague(eventData, nbaId.toString());

//     // subscribe to each live event in given league
//     for (const event of liveNbaEvents) {
//         client.subscribeToEvent(event.eventId, (odds) => {
//             console.log(`${event.awayTeam} @ ${event.homeTeam}:`, odds );
//         });
//     }
// }

main();
