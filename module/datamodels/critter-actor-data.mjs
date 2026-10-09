import SR6BaseActorData from './base-actor-data.mjs';
import SR6AttributeData from './fields/attribute-data.mjs';
import SR6ConditionMonitor from './fields/condition-monitor-data.mjs';
import SR6InitiativeData from './fields/initiative-data.mjs';
import * as srFields from "./fields/fields.mjs";
import { applyV2Renames } from "../migrations/v2/renames.mjs";
import { translateUpdate } from "../migrations/v2/translate.mjs";
import { CRITTER_TABLE, ATTRIBUTES, SKILLS } from "../migrations/v2/tables/critter.mjs";
import { schemaDeclares } from "../migrations/v2/schema-paths.mjs";
import { DEFENSE_POOLS, DERIVED, SKILL_SETTINGS, deriveCritter, pickSkillPool, skillPools } from "./derive/character.mjs";

/** Loose view of the Critter's own fields for the prepare methods (actor models are untyped under checkJs). */
/** @typedef {{attributes: Record<string, any>, edge: any, skills: Record<string, any>, health: any, initiative: any, defensePool: Record<string, any>, attackRating: Record<string, any>, defenseRating: Record<string, any>, derived: Record<string, any>}} CritterSystem */

/**
 * Critters can have Magic or Resonance 0 (JC, 2026-10-05), so those two attributes accept rank 0.
 * Everything else about the attribute is upstream's SR6AttributeData.
 */
class SR6CritterZeroRankAttributeData extends SR6AttributeData {
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            ...super.defineSchema(),
            rank: /** @type {any} */ (new fields.NumberField({required: true, nullable: false, integer: true, initial: 0, min: 0})),
        };
    }
}

/**
 * Legacy Critters store a modifier on a derived initiative base (REA+INT for physical), where V2 stores an absolute
 * rank that goes stale. `mod` keeps that modifier (fork-first addition, question 3); V1b derives `rank` in prepare.
 * `diceMod` is the legacy dice modifier: migration folds it into `dice` and settles it to 0, and it stays declared
 * so that settle write persists and a second load can't add it again.
 */
class SR6CritterInitiativeData extends SR6InitiativeData {
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            ...super.defineSchema(),
            mod: new fields.NumberField({required: true, nullable: false, integer: true, initial: 0}),
            diceMod: new fields.NumberField({required: true, nullable: false, integer: true, initial: 0}),
        };
    }
}

/** The legacy template gives astral initiative 2 dice (physical and matrix 1). */
class SR6CritterAstralInitiativeData extends SR6CritterInitiativeData {
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            ...super.defineSchema(),
            dice: /** @type {any} */ (new fields.NumberField({required: true, nullable: false, integer: true, initial: 2, min: 1, max: 5})),
        };
    }
}

class SR6CritterInitiativeField extends foundry.data.fields.EmbeddedDataField {
    /**
     * @param {any} [options]
     * @param {any} [context]
     * @param {any} [model]
     */
    constructor(options = {}, context = {}, model = SR6CritterInitiativeData) {
        super(model, options, context);
    }
}

/**
 * The Critter's condition monitor. `value` is NULL until something decides it: migration cannot compute boxes remaining
 * (that needs the maximum WITH active effects, which only prepare has), so it records the legacy damage in `pendingDamage`
 * and prepare resolves value = max - pendingDamage in memory. Any monitor change writes a number into `value`.
 */
class SR6CritterMonitor extends SR6ConditionMonitor {
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            ...super.defineSchema(),
            value: /** @type {any} */ (new fields.NumberField({required: true, nullable: true, integer: true, initial: null})),
            pendingDamage: new fields.NumberField({required: true, nullable: true, integer: true, initial: null, min: 0}),
        };
    }
}

class SR6CritterMonitorField extends foundry.data.fields.EmbeddedDataField {
    /**
     * @param {any} [options]
     * @param {any} [context]
     */
    constructor(options = {}, context = {}) {
        super(SR6CritterMonitor, options, context);
    }
}

class SR6CritterZeroRankAttributeField extends foundry.data.fields.EmbeddedDataField {
    /**
     * @param {any} [options]
     * @param {any} [context]
     */
    constructor(options = {}, context = {}) {
        super(SR6CritterZeroRankAttributeData, options, context);
    }
}

/**
 * Critter on a TypeDataModel (V2). NOT REGISTERED in V1a: `CONFIG.Actor.dataModels` has no Critter entry, so nothing
 * here runs in a world yet. V1b registers it together with the derived data, rolls, damage and sheet it needs.
 */
export default class SR6CritterActorData extends SR6BaseActorData {

    static LOCALIZATION_PREFIXES = [
        ...super.LOCALIZATION_PREFIXES,
        'SR6.Actor.critter'
    ];

    static metadata = Object.freeze({
        type: "Critter"
    });

    /** Primary attribute and untrained use of each skill (derive/character.mjs). */
    static SKILL_SETTINGS = SKILL_SETTINGS;

    static defineSchema() {
        const fields = foundry.data.fields;

        /** @type {Record<string, any>} */
        const attributes = {};
        for (const v2 of Object.values(ATTRIBUTES)) {
            attributes[v2] = (v2 === "magic" || v2 === "resonance")
                ? new SR6CritterZeroRankAttributeField()
                : new srFields.SR6AttributeField();
        }
        // Essence is a decimal value, not a rank
        attributes.essence = new fields.NumberField({required: true, nullable: false, initial: 6, min: 0});

        /** @type {Record<string, any>} */
        const skills = {};
        for (const id of SKILLS) {
            const [primaryAttribute, useUntrained] = this.SKILL_SETTINGS[id];
            skills[id] = new srFields.SR6SkillField({primaryAttribute, useUntrained});
        }

        return {
            ...super.defineSchema(),
            metatype: new fields.StringField({required: true, blank: true, initial: "Critter"}),
            editmode: new fields.BooleanField({initial: false}),
            attributes: new fields.SchemaField(attributes),
            skills: new fields.SchemaField(skills),
            edge: new srFields.SR6EdgeAttributeField(),
            health: new fields.SchemaField({
                physicalCM: new SR6CritterMonitorField(),
                stunCM: new SR6CritterMonitorField()
            }),
            initiative: new fields.SchemaField({
                physical: new SR6CritterInitiativeField(),
                astral: new SR6CritterInitiativeField({}, {}, SR6CritterAstralInitiativeData),
                matrix: new SR6CritterInitiativeField(),
            }),
        };
    }

    /**
     * Legacy data and old-name writes arrive here first. The rename step is the first statement, before anything
     * else and before the schema cleans the source (design Decision 1).
     * @inheritDoc
     */
    static migrateData(source) {
        const schema = /** @type {any} */ (this).schema;
        applyV2Renames(source, CRITTER_TABLE, {
            partial: true,
            isV2Path: (path) => schemaDeclares(schema, path),
            ctx: { skillSpecial: CONFIG.SR6.skill_special },
        });
        return super.migrateData(source);
    }

    /**
     * Transforms that need values a partial diff doesn't carry (for example a damage-only update) are completed here
     * from the document's current data, and the caller gets one warning per old path per session.
     * @inheritDoc
     */
    async _preUpdate(changes, options, user) {
        translateUpdate(changes, /** @type {any} */ (this).parent, CRITTER_TABLE);
        return await super._preUpdate(changes, options, user);
    }

    /**
     * Modifier bags that active effects add to. They are in-memory properties, not schema fields: effects are applied
     * after this and before prepareDerivedData, which fills each bag's `base` and `pool`.
     * Keys follow upstream's commented hints (config.js:4599-4614).
     */
    prepareBaseData() {
        const self = /** @type {CritterSystem} */ (/** @type {unknown} */ (this));
        const bags = (keys) => Object.fromEntries(keys.map((key) => [key, {base: 0, mod: 0, pool: 0}]));
        self.defensePool = bags([...Object.keys(DEFENSE_POOLS), "vehicle", "drain"]);
        self.attackRating = bags(["physical", "astral", "social"]);
        self.defenseRating = bags(["physical", "astral", "social"]);
        self.derived = bags([...Object.keys(DERIVED), "matrix_perception"]);
        super.prepareBaseData();
        // Monitor and overflow modifiers (legacy physical.mod, stun.mod, overflow.mod)
        self.health.physicalCM.mod = 0;
        self.health.stunCM.mod = 0;
        self.health.overflowMod = 0;
    }

    /**
     * Overrides the base: its mod clamp throws on the numeric `essence`. Clamps mods to at most +4 on the attributes
     * (not essence), edge and skills, then fills the derived values from derive/character.mjs.
     */
    prepareDerivedData() {
        const self = /** @type {CritterSystem} */ (/** @type {unknown} */ (this));
        for (const [key, attribute] of Object.entries(self.attributes)) {
            if (key === "essence") continue;
            attribute.mod = Math.min(4, attribute.mod);
        }
        self.edge.mod = Math.min(4, self.edge.mod);
        for (const skill of Object.values(self.skills)) skill.mod = Math.min(4, skill.mod);

        const pools = this.#attributePools();
        const bagMods = (bag) => Object.fromEntries(Object.entries(bag).map(([key, entry]) => [key, entry.mod]));
        const result = deriveCritter({
            pools,
            skills: self.skills,
            initiativeDice: {physical: self.initiative.physical.dice, astral: self.initiative.astral.dice, matrix: self.initiative.matrix.dice},
            initiativeDiceMods: {physical: self.initiative.physical.diceMod, astral: self.initiative.astral.diceMod, matrix: self.initiative.matrix.diceMod},
            mods: {
                health: {physicalCM: self.health.physicalCM.mod, stunCM: self.health.stunCM.mod, overflow: self.health.overflowMod},
                initiative: {physical: self.initiative.physical.mod, astral: self.initiative.astral.mod, matrix: self.initiative.matrix.mod},
                derived: bagMods(self.derived), attackRating: bagMods(self.attackRating),
                defenseRating: bagMods(self.defenseRating), defensePool: bagMods(self.defensePool),
            },
            armor: {defense: 0, hardened: 0},
        });

        self.health.physicalCM.max = result.health.physicalMax;
        self.health.stunCM.max = result.health.stunMax;
        // A null value is "not decided yet": resolve it in memory from the legacy damage migration recorded, now that the
        // maximum includes effects. Overflow follows the resolved physical value.
        for (const monitor of [self.health.physicalCM, self.health.stunCM]) {
            if (monitor.value === null) monitor.value = monitor.max - (monitor.pendingDamage ?? 0);
        }
        if (self.health.overflow) {
            self.health.overflow.dmg = Math.max(0, -self.health.physicalCM.value);
            self.health.overflow.max = result.health.overflowMax;
            self.health.overflow.value = self.health.overflow.max - self.health.overflow.dmg;
        }
        for (const key of ["physical", "astral", "matrix"]) {
            self.initiative[key].rank = result.initiative[key].rank;
            self.initiative[key].dice = result.initiative[key].dice; // stored dice + diceMod, clamped 1..5 (actor.js:1086)
        }
        for (const family of ["derived", "attackRating", "defenseRating", "defensePool"]) {
            for (const [key, value] of Object.entries(result[family])) Object.assign(self[family][key], value);
        }
    }

    /** Attribute pools as the legacy `attributes.<id>.pool`: rating plus mod, never below 0 (actor.js:1039). */
    #attributePools() {
        const self = /** @type {CritterSystem} */ (/** @type {unknown} */ (this));
        /** @type {Record<string, number>} */
        const pools = {};
        for (const [key, attribute] of Object.entries(self.attributes)) {
            if (key !== "essence") pools[key] = Math.max(0, attribute.rank + attribute.mod);
        }
        return pools;
    }

    /**
     * Dice pool of a skill roll, attribute included.
     * @param {string} id   skill id
     * @param {object} [options]
     * @param {string} [options.spec]   specialization id (or the expertise) the roll uses; adds +2 / +3
     * @param {number} [options.attributePool]   a caller's attribute override (legacy rolls pass one for vehicles)
     * @returns {number}
     */
    skillPool(id, {spec, attributePool} = {}) {
        const self = /** @type {CritterSystem} */ (/** @type {unknown} */ (this));
        const skill = self.skills[id];
        const settings = SKILL_SETTINGS[id];
        if (!skill || !settings) return 0;
        const [attribute, useUntrained] = settings;
        const pools = skillPools({
            attributePool: attributePool ?? this.#attributePools()[attribute] ?? 0,
            rank: skill.rank, mod: skill.mod, useUntrained, exotic: id === "exotic_weapons",
            hasSpecialization: Object.keys(skill.specializations ?? {}).length > 0, hasExpertise: !!skill.expertise,
        });
        return pickSkillPool(pools, {id, spec, specializations: Object.keys(skill.specializations ?? {}), expertise: skill.expertise});
    }
}
