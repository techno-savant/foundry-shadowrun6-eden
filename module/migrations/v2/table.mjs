/**
 * Rename-table format for the legacy -> V2 actor data migration, and the pure path helpers the rest of the
 * framework shares. Nothing in here touches Foundry, so the rig tools can import it in plain Node.
 *
 * A table is an ordered array of entries:
 *   { from, to?, kind, transform?, translate?, needs?, clamp?, records?, effectTo?, note }
 * `from` and `to` are paths relative to `system` (dotted). `kind` is one of KINDS:
 *   rename    the value is moved unchanged (optionally coerced/clamped, see `clamp`)
 *   transform computed by `transform(source, ctx)` from the ORIGINAL source; only runs when every `needs` path exists
 *   keep      the same path exists in V2 (listed so every legacy leaf is classified)
 *   flag      no V2 home yet: preserved under flags.shadowrun6-eden.v1.<from>
 *   derived   deliberately dropped: recomputed by prepare, or vestigial (`note` says which)
 * `clamp` is { min?, max?, int?, default? }: numbers are coerced, rounded (int), clamped, and the original is
 * kept in the v1 copy whenever the value had to change.
 * `records` lists extra legacy paths whose originals a transform folds in; they go to the v1 copy too.
 * `needs` entries are paths that must exist; an array entry means any one of them (a legacy path or its V2 name).
 * `effectTo` is where an ACTIVE EFFECT key on `from` moves, when that differs from the data (a flag entry's value has no V2
 * home, but effects can still add to its in-memory modifier bag). `effectTo: null` means effects on it have no target.
 */

export const KINDS = Object.freeze(["rename", "transform", "keep", "flag", "derived"]);

/** Namespace for the v1 copies: flags.<FLAG_SCOPE>.v1.<legacy path>. */
export const FLAG_SCOPE = "shadowrun6-eden";

/* -------------------------------------------- */
/*  Path helpers (pure)                         */
/* -------------------------------------------- */

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** Read a dotted path; undefined when any segment is missing. */
export function getPath(obj, path) {
    let cur = obj;
    for (const key of path.split(".")) {
        if (!isObject(cur) && !Array.isArray(cur)) return undefined;
        cur = cur[key];
        if (cur === undefined) return undefined;
    }
    return cur;
}

/** True when the path exists (a stored null counts as present). */
export function hasPath(obj, path) {
    return getPath(obj, path) !== undefined;
}

/** Write a dotted path, creating plain objects on the way. */
export function setPath(obj, path, value) {
    const keys = path.split(".");
    let cur = obj;
    for (const key of keys.slice(0, -1)) {
        if (!isObject(cur[key])) cur[key] = {};
        cur = cur[key];
    }
    cur[keys.at(-1)] = value;
}

/** Delete a dotted path and prune the plain objects it leaves empty. */
export function deletePath(obj, path) {
    const keys = path.split(".");
    const chain = [obj];
    let cur = obj;
    for (const key of keys.slice(0, -1)) {
        if (!isObject(cur[key])) return;
        cur = cur[key];
        chain.push(cur);
    }
    delete cur[keys.at(-1)];
    for (let i = chain.length - 1; i > 0; i--) {
        if (Object.keys(chain[i]).length) break;
        delete chain[i - 1][keys[i - 1]];
    }
}

/** Every leaf path of a plain-object tree. Arrays and empty objects are leaves. */
export function leafPaths(obj, prefix = "") {
    const out = [];
    for (const [key, value] of Object.entries(obj ?? {})) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (isObject(value) && Object.keys(value).length) out.push(...leafPaths(value, path));
        else out.push(path);
    }
    return out;
}

/** True when `path` is `prefix` or lies below it. */
export const isUnder = (path, prefix) => path === prefix || path.startsWith(`${prefix}.`);

/* -------------------------------------------- */
/*  Validation                                  */
/* -------------------------------------------- */

/**
 * Validate a table against the V2 schema's declared leaf paths and the legacy template's leaves.
 * @param {object[]} table
 * @param {Iterable<string>} v2Paths   Leaf paths the V2 schema declares (relative to system)
 * @param {Iterable<string>} legacyLeaves   Leaf paths of the legacy template.json type
 * @returns {{errors: string[], uncovered: string[], unknownTargets: string[]}}
 */
export function validateTable(table, v2Paths, legacyLeaves) {
    const v2 = new Set(v2Paths);
    const errors = [];
    const unknownTargets = [];
    const seen = new Set();
    for (const entry of table) {
        if (!KINDS.includes(entry.kind)) errors.push(`${entry.from}: unknown kind "${entry.kind}"`);
        if (seen.has(entry.from)) errors.push(`${entry.from}: duplicate from`);
        seen.add(entry.from);
        if (["rename", "transform", "keep"].includes(entry.kind)) {
            const to = entry.to ?? (entry.kind === "keep" ? entry.from : undefined);
            if (!to) errors.push(`${entry.from}: ${entry.kind} needs a "to"`);
            else if (!v2.has(to) && ![...v2].some((p) => isUnder(p, to))) unknownTargets.push(`${entry.from} -> ${to}`);
        }
        if (entry.kind === "transform" && typeof entry.transform !== "function") errors.push(`${entry.from}: transform needs a function`);
        if (!entry.note && ["derived", "flag", "transform"].includes(entry.kind)) errors.push(`${entry.from}: ${entry.kind} needs a note`);
    }
    const uncovered = [...legacyLeaves].filter((leaf) => !table.some((e) => isUnder(leaf, e.from)));
    return { errors, uncovered, unknownTargets };
}
