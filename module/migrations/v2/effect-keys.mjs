import { buildEffectKeyMap } from "./plan.mjs";
import { TABLES } from "./tables/index.mjs";

const keyMaps = new Map();
const warned = new Set();

/** True for an actor type that has a rename table (Critter in V1b-2). */
export const hasEffectTable = (actorType) => Object.hasOwn(TABLES, actorType);

/**
 * The effect key map for an actor type. A type with a rename table gets the same map the world migration uses
 * (`buildEffectKeyMap(table, generic)`), so an effect that reaches a Critter later, by any path, resolves to the same keys as
 * a migrated one (design Decision 5b). Other types get the generic upstream conversion. `null` entries mean "no target".
 * @param {string} actorType
 * @returns {Record<string, string|null>}
 */
export function effectKeyMapFor(actorType) {
    const table = TABLES[actorType];
    if (!table) return CONFIG.SR6.EFFECT_CONVERSION_TOV2;
    if (!keyMaps.has(actorType)) keyMaps.set(actorType, buildEffectKeyMap(table, CONFIG.SR6.EFFECT_CONVERSION_TOV2));
    return keyMaps.get(actorType);
}

/**
 * Resolve one effect key for an actor type.
 * @param {string} actorType
 * @param {string} key
 * @returns {{key: string}|{skip: true}}   the key to apply (mapped or unchanged), or "skip" when the map says there is no target
 */
export function resolveEffectKey(actorType, key) {
    const map = effectKeyMapFor(actorType);
    if (!Object.hasOwn(map, key)) return { key };
    const target = map[key];
    return target === null ? { skip: true } : { key: target };
}

/**
 * V2 actors with a rename table (Critter): move an effect change that still carries a legacy key to its V2 key, or drop it when
 * the key has no target. Changes the in-memory clone only. Other V2 actors, and keys that are already V2, pass through.
 *
 * A plain module-level function on purpose: Foundry runs `prepareData` (and so `applyActiveEffects`) inside the base Document
 * constructor, before a subclass's private methods exist on `this`, so a `#private` method of the actor class cannot be used
 * there (an unlinked token's synthetic actor is built that way). Nothing in the prepare chain may use `this.#...`.
 * @param {string} actorType
 * @param {{key: string, effect: {name: string}}} change
 * @returns {boolean} false when the change must be skipped
 */
export function translateChangeKey(actorType, change) {
    if (!hasEffectTable(actorType) || !change.key.startsWith("system.")) return true;
    const resolved = resolveEffectKey(actorType, change.key);
    if ("skip" in resolved) {
        warnOnce(`skip:${change.effect.name}:${change.key}`, `SR6E | the effect "${change.effect.name}" changes ${change.key}, which has no equivalent on a ${actorType} and was skipped`);
        return false;
    }
    change.key = resolved.key;
    return true;
}

/** Log a warning once per label per session. */
export function warnOnce(label, message, ...details) {
    if (warned.has(label)) return;
    warned.add(label);
    console.warn(message, ...details);
}

/**
 * Run `fn`; if it throws (for example an effect assigning to a getter-only property such as an attribute pool), warn once per
 * label per session and return undefined, so one bad effect can't stop an actor's preparation.
 * @template T
 * @param {() => T} fn
 * @param {string} label   the effect's name
 * @returns {T|undefined}
 */
export function safeApply(fn, label) {
    try {
        return fn();
    } catch (error) {
        warnOnce(`apply:${label}`, `SR6E | the effect "${label}" could not be applied and was skipped:`, error);
        return undefined;
    }
}

/** Forget the once-per-session warnings (for tests). */
export const resetEffectKeyWarnings = () => warned.clear();
