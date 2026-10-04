import SR6GenesisItemData, { genesisItemSchema } from "./genesis-item-data.mjs";

/** Schema of the `spell` item type; module-level so checkJs can type the model from it. */
export function spellItemSchema() {
    const fields = foundry.data.fields;

    return {
        ...genesisItemSchema(),
        category: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: "health"})),
        duration: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: "instantaneous"})),
        drain: new fields.NumberField({required: true, nullable: false, initial: 1}),
        type: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: "physical"})),
        range: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: "self"})),
        damage: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: "physical"})),
        alchemic: new fields.BooleanField({initial: false}),
        multiSense: new fields.BooleanField({initial: false}),
        withEssence: new fields.BooleanField({initial: false}),
        wildDie: new fields.BooleanField({initial: false}),
        isSustained: new fields.BooleanField({initial: false}),
        isOpposed: new fields.BooleanField({initial: true}),
        combatSpellType: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: "spells_indirect"}))
    };
}

/** @extends {SR6GenesisItemData<ReturnType<typeof spellItemSchema>>} */
export default class SR6SpellItemData extends SR6GenesisItemData {

    static defineSchema() {
        return spellItemSchema();
    }

    /** @inheritDoc */
    static migrateData(source) {
        this._sanitizeNumbers(source, ["drain"]);
        return super.migrateData(source);
    }
}
