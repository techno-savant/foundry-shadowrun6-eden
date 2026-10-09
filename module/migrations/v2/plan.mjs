import { FLAG_SCOPE, getPath, hasPath, leafPaths, setPath } from "./table.mjs";
import { applyV2Renames } from "./renames.mjs";

/**
 * The world-migration planner. Pure: it takes document data and returns the updates to write, so the runner stays
 * thin and the rig tools can run it on fixtures. Old keys are never deleted (they are the rollback copy), so every
 * plan only adds or overwrites V2 paths and v1 flags.
 */

const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Token bar attribute paths that move with the V2 health schema. */
export const BAR_MAP = Object.freeze({ physical: "health.physicalCM", stun: "health.stunCM" });

/**
 * Plan one actor.
 * @param {{system?: object, flags?: object}} actorData
 * @param {object[]} table
 * @param {{ctx?: object, isV2Path?: (path: string) => boolean}} [options]   as for applyV2Renames
 * @returns {{update: Record<string, any>, report: object}}   `update` uses dotted paths (system.* and flags.*)
 */
export function planActor(actorData, table, { ctx, isV2Path } = {}) {
    const original = actorData.system ?? {};
    const result = applyV2Renames(structuredClone(original), table, { partial: false, ctx, isV2Path });
    const update = {};
    for (const leaf of leafPaths(result.source)) {
        const value = getPath(result.source, leaf);
        if (!sameValue(getPath(original, leaf), value)) update[`system.${leaf}`] = value;
    }
    const v1 = { ...result.v1 };
    const existing = getPath(actorData.flags ?? {}, `${FLAG_SCOPE}.v1`) ?? {};
    for (const [path, value] of Object.entries(v1)) {
        if (!hasPath(existing, path)) update[`flags.${FLAG_SCOPE}.v1.${path}`] = value;
    }
    return { update, report: { clamped: result.clamped, unknown: result.unknown, derived: result.derived, skipped: result.skipped } };
}

/**
 * Build the effect key map. Precedence (design Decision 5a): an explicit `effectTo` (including `null`) wins, then a `keep`
 * entry, then the upstream conversion (CONFIG.SR6.EFFECT_CONVERSION_TOV2), and a `rename` entry fills only the keys neither
 * names. A conversion says what an effect MODIFIES (usually a modifier); a data rename says where a stored value LIVES, so a
 * data rename never overrides the conversion (edge.max stays `edge.mod`, not `edge.rank`).
 * `null` means "no target": planEffect leaves the key alone and logs it. `key-coverage --targets` guards the final map.
 * @param {object[]} table
 * @param {Record<string, string>} [conversion]
 * @returns {Record<string, string|null>}
 */
export function buildEffectKeyMap(table, conversion = {}) {
    const map = { ...conversion };
    for (const entry of table) {
        const key = `system.${entry.from}`;
        if (entry.effectTo !== undefined) map[key] = entry.effectTo === null ? null : `system.${entry.effectTo}`;
        // Only plain renames and keeps: a transform changes the value's meaning (physical.dmg -> boxes remaining), so an effect on it can't just move
        else if (entry.kind === "keep") map[key] = key;
        // A rename only fills a gap in the conversion (Decision 5a)
        else if (entry.kind === "rename" && entry.to && !(key in map)) map[key] = `system.${entry.to}`;
    }
    return map;
}

/**
 * Plan one effect: rewrite `changes[].key` through the map and keep the originals in flags.<scope>.v1Changes.
 * @returns {{update: Record<string, any>}|null}   null when nothing changes
 */
export function planEffect(effectData, keyMap) {
    const changes = effectData.changes ?? [];
    const moved = (key) => typeof keyMap[key] === "string" && keyMap[key] !== key;
    for (const change of changes) {
        if (keyMap[change.key] === null) console.warn(`SR6E | v2 migration: effect "${effectData.name}" changes ${change.key}, which has no V2 target; left as is`);
    }
    if (!changes.some((c) => moved(c.key))) return null;
    const update = { changes: changes.map((c) => ({ ...c, key: moved(c.key) ? keyMap[c.key] : c.key })) };
    if (!hasPath(effectData.flags ?? {}, `${FLAG_SCOPE}.v1Changes`)) update[`flags.${FLAG_SCOPE}.v1Changes`] = structuredClone(changes);
    return { update };
}

/** Apply a planEffect result to a full effect object (delta effects are replaced whole, not updated by path). */
function withEffectPlan(effect, plan) {
    const out = structuredClone(effect);
    out.changes = plan.update.changes;
    const v1 = plan.update[`flags.${FLAG_SCOPE}.v1Changes`];
    if (v1) setPath(out, `flags.${FLAG_SCOPE}.v1Changes`, v1);
    return out;
}

/**
 * Plan the effects that live in an unlinked token's delta: `delta.effects` and each `delta.items[i].effects`. They are stored
 * on the token, not on the actor, so the actor pass never sees them, and an old key would silently stop applying. Arrays are
 * sent whole because Foundry replaces arrays in an update; originals stay in each effect's flags.<scope>.v1Changes.
 * @param {{effects?: object[], items?: {effects?: object[]}[]}} delta   token.delta.toObject()
 * @param {Record<string, string|null>} keyMap   from buildEffectKeyMap
 * @returns {{update: Record<string, any>}|null}   null when nothing changes
 */
export function planDeltaEffects(delta, keyMap) {
    if (!delta) return null;
    const rewrite = (effects) => {
        let changed = false;
        const out = (effects ?? []).map((effect) => {
            const plan = planEffect(effect, keyMap);
            if (!plan) return effect;
            changed = true;
            return withEffectPlan(effect, plan);
        });
        return changed ? out : null;
    };
    const update = {};
    const effects = rewrite(delta.effects);
    if (effects) update["delta.effects"] = effects;
    let itemsChanged = false;
    const items = (delta.items ?? []).map((item) => {
        const itemEffects = rewrite(item.effects);
        if (!itemEffects) return item;
        itemsChanged = true;
        return { ...item, effects: itemEffects };
    });
    if (itemsChanged) update["delta.items"] = items;
    return Object.keys(update).length ? { update } : null;
}

/**
 * Plan a token's resource bars (prototype tokens and scene tokens share the shape): physical -> health.physicalCM,
 * stun -> health.stunCM, with the old attribute kept in flags.<scope>.v1Bars.
 * @returns {{update: Record<string, any>}|null}
 */
export function planTokenBars(tokenData) {
    const update = {};
    const old = {};
    for (const bar of ["bar1", "bar2"]) {
        const attribute = tokenData[bar]?.attribute;
        if (attribute && BAR_MAP[attribute]) {
            update[`${bar}.attribute`] = BAR_MAP[attribute];
            old[bar] = attribute;
        }
    }
    if (!Object.keys(update).length) return null;
    if (!hasPath(tokenData.flags ?? {}, `${FLAG_SCOPE}.v1Bars`)) update[`flags.${FLAG_SCOPE}.v1Bars`] = old;
    return { update };
}

/**
 * Plan an unlinked token's delta: rewrite old-name keys inside `delta.system`, so a delta never carries old keys
 * that a rebuilt synthetic actor would merge over the migrated base. A delta with legacy monitor damage gets
 * `health.<m>CM.pendingDamage` and a null `value` (no base needed; design Decision 5c), so the token keeps its own damage.
 * @param {object} deltaSystem
 * @param {object[]} table
 * @param {{ctx?: object, isV2Path?: (path: string) => boolean}} [options]
 * @returns {{update: Record<string, any>}|null}
 */
export function planDelta(deltaSystem, table, { ctx, isV2Path } = {}) {
    if (!deltaSystem || !Object.keys(deltaSystem).length) return null;
    const result = applyV2Renames(structuredClone(deltaSystem), table, { partial: true, ctx, isV2Path });
    // A delta carrying legacy damage and no V2 value of its own: record the damage as pending and null the value, so the
    // base actor's settled number can't win the merge. No base context is needed (Decision 5c); a delta with its own V2
    // value makes the transform return nothing and is left alone.
    for (const entry of table) {
        if (entry.kind !== "transform" || !entry.translateTo || !hasPath(deltaSystem, entry.from)) continue;
        const out = entry.transform(deltaSystem, ctx ?? {}, { partial: true });
        if (!out || !("value" in out)) continue;
        setPath(result.source, entry.to, out.value);
        setPath(result.source, entry.translateTo, null);
    }
    const update = {};
    for (const leaf of leafPaths(result.source)) {
        const value = getPath(result.source, leaf);
        if (!sameValue(getPath(deltaSystem, leaf), value)) update[`delta.system.${leaf}`] = value;
    }
    return Object.keys(update).length ? { update } : null;
}
