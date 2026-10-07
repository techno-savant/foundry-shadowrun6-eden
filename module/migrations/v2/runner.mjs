import { SYSTEM_NAME } from "../../constants.js";
import { FLAG_SCOPE } from "./table.mjs";
import { buildEffectKeyMap, planActor, planDelta, planEffect, planTokenBars } from "./plan.mjs";
import { schemaDeclares } from "./schema-paths.mjs";
import { TABLES } from "./tables/index.mjs";

/** fvtt-types only knows core setting keys; our own are registered at init. */
const settings = () => /** @type {any} */ (game.settings);

/** Actor types whose world data this runner migrates. EMPTY in V1a: nothing is switched on. V1b adds "Critter". */
export const ENABLED_TYPES = [];

/** Identifies this migration in the world setting, so each world runs it once. */
export const MIGRATION_ID = "v2-actors-1";

/**
 * Run the legacy -> V2 world migration for the enabled actor types. GM only, once per world per migration id, behind
 * a backup prompt. With no enabled types it returns immediately and touches nothing.
 * @returns {Promise<{ran: boolean, reason?: string}>}
 */
export async function maybeRunV2Migration() {
    if (!ENABLED_TYPES.length) return { ran: false, reason: "no enabled types" };
    if (!game.user?.isGM) return { ran: false, reason: "not a GM" };
    if (settings().get(SYSTEM_NAME, "v2MigrationId") === MIGRATION_ID) return { ran: false, reason: "already migrated" };

    const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize("SR6.Migration.V2.backupTitle") },
        content: `<p>${game.i18n.localize("SR6.Migration.V2.backupContent")}</p>`,
        yes: { label: game.i18n.localize("SR6.Migration.V2.now") },
        no: { label: game.i18n.localize("SR6.Migration.V2.later") },
    });
    if (!confirmed) return { ran: false, reason: "postponed" };

    for (const type of ENABLED_TYPES) await migrateType(type);
    await settings().set(SYSTEM_NAME, "v2MigrationId", MIGRATION_ID);
    ui.notifications.info(game.i18n.localize("SR6.Migration.V2.done"));
    return { ran: true };
}

/** Migrate every world document that belongs to one actor type. Plain dotted-path updates only (same on Foundry 13 and 14). */
async function migrateType(type) {
    const table = TABLES[type];
    const model = CONFIG.Actor.dataModels[type];
    const schema = model?.schema;
    const options = {
        ctx: { skillSpecial: CONFIG.SR6.skill_special },
        isV2Path: schema ? (path) => schemaDeclares(schema, path) : undefined,
    };
    const keyMap = buildEffectKeyMap(table, CONFIG.SR6.EFFECT_CONVERSION_TOV2);

    // world actors, their embedded effects and items' effects, and their prototype tokens
    const actorUpdates = [];
    for (const actor of game.actors.filter((a) => a.type === type)) {
        const { update } = planActor(actor.toObject(), table, options);
        const bars = planTokenBars(actor.prototypeToken.toObject());
        const data = { _id: actor.id, ...update };
        if (bars) for (const [path, value] of Object.entries(bars.update)) data[`prototypeToken.${path}`] = value;
        if (Object.keys(data).length > 1) actorUpdates.push(data);
        await updateEffects(actor.effects, keyMap);
        for (const item of actor.items) await updateEffects(item.effects, keyMap);
    }
    if (actorUpdates.length) await Actor.updateDocuments(actorUpdates);

    // world items' effects that target this type are reached through the same key map
    for (const item of game.items) await updateEffects(item.effects, keyMap);

    // scene tokens: resource bars, and unlinked token deltas
    for (const scene of game.scenes) {
        const updates = [];
        for (const token of scene.tokens) {
            if (token.actor?.type !== type) continue;
            const data = { _id: token.id };
            const bars = planTokenBars(token.toObject());
            if (bars) Object.assign(data, bars.update);
            if (!token.actorLink) {
                const delta = planDelta(token.delta?.toObject().system, table, options);
                if (delta) Object.assign(data, delta.update);
            }
            if (Object.keys(data).length > 1) updates.push(data);
        }
        if (updates.length) await scene.updateEmbeddedDocuments("Token", updates);
    }
}

async function updateEffects(collection, keyMap) {
    const updates = [];
    for (const effect of collection) {
        const plan = planEffect(effect.toObject(), keyMap);
        if (plan) updates.push({ _id: effect.id, ...plan.update });
    }
    if (updates.length) await collection.documentClass.updateDocuments(updates, { parent: collection.parent });
}
