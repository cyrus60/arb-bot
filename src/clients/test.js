const Bet105Client = require('./bet105');

async function main() {
    const client = new Bet105Client();

    await client.connect();

    const eventData = await client.getLiveEventData();

    const liveNbaEvents = client.fetchEventsByLeague(eventData, '28883');

    for (const event of liveNbaEvents) {
        client.subscribeToEvent(event.eventId, (odds) => {
            console.log(`${event.awayTeam} @ ${event.homeTeam}:`, odds );
        });
    }
}

main();
