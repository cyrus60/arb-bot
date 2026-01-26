const Bet105Client = require('./bet105');

async function main() {
    const client = new Bet105Client();

    client.connect();

    const eventData = await client.getLiveEventData();

    const liveNhlEvents = client.fetchEventsByLeague(eventData, 4);

    for (const event of liveNhlEvents) {
        client.subscribeToEvent(event, (odds) => {
            console.log(odds);
        });
    }
}

main();
