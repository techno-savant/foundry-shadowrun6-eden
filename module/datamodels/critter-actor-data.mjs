import SR6BaseActorData from './base-actor-data.mjs';
import SR6AttributeData from './fields/attribute-data.mjs';
import SR6InitiativeData from './fields/initiative-data.mjs';
import * as srFields from "./fields/fields.mjs";
import { applyV2Renames } from "../migrations/v2/renames.mjs";
import { translateUpdate } from "../migrations/v2/translate.mjs";
import { CRITTER_TABLE, ATTRIBUTES, SKILLS } from "../migrations/v2/tables/critter.mjs";
import { schemaDeclares } from "../migrations/v2/schema-paths.mjs";

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

class SR6CritterInitiativeField extends foundry.data.fields.EmbeddedDataField {
    /**
     * @param {any} [options]
     * @param {any} [context]
     */
    constructor(options = {}, context = {}) {
        super(SR6CritterInitiativeData, options, context);
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

    /** Primary attribute and untrained use of each skill, as for the other V2 actors. */
    static SKILL_SETTINGS = Object.freeze({
        astral: ["intuition", false], athletics: ["agility", true], biotech: ["logic", false],
        close_combat: ["agility", true], con: ["charisma", true], conjuring: ["magic", false],
        cracking: ["logic", false], electronics: ["logic", true], enchanting: ["magic", false],
        engineering: ["logic", true], exotic_weapons: ["agility", false], firearms: ["agility", true],
        influence: ["charisma", true], outdoors: ["intuition", true], perception: ["intuition", true],
        piloting: ["reaction", true], sorcery: ["magic", false], stealth: ["agility", true],
        tasking: ["resonance", false]
    });

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
                physicalCM: new srFields.SR6ConditionMonitorField(),
                stunCM: new srFields.SR6ConditionMonitorField()
            }),
            initiative: new fields.SchemaField({
                physical: new SR6CritterInitiativeField(),
                astral: new SR6CritterInitiativeField(),
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
}
