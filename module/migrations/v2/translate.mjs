import { FLAG_SCOPE, deletePath, getPath, hasPath, setPath } from "./table.mjs";

const warned = new Set();

/** Forget which old paths have been warned about (for tests). */
export const resetTranslateWarnings = () => warned.clear();

/**
 * Finish the transforms a partial update diff couldn't do in migrateData. A diff such as
 * `{system: {physical: {dmg: 3}}}` has no monitor inputs, so `applyV2Renames` leaves `physical.dmg` in it; here the
 * value is computed from the document's current data. The result is written to the entry's V2 path, the old key is
 * removed from the diff, the original goes to the v1 copy, and one `console.warn` per old path per session names the
 * caller that still writes old names (umbral6, macros).
 *
 * @param {object} changes   The document update diff (changed in place; `changes.system` is the part that matters)
 * @param {{system?: object}} doc   The document being updated
 * @param {object[]} table
 * @param {object} [options]
 * @param {(msg: string, ...rest: any[]) => void} [options.warn=console.warn]
 * @returns {{translated: string[]}}
 */
export function translateUpdate(changes, doc, table, { warn = console.warn } = {}) {
    const translated = [];
    const diff = changes?.system;
    if (!diff) return { translated };
    for (const entry of table) {
        if (typeof entry.translate !== "function" || !hasPath(diff, entry.from)) continue;
        const original = getPath(diff, entry.from);
        const out = entry.translate(diff, doc);
        if (out && "value" in out) setPath(diff, entry.translateTo ?? entry.to, out.value);
        deletePath(diff, entry.from);
        const flagPath = `flags.${FLAG_SCOPE}.v1.${entry.from}`;
        if (!hasPath(changes, flagPath) && !hasPath(doc ?? {}, flagPath)) setPath(changes, flagPath, original);
        translated.push(entry.from);
        if (!warned.has(entry.from)) {
            warned.add(entry.from);
            warn(`SR6E | update used the old path system.${entry.from}; use system.${entry.translateTo ?? entry.to}. It was translated for you.`);
        }
    }
    return { translated };
}
