/**
 * Which Edge mode a chat card's dice tooltip opens in. Only a message that carries an Eden roll (`rolls[0]`) can be edged: cards
 * posted by modules that copy the card markup (for example umbral6 summoning cards) are plain messages with no rolls.
 * @param {any} roll                The message's first roll, if any
 * @param {{uuid?: string}|undefined} speakerActor      The actor that spoke the message
 * @param {{uuid?: string, isOwner?: boolean}|undefined} selectedActor   The actor selected by the clicking user
 * @returns {"own"|"opponent"|null} "own" when the speaker's owner clicks and no Edge was used yet, "opponent" for another owned
 *                                  actor and no opponent Edge used yet, otherwise null
 */
export function edgeTooltipMode(roll, speakerActor, selectedActor) {
    if (!roll || !selectedActor?.isOwner) return null;
    if (speakerActor?.uuid === selectedActor.uuid) return roll.finished?.edge_use ? null : "own";
    return roll.finished?.edge_use_opponent ? null : "opponent";
}
