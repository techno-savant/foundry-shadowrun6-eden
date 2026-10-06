import { FLAG_SCOPE, getPath, hasPath, leafPaths } from "./table.mjs";
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
    for (const [path, value] of Object.entries(result.settle)) {
        if (hasPath(original, path) && !sameValue(getPath(original, path), value)) {
            if (!(path in v1)) v1[path] = getPath(original, path);
            update[`system.${path}`] = value;
        }
    }
    const existing = getPath(actorData.flags ?? {}, `${FLAG_SCOPE}.v1`) ?? {};
    for (const [path, value] of Object.entries(v1)) {
        if (!hasPath(existing, path)) update[`flags.${FLAG_SCOPE}.v1.${path}`] = value;
    }
    return { update, report: { clamped: result.clamped, unknown: result.unknown, derived: result.derived, skipped: result.skipped } };
}

/**
 * Build the effect key map: every legacy `system.<from>` that moves, plus extra upstream conversions
 * (CONFIG.SR6.EFFECT_CONVERSION_TOV2). The table wins where both name a key.
 * @param {object[]} table
 * @param {Record<string, string>} [conversion]
 * @returns {Record<string, string>}
 */
export function buildEffectKeyMap(table, conversion = {}) {
    const map = { ...conversion };
    for (const entry of table) {
        if (entry.to && entry.to !== entry.from && ["rename", "transform"].includes(entry.kind)) map[`system.${entry.from}`] = `system.${entry.to}`;
    }
    return map;
}

/**
 * Plan one effect: rewrite `changes[].key` through the map and keep the originals in flags.<scope>.v1Changes.
 * @returns {{update: Record<string, any>}|null}   null when nothing changes
 */
export function planEffect(effectData, keyMap) {
    const changes = effectData.changes ?? [];
    if (!changes.some((c) => keyMap[c.key] !== undefined && keyMap[c.key] !== c.key)) return null;
    const update = { changes: changes.map((c) => ({ ...c, key: keyMap[c.key] ?? c.key })) };
    if (!hasPath(effectData.flags ?? {}, `${FLAG_SCOPE}.v1Changes`)) update[`flags.${FLAG_SCOPE}.v1Changes`] = structuredClone(changes);
    return { update };
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
 * that a rebuilt synthetic actor would merge over the migrated base.
 * @param {object} deltaSystem
 * @param {object[]} table
 * @param {{ctx?: object, isV2Path?: (path: string) => boolean}} [options]
 * @returns {{update: Record<string, any>}|null}
 */
export function planDelta(deltaSystem, table, { ctx, isV2Path } = {}) {
    if (!deltaSystem || !Object.keys(deltaSystem).length) return null;
    const result = applyV2Renames(structuredClone(deltaSystem), table, { partial: true, ctx, isV2Path });
    const update = {};
    for (const leaf of leafPaths(result.source)) {
        const value = getPath(result.source, leaf);
        if (!sameValue(getPath(deltaSystem, leaf), value)) update[`delta.system.${leaf}`] = value;
    }
    return Object.keys(update).length ? { update } : null;
}
