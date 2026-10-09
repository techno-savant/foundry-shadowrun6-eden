/**
 * Pure helpers for the Critter sheet. No Foundry imports, so they can be run outside Foundry (the rig's
 * `migrate-fixtures --sheet-helpers`).
 */

/**
 * Splits one initiative into what the sheet stores and what it shows.
 *
 * Prepared `system.initiative.<key>.dice` holds the effective dice (stored `dice` + `diceMod`, clamped 1-5), so an
 * input bound to it would save the effective value while `diceMod` stays set, and the next prepare would add `diceMod`
 * again. Inputs therefore bind to `stored`, which comes from the source data. `effective` is shown read-only.
 *
 * @param {{initiative: Record<string, {rank: number, dice: number}>}} system   The prepared system data
 * @param {{initiative: Record<string, {dice?: number, mod?: number, diceMod?: number}>}} source   The stored system data
 * @param {string} key   physical, astral or matrix
 * @returns {{stored: {dice: number, mod: number, diceMod: number}, effective: {rank: number, dice: number}}}
 */
export function initiativeView(system, source, key) {
    const stored = source.initiative?.[key] ?? {};
    const effective = system.initiative[key];
    return {
        stored: {dice: stored.dice ?? 1, mod: stored.mod ?? 0, diceMod: stored.diceMod ?? 0},
        effective: {rank: effective.rank, dice: effective.dice},
    };
}
