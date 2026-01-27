const Bet105Client = require('./bet105');

async function main() {
    const client = new Bet105Client();

    await client.connect();

    await client.loadLeagues();

    const eventData = await client.getLiveEventData();

    const nbaId = client.getLeagueId('ATP Challenger Concepcion, Chile');

    const liveNbaEvents = client.fetchEventsByLeague(eventData, nbaId.toString());

    for (const event of liveNbaEvents) {
        client.subscribeToEvent(event.eventId, (odds) => {
            console.log(`${event.awayTeam} @ ${event.homeTeam}:`, odds );
        });
    }
}

main();
