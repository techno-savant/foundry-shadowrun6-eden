import { FLAG_SCOPE, deletePath, getPath, hasPath, isUnder, leafPaths, setPath } from "./table.mjs";

/**
 * Apply a rename table to a legacy actor `system` source, in place. Pure: no Foundry access.
 *
 * Rules (design Decision 3):
 * - New wins: when both `from` and `to` are present the legacy value is dropped from the in-memory source.
 * - Transforms read the ORIGINAL source (a snapshot) and only run when every `needs` path exists in it. A transform returns
 *   `{value, extra?, set?, v1?}`: `value` goes to `to`, `extra` maps further V2 paths to values (only when absent), `set` maps
 *   paths to values that always overwrite (settles an input a same-path transform folded in), `v1` adds originals to the v1 copy. On a partial
 *   update diff they often can't; their `from` then stays in the diff for `translateUpdate`.
 * - The v1 copy: originals of values that changed meaning (transformed, clamped, flagged, unknown) are returned in
 *   `v1`, keyed by legacy path, for the caller to write to flags.shadowrun6-eden.v1. Plain renames are not copied:
 *   Phase 1 never deletes stored keys, so the old key still holds the original.
 * - Idempotent: with no legacy path present nothing happens.
 *
 * @param {object} source   The `system` source (changed in place)
 * @param {object[]} table
 * @param {object} [options]
 * @param {boolean} [options.partial=false]   The source is a partial update diff
 * @param {(path: string) => boolean} [options.isV2Path]   True for paths that are valid V2 leaves or prefixes. When
 *     given, legacy leaves the table doesn't cover and V2 doesn't declare are preserved in `v1` and logged, never dropped
 * @param {object} [options.ctx]   Extra data for transforms (for example CONFIG lists)
 * @returns {{source: object, v1: Record<string, any>, clamped: string[], unknown: string[], derived: string[], skipped: string[]}}
 */
export function applyV2Renames(source, table, { partial = false, isV2Path, ctx = {} } = {}) {
    const original = structuredClone(source);
    const result = { source, v1: {}, clamped: [], unknown: [], derived: [], skipped: [] };
    const keepV1 = (path, value) => { if (!(path in result.v1)) result.v1[path] = structuredClone(value); };

    for (const entry of table) {
        const { from, to, kind } = entry;
        if (!hasPath(original, from)) continue;
        const present = getPath(original, from);

        if (kind === "derived") {
            deletePath(source, from);
            result.derived.push(from);
            continue;
        }
        if (kind === "flag") {
            keepV1(from, present);
            deletePath(source, from);
            continue;
        }
        if (kind === "keep") {
            if (entry.clamp) {
                const fixed = clampValue(present, entry.clamp);
                if (fixed.changed) {
                    keepV1(from, present);
                    result.clamped.push(from);
                    setPath(source, from, fixed.value);
                }
            }
            continue;
        }
        if (kind === "transform") {
            if (!(entry.needs ?? []).every((need) => (Array.isArray(need) ? need.some((n) => hasPath(original, n)) : hasPath(original, need)))) {
                result.skipped.push(from);
                continue;
            }
            const out = entry.transform(original, ctx, { partial });
            const setsSame = Object.entries(out?.set ?? {}).every(([p, v]) => JSON.stringify(getPath(original, p)) === JSON.stringify(v));
            if (to === from && out && "value" in out && JSON.stringify(out.value) === JSON.stringify(present) && !out.v1 && !out.extra && setsSame) continue; // already V2: nothing to do
            keepV1(from, present);
            for (const extra of entry.records ?? []) if (hasPath(original, extra)) keepV1(extra, getPath(original, extra));
            if (out?.v1) for (const [k, v] of Object.entries(out.v1)) keepV1(k, v);
            if (out && "value" in out && (to === from || !hasPath(source, to))) setPath(source, to, out.value);
            for (const [path, value] of Object.entries(out?.extra ?? {})) if (!hasPath(source, path)) setPath(source, path, value);
            for (const [path, value] of Object.entries(out?.set ?? {})) setPath(source, path, value);
            if (to !== from) deletePath(source, from);
            continue;
        }
        // rename. A target that is the legacy parent of other table sources (attributes.essence.base -> attributes.essence)
        // is a legacy container, not an existing V2 value.
        const toIsLegacyContainer = table.some((e) => e.from !== to && isUnder(e.from, to));
        let value = present;
        if (entry.clamp) {
            const fixed = clampValue(present, entry.clamp);
            if (fixed.changed) {
                keepV1(from, present);
                result.clamped.push(from);
            }
            value = fixed.value;
        }
        if (hasPath(source, to) && to !== from && hasPath(original, to) && !toIsLegacyContainer) {
            if (JSON.stringify(getPath(original, to)) !== JSON.stringify(present)) keepV1(from, present); // new wins, but keep what it superseded
            deletePath(source, from);
            continue;
        }
        setPath(source, to, value);
        if (to !== from) deletePath(source, from);
    }

    if (isV2Path) {
        for (const leaf of leafPaths(original)) {
            if (table.some((e) => isUnder(leaf, e.from)) || isV2Path(leaf)) continue;
            result.unknown.push(leaf);
            keepV1(leaf, getPath(original, leaf));
            deletePath(source, leaf);
        }
    }
    return result;
}

/**
 * Coerce to a number, round when `int`, clamp to [min, max]; report whether anything changed.
 * @param {any} value
 * @param {{min?: number, max?: number, int?: boolean, default?: number}} [spec]
 * @returns {{value: number, changed: boolean}}
 */
export function clampValue(value, { min = -Infinity, max = Infinity, int = false, default: dflt } = {}) {
    let n = typeof value === "number" ? value : (value === "" || value === null || typeof value === "boolean" || typeof value === "object") ? NaN : Number(value);
    if (!Number.isFinite(n)) n = dflt ?? (min === -Infinity ? 0 : min);
    if (int) n = Math.round(n);
    n = Math.min(max, Math.max(min, n));
    return { value: n, changed: n !== value };
}

/** Where an actor's v1 copy lives, as a flat object ready for `update({flags: ...})`. */
export function v1FlagUpdate(v1, existing = {}) {
    const flags = {};
    for (const [path, value] of Object.entries(v1)) {
        if (hasPath(existing, path) || path in (existing ?? {})) continue;
        flags[path] = value;
    }
    return Object.keys(flags).length ? { flags: { [FLAG_SCOPE]: { v1: flags } } } : {};
}
