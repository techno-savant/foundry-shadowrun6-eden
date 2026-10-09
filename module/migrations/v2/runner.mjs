import { SYSTEM_NAME } from "../../constants.js";
import { FLAG_SCOPE } from "./table.mjs";
import { buildEffectKeyMap, planActor, planDelta, planEffect, planTokenBars } from "./plan.mjs";
import { schemaDeclares } from "./schema-paths.mjs";
import { TABLES } from "./tables/index.mjs";

/** fvtt-types only knows core setting keys; our own are registered at init. */
const settings = () => /** @type {any} */ (game.settings);

/** Actor types whose world data this runner migrates. V1b-2 switches Critter on; further types are added by their own slices. */
export const ENABLED_TYPES = ["Critter"];

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

/**
 * Migrate every world document that belongs to one actor type. Plain dotted-path updates only (same on Foundry 13 and 14).
 * Note: once the type's model is registered, `actor.toObject().system` is already the migrated and cleaned V2 source, so
 * the actor-system part of the plan has little to add; effects, prototype tokens, scene tokens and token deltas are
 * stored as raw data and are where this run writes.
 */
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
        await updateEffects(actor, keyMap);
        for (const item of actor.items) await updateEffects(item, keyMap);
    }
    if (actorUpdates.length) await Actor.updateDocuments(actorUpdates);

    // World items are not touched: an unowned item's effects apply to whatever actor later owns it (a legacy Player, say), so
    // rewriting their keys here would break them. Critter-owned items are handled above; the rest convert when they land on
    // a V2 actor (migrateData and the effect _preCreate conversion).

    // scene tokens: resource bars, and unlinked token deltas
    for (const scene of game.scenes) {
        const updates = [];
        for (const token of scene.tokens) {
            if (token.actor?.type !== type) continue;
            const data = { _id: token.id };
            const bars = planTokenBars(token.toObject());
            if (bars) Object.assign(data, bars.update);
            if (!token.actorLink) {
                const base = token.baseActor?.toObject().system;
                const delta = planDelta(token.delta?.toObject().system, table, { ...options, base });
                if (delta) Object.assign(data, delta.update);
            }
            if (Object.keys(data).length > 1) updates.push(data);
        }
        if (updates.length) await scene.updateEmbeddedDocuments("Token", updates);
    }
}

/** Rewrite the effect keys of one owner (an Actor or an Item). An embedded collection has no `parent`, so the owner is passed explicitly. */
async function updateEffects(owner, keyMap) {
    const updates = [];
    for (const effect of owner.effects) {
        const plan = planEffect(effect.toObject(), keyMap);
        if (plan) updates.push({ _id: effect.id, ...plan.update });
    }
    if (updates.length) await owner.effects.documentClass.updateDocuments(updates, { parent: owner });
}
