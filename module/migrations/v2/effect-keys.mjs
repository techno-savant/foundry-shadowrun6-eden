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
