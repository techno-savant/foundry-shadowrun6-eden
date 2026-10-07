/**
 * Derived values of a living character (here: a V2 Critter), as pure functions. No Foundry, no `this`: they take
 * attribute pools and modifiers and return numbers, so the rig tools can run them in Node against the legacy formulas.
 * Every function cites the legacy line it ports (Shadowrun6Actor in module/documents/actor.js at the V1b-1 base).
 *
 * "P" below is an attribute pool: the legacy `attributes.<id>.pool`, which is base + min(4, mod) and equals the V2
 * `rank + mod` once mods are clamped to 0..4.
 */

/** Primary attribute (V2 id) and untrained use of each skill: CONFIG.SR6.ATTRIB_BY_SKILL (config.js:1921-1940). */
export const SKILL_SETTINGS = Object.freeze({
    astral: ["intuition", false], athletics: ["agility", true], biotech: ["logic", false],
    close_combat: ["agility", true], con: ["charisma", true], conjuring: ["magic", false],
    cracking: ["logic", false], electronics: ["logic", true], enchanting: ["magic", false],
    engineering: ["logic", true], exotic_weapons: ["agility", false], firearms: ["agility", true],
    influence: ["charisma", true], outdoors: ["intuition", true], perception: ["intuition", true],
    piloting: ["reaction", true], sorcery: ["magic", false], stealth: ["agility", true],
    tasking: ["resonance", false]
});

/** Defense pools that are a sum of attribute pools (actor.js:1388-1519). `drain` and `vehicle` are special-cased below. */
export const DEFENSE_POOLS = Object.freeze({
    physical: ["reaction", "intuition"],            // actor.js:1419
    astral: ["logic", "intuition"],                 // actor.js:1428
    spells_direct: ["willpower", "intuition"],      // actor.js:1437
    spells_indirect: ["reaction", "willpower"],     // actor.js:1446
    spells_other: ["logic", "willpower"],           // actor.js:1455
    toxin: ["body", "willpower"],                   // actor.js:1473
    damage_physical: ["body"],                      // actor.js:1482
    damage_astral: ["willpower"],                   // actor.js:1490
    fading: ["willpower", "logic"],                 // actor.js:1511
});

/** `derived.*` entries that are a sum of attribute pools (actor.js:1107-1132). matrix_perception (:1137) is special-cased. */
export const DERIVED = Object.freeze({
    composure: ["willpower", "charisma"],           // actor.js:1107
    judge_intentions: ["willpower", "intuition"],   // actor.js:1112
    memory: ["logic", "intuition"],                 // actor.js:1117
    lift_carry: ["body", "willpower"],              // actor.js:1122
    resist_damage: ["body"],                        // actor.js:1127
    resist_toxin: ["body", "willpower"],            // actor.js:1132
});

/** Attribute pools behind each rating, for V2 actors without modifier bags (actor.js:1153, :1163, :1221, :1259, :1280, :1299). */
export const ATTACK_RATINGS = Object.freeze({ physical: ["reaction", "strength"], astral: [], social: ["charisma"] });
export const DEFENSE_RATINGS = Object.freeze({ physical: ["body"], astral: ["intuition"], social: ["charisma"] });

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** A bag entry: base plus modifier (the legacy `pool = base; if (mod) pool += mod` idiom, used by every family below). */
const bag = (base, mod) => ({ base, pool: base + num(mod) });

/**
 * Pools of one skill. Port of `_prepareSkills` (actor.js:1322-1382).
 * @param {object} args
 * @param {number} args.attributePool   P of the skill's attribute (or the caller's override)
 * @param {number} args.rank            skill points, floored at 0 (actor.js:1337)
 * @param {number} args.mod             skill modifier, capped at 4 (actor.js:1339)
 * @param {boolean} args.useUntrained   SkillDefinition.useUntrained
 * @param {boolean} args.exotic         the skill is exotic_weapons
 * @param {boolean} args.hasSpecialization   any specialization
 * @param {boolean} args.hasExpertise
 * @returns {{pool: number, poolSpec: number, poolExpertise: number}}
 */
export function skillPools({ attributePool, rank, mod, useUntrained, exotic = false, hasSpecialization = false, hasExpertise = false }) {
    const points = Math.max(0, num(rank));                                   // actor.js:1337
    const modifier = Math.min(4, num(mod));                                  // actor.js:1339
    let pool = attributePool + points + modifier;                            // actor.js:1341
    if (points === 0) pool = useUntrained ? attributePool - 1 + modifier : 0 + modifier; // actor.js:1342-1348
    let poolSpec = 0;                                                        // actor.js:1352
    let poolExpertise = 0;                                                   // actor.js:1353
    if (hasSpecialization) poolSpec = exotic ? pool : pool + 2;              // actor.js:1354-1361
    if (hasExpertise) poolExpertise = exotic ? pool : pool + 3;              // actor.js:1362-1369
    if (exotic) pool = 0;                                                    // actor.js:1370 (only specializations have a dice pool)
    return { pool: Math.max(0, pool), poolSpec: Math.max(0, poolSpec), poolExpertise: Math.max(0, poolExpertise) }; // actor.js:1371-1379
}

/**
 * Which of a skill's pools a roll uses: expertise (+3) when `spec` is the expertise, specialization (+2) when it is
 * one of the specializations, otherwise the plain pool. Exotic weapons only roll with a matching specialization.
 * Port of the selection in `_getSkillPool` (actor.js:2332-2346).
 * @returns {number}
 */
export function pickSkillPool(pools, { id, spec, specializations = [], expertise = "" }) {
    const isExpertise = !!spec && !!expertise && spec === expertise;
    const isSpecialization = !!spec && specializations.includes(spec);
    if (id === "exotic_weapons") return isExpertise ? pools.poolExpertise : isSpecialization ? pools.poolSpec : 0;
    if (isExpertise) return pools.poolExpertise;
    if (isSpecialization) return pools.poolSpec;
    return pools.pool;
}

/**
 * Everything a Critter derives from its attribute pools. Port of `_prepareDerivedAttributes`, `_prepareAttackRatings`,
 * `_prepareDefenseRatings`, `_prepareDefensePools` and `_prepareSkills` for a lifeform with no worn armor, tradition or
 * persona unless given.
 *
 * @param {object} input
 * @param {Record<string, number>} input.pools   P per V2 attribute id (body, agility, reaction, strength, willpower, logic, intuition, charisma, magic, resonance)
 * @param {Record<string, {rank?: number, mod?: number, specializations?: object, expertise?: string}>} [input.skills]
 * @param {{physical?: number, astral?: number, matrix?: number}} [input.initiativeDice]   stored dice
 * @param {{physical?: number, astral?: number, matrix?: number}} [input.initiativeDiceMods]   stored diceMod (settled to 0 by migration, but effects and edits can set it later)
 * @param {{health?: {physicalCM?: number, stunCM?: number, overflow?: number}, initiative?: Record<string, number>, derived?: Record<string, number>, attackRating?: Record<string, number>, defenseRating?: Record<string, number>, defensePool?: Record<string, number>}} [input.mods]   effect modifiers per bag (default 0)
 * @param {{defense?: number, hardened?: number}} [input.armor]   worn armor defense and hardened armor (legacy `traits.hardenedArmor`)
 * @param {string|null} [input.tradition]   V2 attribute id of the tradition's attribute, if any
 */
export function deriveCritter({ pools: P, skills = {}, initiativeDice = {}, initiativeDiceMods = {}, mods = {}, armor = {}, tradition = null }) {
    const sum = (ids) => ids.reduce((n, id) => n + num(P[id]), 0);
    const m = (family, key) => num(mods[family]?.[key]);

    // actor.js:1071-1074 (physical monitor and overflow), 1079-1080 (stun monitor)
    const health = {
        physicalMax: 8 + Math.round(P.body / 2) + num(mods.health?.physicalCM),
        stunMax: 8 + Math.round(P.willpower / 2) + num(mods.health?.stunCM),
        overflowMax: P.body * 2 + num(mods.health?.overflow),
    };

    // actor.js:1084-1095: base from attribute pools, pool = base + mod; dicePool = clamp(dice + diceMod, 1, 5) (:1086, :1090, :1095)
    const dice = (k) => clamp(num(initiativeDice[k] ?? 1) + num(initiativeDiceMods[k]), 1, 5);
    const initiative = {
        physical: { rank: sum(["reaction", "intuition"]) + m("initiative", "physical"), dice: dice("physical") }, // :1084
        astral: { rank: sum(["logic", "intuition"]) + m("initiative", "astral"), dice: dice("astral") },         // :1088
        matrix: { rank: sum(["reaction", "intuition"]) + m("initiative", "matrix"), dice: dice("matrix") },      // :1093
    };

    // actor.js:1107-1132 composure .. resist_toxin, and :1137 matrix perception (electronics points + modifier + INT)
    const derived = {};
    for (const [key, ids] of Object.entries(DERIVED)) derived[key] = bag(sum(ids), m("derived", key));
    const electronics = skills.electronics ?? {};
    derived.matrix_perception = bag(num(electronics.rank) + num(electronics.mod) + num(P.intuition), m("derived", "matrix_perception")); // :1137

    // actor.js:1145-1237. Physical: REA + STR (:1153). Astral: base 0 unless a tradition adds MAG + its attribute (:1163). Social: CHA (:1221)
    const attackRating = {
        physical: bag(sum(["reaction", "strength"]), m("attackRating", "physical")),
        astral: bag(tradition ? num(P.magic) + num(P[tradition]) : 0, m("attackRating", "astral")),
        social: bag(num(P.charisma), m("attackRating", "social")),
    };

    // actor.js:1245-1316. Physical: BOD (:1259), then mod, then hardened armor (:1266) and worn armor defense (:1270-1277). Astral: INT (:1280). Social: CHA (:1299)
    const physicalDefense = bag(num(P.body), m("defenseRating", "physical"));
    physicalDefense.pool += num(armor.hardened) + num(armor.defense);
    const defenseRating = {
        physical: physicalDefense,
        astral: bag(num(P.intuition), m("defenseRating", "astral")),
        social: bag(num(P.charisma), m("defenseRating", "social")),
    };

    // skills first, because the vehicle defense pool reads the piloting pool
    const outSkills = {};
    for (const [id, [attribute, useUntrained]] of Object.entries(SKILL_SETTINGS)) {
        const skill = skills[id] ?? {};
        outSkills[id] = skillPools({
            attributePool: num(P[attribute]), rank: skill.rank, mod: skill.mod, useUntrained,
            exotic: id === "exotic_weapons",
            hasSpecialization: Object.keys(skill.specializations ?? {}).length > 0,
            hasExpertise: !!skill.expertise,
        });
    }

    // actor.js:1388-1519
    const defensePool = {};
    for (const [key, ids] of Object.entries(DEFENSE_POOLS)) defensePool[key] = bag(sum(ids), m("defensePool", key));
    defensePool.vehicle = bag(outSkills.piloting.pool + num(P.reaction), m("defensePool", "vehicle")); // :1464
    // Resist drain only exists with a tradition (:1498-1500); without one it stays at 0, modifier or not
    defensePool.drain = tradition ? bag(num(P[tradition]) + num(P.willpower), m("defensePool", "drain")) : { base: 0, pool: 0 };

    return { health, initiative, derived, attackRating, defenseRating, defensePool, skills: Object.fromEntries(Object.entries(outSkills).map(([id, s]) => [id, s])) };
}

/**
 * Current essence: the attribute minus the essence of every worn ware item. Port of `_calculateEssence`
 * (actor.js:2147-2163), which stored a string (`toFixed(2)`); this returns the number.
 * @param {number} essence
 * @param {number[]} wareEssences   `system.essence` of each gear item that has one
 */
export function currentEssence(essence, wareEssences = []) {
    return wareEssences.reduce((n, e) => n - num(e), num(essence));
}
