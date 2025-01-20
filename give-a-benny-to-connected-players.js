main();

async function main() {

    let players = game.users.players; // Get players among all users
    let actors = game.actors; // Get all actors
    let activePlayerActors = 0;

    // Parse players
    for (let player of players) {

        // Check if the player is currently connected to the world
        if (player.active) {

            // Parse actors
            for (let actor of actors) {

                // Get actor's owner IDs
                let ownerIds = Object.getOwnPropertyNames(actor.ownership);
                
                // Check if the connected player ID in the list of actor's owner IDs
                let belongsToThePlayer = ownerIds.includes(player.id);
        
                // If the actor belongs to the connected player
                if (belongsToThePlayer){

                    // Get actor's current number of bennies
                    let b = actor.system.bennies.value;

                    // Give a benny to actor (should refresh counters in the UI)
                    await actor.update({
                        "system.bennies.value": b + 1,
                      });
                    
                    // Count one new rewared actor (for later benny animation)
                    activePlayerActors++;
                }
            }
        }
    }

    // If Dice So Nice! module is installed
    // https://gitlab.com/riccisi/foundryvtt-dice-so-nice/-/wikis/API/Roll
    if (game.dice3d) {
        
        // Build a roll with a benny for each actor of connected players
        let r = await new Roll(activePlayerActors + "db").evaluate();
        
        // Show 3D roll benny animation for GM and connected players
        game.dice3d.showForRoll(r,game.user,true);
    }

    let gmActor = game.actors.getName('Meneur de jeu'); // Get GM dedicated actor
    let gmSpeaker = ChatMessage.getSpeaker({gmActor}); // create a speaker for GM dedicated actor

    // Show a message in chat to tell players that each of them win a benny
    ChatMessage.create({
        content: 'Vous gagnez tous un Jeton !',
        speaker: gmSpeaker
    });

}