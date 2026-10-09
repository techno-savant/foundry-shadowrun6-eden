import { FLAG_SCOPE, getPath } from "./table.mjs";

/**
 * Restore what the V2 migration rewrote and kept a copy of: effect `changes` (flags.<scope>.v1Changes) and token
 * bars (flags.<scope>.v1Bars), for every world actor of `type`, its embedded effects, prototype token and scene tokens.
 * Actor data itself rolls back by reverting the code, because the old keys are never deleted. Edits made after
 * migration don't carry back.
 * @param {string} type   Legacy actor type, for example "Critter"
 * @returns {Promise<{effects: number, tokens: number}>}
 */
export async function rollbackV2(type) {
    if (!game.user?.isGM) throw new Error("SR6E | rollbackV2 is GM only");
    let effects = 0;
    let tokens = 0;

    const restoreEffects = async (owner) => {
        const updates = [];
        for (const effect of owner.effects) {
            const changes = getPath(effect.flags ?? {}, `${FLAG_SCOPE}.v1Changes`);
            if (changes) updates.push({ _id: effect.id, changes });
        }
        if (updates.length) await owner.effects.documentClass.updateDocuments(updates, { parent: owner });
        effects += updates.length;
    };
    const barUpdate = (doc) => {
        const old = getPath(doc.flags ?? {}, `${FLAG_SCOPE}.v1Bars`);
        if (!old) return null;
        return Object.fromEntries(Object.entries(old).map(([bar, attribute]) => [`${bar}.attribute`, attribute]));
    };

    for (const actor of game.actors.filter((a) => a.type === type)) {
        await restoreEffects(actor);
        for (const item of actor.items) await restoreEffects(item);
        const update = barUpdate(actor.prototypeToken);
        if (update) {
            await actor.update(Object.fromEntries(Object.entries(update).map(([k, v]) => [`prototypeToken.${k}`, v])));
            tokens++;
        }
    }
    for (const scene of game.scenes) {
        const updates = [];
        for (const token of scene.tokens) {
            if (token.actor?.type !== type) continue;
            const update = barUpdate(token);
            if (update) updates.push({ _id: token.id, ...update });
        }
        if (updates.length) await scene.updateEmbeddedDocuments("Token", updates);
        tokens += updates.length;
    }
    return { effects, tokens };
}
