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
    // delta effects of unlinked tokens come back from each effect's v1Changes, arrays sent whole
    const restoreDeltaEffects = (effects) => {
        let changed = false;
        const out = (effects ?? []).map((effect) => {
            const changes = getPath(effect.flags ?? {}, `${FLAG_SCOPE}.v1Changes`);
            if (!changes) return effect;
            changed = true;
            return { ...effect, changes };
        });
        return changed ? out : null;
    };
    for (const scene of game.scenes) {
        const updates = [];
        for (const token of scene.tokens) {
            if (token.actor?.type !== type) continue;
            const update = barUpdate(token) ?? {};
            if (!token.actorLink) {
                const delta = token.delta?.toObject();
                const deltaEffects = restoreDeltaEffects(delta?.effects);
                if (deltaEffects) update["delta.effects"] = deltaEffects;
                let itemsChanged = false;
                const items = (delta?.items ?? []).map((item) => {
                    const itemEffects = restoreDeltaEffects(item.effects);
                    if (!itemEffects) return item;
                    itemsChanged = true;
                    return { ...item, effects: itemEffects };
                });
                if (itemsChanged) update["delta.items"] = items;
            }
            if (Object.keys(update).length) {
                updates.push({ _id: token.id, ...update });
                tokens++;
            }
        }
        if (updates.length) await scene.updateEmbeddedDocuments("Token", updates);
    }
    return { effects, tokens };
}
