import { getPath } from "../table.mjs";

/**
 * Legacy (template.json) Critter -> V2 rename table. Paths are relative to `system`.
 * Rules and sources: p1-v2-rename-framework design Decision 4; legacy formulas are those of
 * Shadowrun6Actor._prepareAttributes and _prepareDerivedAttributes (actor.js).
 */

/** Legacy attribute id -> V2 attribute id (CONFIG.SR6.ATTRIBUTE_TO_V2, spelled out so the table is pure). */
export const ATTRIBUTES = Object.freeze({
    bod: "body", agi: "agility", rea: "reaction", str: "strength", wil: "willpower",
    log: "logic", int: "intuition", cha: "charisma", mag: "magic", res: "resonance"
});

/** Skill ids are identical in legacy and V2. */
export const SKILLS = Object.freeze([
    "astral", "athletics", "biotech", "close_combat", "con", "conjuring", "cracking", "electronics", "enchanting",
    "engineering", "exotic_weapons", "firearms", "influence", "outdoors", "perception", "piloting", "sorcery",
    "stealth", "tasking"
]);

export const INITIATIVES = Object.freeze(["physical", "astral", "matrix"]);

const num = (value, dflt = 0) => {
    const n = typeof value === "number" ? value : (value === "" || value === null || typeof value === "object" || typeof value === "boolean") ? NaN : Number(value);
    return Number.isFinite(n) ? n : dflt;
};

/**
 * Legacy attribute pool: max(0, base + min(4, mod)), with the base forced to at least 1 (actor.js:1027-1043).
 * Reads the legacy keys, or the V2 `rank`/`mod` when the source is already V2 (a token delta's base actor).
 */
const legacyPool = (src, id) => {
    const v2 = Object.values(ATTRIBUTES).includes(id) ? id : ATTRIBUTES[id];
    const base = Math.max(1, num(getPath(src, `attributes.${id}.base`) ?? getPath(src, `attributes.${v2}.rank`), 1));
    return Math.max(0, base + Math.min(4, num(getPath(src, `attributes.${id}.mod`) ?? getPath(src, `attributes.${v2}.mod`), 0)));
};

/** Normalise a free-text specialization to the id form skill_special uses ("Free Fall" -> "free_fall"). */
const normaliseId = (text) => String(text).trim().toLowerCase().replace(/[\s-]+/g, "_");

/** Split legacy specialization strings into known ids (keyed {id: id}) and unknown texts. */
function splitSpecializations(src, skill, ctx) {
    const known = ctx.skillSpecial?.[skill] ?? {};
    const texts = [getPath(src, `skills.${skill}.specialization`), ...(getPath(src, `skills.${skill}.expandedSpecializations`) ?? [])]
        .filter((t) => typeof t === "string" && t.trim() !== "");
    const specializations = {};
    const unknown = [];
    for (const text of texts) {
        const id = normaliseId(text);
        if (Object.hasOwn(known, id)) specializations[id] = id;
        else unknown.push(text);
    }
    return { specializations, unknown };
}

/** A monitor transform: V2 stores boxes remaining, so value = max - dmg (- overflow dmg for the physical monitor). */
function monitorTransform(monitor, attribute, withOverflow) {
    return (src) => {
        const pool = legacyPool(src, attribute);
        const max = 8 + Math.round(pool / 2) + num(getPath(src, `${monitor}.mod`), 0);
        const dmg = Math.max(0, num(getPath(src, `${monitor}.dmg`), 0));
        const overflow = withOverflow ? Math.max(0, num(getPath(src, "overflow.dmg"), 0)) : 0;
        return {
            value: Math.trunc(max - dmg - overflow),
            extra: { [`health.${monitor === "physical" ? "physicalCM" : "stunCM"}.max`]: Math.max(8, Math.trunc(max)) }
        };
    };
}

/**
 * Complete a monitor transform for a partial update diff that carries only the damage. Reads the document's
 * current (prepared) V2 monitor: `max` is the box count prepare keeps there, and for the physical monitor the
 * overflow already taken is the part of `value` below zero.
 */
function monitorTranslate(monitor, v2Monitor) {
    return (diffSystem, doc) => {
        const current = getPath(doc?.system ?? {}, `health.${v2Monitor}`) ?? {};
        const max = num(current.max, 8);
        const dmg = Math.max(0, num(getPath(diffSystem, `${monitor}.dmg`), 0));
        const overflow = monitor === "physical" ? Math.max(0, -num(current.value, max)) : 0;
        return { value: Math.trunc(max - dmg - overflow) };
    };
}

/** @returns {object[]} the Critter table */
export function buildCritterTable() {
    const table = [];

    // ---- attributes
    for (const [v1, v2] of Object.entries(ATTRIBUTES)) {
        const minRank = v1 === "mag" || v1 === "res" ? 0 : 1;
        table.push({ from: `attributes.${v1}.base`, to: `attributes.${v2}.rank`, kind: "rename", clamp: { min: minRank, int: true, default: minRank }, note: "attribute rating" });
        table.push({ from: `attributes.${v1}.mod`, to: `attributes.${v2}.mod`, kind: "rename", clamp: { min: 0, max: 4, int: true, default: 0 }, note: "V2 mods are 0..4" });
        table.push({ from: `attributes.${v1}.modString`, kind: "derived", note: "display string, recomputed" });
        table.push({ from: `attributes.${v1}.augment`, kind: "derived", note: "never read" });
        // The upstream conversion sends effects on agi.pool/str.pool to V2's pool, a getter without a setter, which would throw
        // during prepare. These are attribute-pool overrides (cyberlimbs): V2 has no writable pool, so they have no target (Decision 5a).
        const noPoolTarget = v1 === "agi" || v1 === "str";
        table.push({ from: `attributes.${v1}.pool`, kind: "derived", ...(noPoolTarget ? { effectTo: null } : {}), note: noPoolTarget ? "base + mod, recomputed; V2 has no writable pool, so effects on it have no target" : "base + mod, recomputed" });
    }
    table.push({ from: "attributes.mag.min", kind: "derived", note: "vestigial minimum, never read" });
    table.push({ from: "attributes.mag.initiation", kind: "flag", note: "no V2 home yet; V1b decides" });
    table.push({ from: "attributes.res.submersion", kind: "flag", note: "no V2 home yet; V1b decides" });
    table.push({ from: "attributes.essence.base", to: "attributes.essence", kind: "rename", clamp: { min: 0, default: 6 }, note: "essence is a decimal value" });
    table.push({ from: "attributes.essence.mod", kind: "flag", effectTo: null, note: "V2 essence has no mod, so an effect on it has no target; it is left as is and logged" });
    table.push({ from: "attributes.essence.pool", kind: "derived", note: "recomputed" });
    table.push({ from: "attributes.edg.current", kind: "derived", note: "vestigial: Edge lives in edge.*, attributes.edg is never read" });
    table.push({ from: "attributes.edg.max", kind: "derived", note: "vestigial: Edge lives in edge.*, attributes.edg is never read" });
    table.push({ from: "name", kind: "derived", note: "the actor's name lives on the document, not in system" });
    table.push({ from: "type", kind: "derived", note: "vestigial attribute-template key, never read" });
    table.push({ from: "gender", kind: "derived", note: "vestigial attribute-template key, never read" });

    // ---- edge (question 1: system.edge)
    table.push({ from: "edge.max", to: "edge.rank", kind: "rename", clamp: { min: 1, int: true, default: 1 }, note: "edge rating" });
    table.push({ from: "edge.value", to: "edge.current", kind: "rename", clamp: { min: 0, max: 7, int: true, default: 0 }, note: "current edge" });

    // ---- condition monitors (V2 stores boxes remaining)
    table.push({
        from: "physical.dmg", to: "health.physicalCM.value", kind: "transform", needs: [["attributes.bod.base", "attributes.body.rank"]],
        records: ["overflow.dmg", "physical.mod"],
        transform: monitorTransform("physical", "bod", true), translate: monitorTranslate("physical", "physicalCM"),
        note: "value = max - dmg - overflow.dmg, max = 8 + round(BOD pool / 2) + physical.mod (actor.js:1066-1074); negative means overflow"
    });
    table.push({
        from: "stun.dmg", to: "health.stunCM.value", kind: "transform", needs: [["attributes.wil.base", "attributes.willpower.rank"]],
        records: ["stun.mod"],
        transform: monitorTransform("stun", "wil", false), translate: monitorTranslate("stun", "stunCM"),
        note: "value = max - dmg, max = 8 + round(WIL pool / 2) + stun.mod (actor.js:1075-1080)"
    });
    for (const monitor of ["physical", "stun"]) {
        // The stored value has no V2 home; effects add to the in-memory bag health.<monitor>CM.mod, which prepare reads
        table.push({ from: `${monitor}.mod`, kind: "flag", effectTo: `health.${monitor === "physical" ? "physicalCM" : "stunCM"}.mod`, note: "stored value has no V2 home (V1b-2 decides); effects move to the in-memory modifier bag" });
        for (const leaf of ["base", "value", "max", "modString"]) table.push({ from: `${monitor}.${leaf}`, kind: "derived", note: "recomputed from attributes and damage" });
    }
    table.push({ from: "overflow.dmg", kind: "derived", note: "folded into health.physicalCM.value (see physical.dmg); original recorded in the v1 copy" });
    table.push({ from: "overflow.mod", kind: "flag", effectTo: "health.overflowMod", note: "stored value has no V2 home (V1b-2 decides); effects move to the in-memory modifier bag" });
    for (const leaf of ["modString", "value", "max"]) table.push({ from: `overflow.${leaf}`, kind: "derived", note: "overflow is derived from the physical monitor in V2" });

    // ---- initiative
    for (const k of INITIATIVES) {
        table.push({ from: `initiative.${k}.mod`, to: `initiative.${k}.mod`, kind: "keep", clamp: { int: true, default: 0 }, note: "legacy modifier on the derived base (fork-first addition)" });
        table.push({
            from: `initiative.${k}.dice`, to: `initiative.${k}.dice`, kind: "transform", needs: [`initiative.${k}.dice`],
            records: [`initiative.${k}.diceMod`],
            transform: (src) => ({
                value: Math.max(1, Math.min(5, Math.trunc(num(getPath(src, `initiative.${k}.dice`), 1) + num(getPath(src, `initiative.${k}.diceMod`), 0)))),
                set: { [`initiative.${k}.diceMod`]: 0 } // folded in: settled to 0 so a second pass can't add it again
            }),
            note: "dice + diceMod, clamped 1..5; diceMod is settled to 0 (declared in the Critter schema so that persists)"
        });
        table.push({ from: `initiative.${k}.diceMod`, to: `initiative.${k}.diceMod`, kind: "keep", note: "folded into initiative dice by the transform above and settled to 0; original recorded in the v1 copy" });
        for (const leaf of ["base", "pool", "dicePool"]) table.push({ from: `initiative.${k}.${leaf}`, kind: "derived", note: "recomputed" });
    }
    table.push({ from: "initiative.actions", kind: "derived", note: "recomputed from the dice" });

    // ---- skills
    for (const id of SKILLS) {
        table.push({ from: `skills.${id}.points`, to: `skills.${id}.rank`, kind: "rename", clamp: { min: 0, int: true, default: 0 }, note: "skill rating" });
        table.push({ from: `skills.${id}.modifier`, to: `skills.${id}.mod`, kind: "rename", clamp: { min: 0, max: 4, int: true, default: 0 }, note: "V2 mods are 0..4" });
        const specialization = (src, ctx) => {
            const { specializations, unknown } = splitSpecializations(src, id, ctx);
            if (unknown.length) console.warn(`SR6E | v2 migration: unknown ${id} specialization(s) kept in the v1 copy:`, unknown);
            return { value: specializations, v1: unknown.length ? { [`skills.${id}.unknownSpecializations`]: unknown } : undefined };
        };
        table.push({
            from: `skills.${id}.specialization`, to: `skills.${id}.specializations`, kind: "transform", needs: [],
            records: [`skills.${id}.expandedSpecializations`], transform: specialization,
            note: "keyed {id: id}; ids the skill doesn't list go to the v1 copy and are logged"
        });
        table.push({
            from: `skills.${id}.expandedSpecializations`, to: `skills.${id}.specializations`, kind: "transform", needs: [],
            records: [`skills.${id}.specialization`], transform: specialization,
            note: "merged with specialization into the keyed object"
        });
        table.push({
            from: `skills.${id}.expertise`, to: `skills.${id}.expertise`, kind: "transform", needs: [],
            transform: (src, ctx) => {
                const text = getPath(src, `skills.${id}.expertise`);
                if (typeof text !== "string" || text.trim() === "") return { value: "" };
                const known = ctx.skillSpecial?.[id] ?? {};
                const key = normaliseId(text);
                return Object.hasOwn(known, key) ? { value: key } : { value: "" };
            },
            note: "an expertise the skill doesn't list is blanked and kept in the v1 copy"
        });
        table.push({ from: `skills.${id}.augment`, kind: "derived", note: "never read" });
    }

    // ---- same name in V2
    for (const key of ["metatype", "editmode", "notes"]) table.push({ from: key, to: key, kind: "keep", note: "same name in V2" });
    table.push({
        from: "description", to: "description", kind: "transform", needs: ["description"],
        transform: (src) => {
            const d = getPath(src, "description");
            return { value: typeof d === "string" ? d : (typeof d?.value === "string" ? d.value : "") };
        },
        note: "a description stored as {value: ...} becomes the string"
    });
    return table;
}

export const CRITTER_TABLE = buildCritterTable();
