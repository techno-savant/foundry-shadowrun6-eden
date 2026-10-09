import SR6GenesisItemData, { genesisItemSchema } from "./genesis-item-data.mjs";

/** Schema of the `quality` item type; module-level so checkJs can type the model from it. */
export function qualityItemSchema() {
    const fields = foundry.data.fields;

    return {
        ...genesisItemSchema(),
        value: new fields.NumberField({required: true, nullable: false, initial: 0}),
        explain: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: ""})),
        modifier: new fields.ArrayField(new fields.AnyField()),
        category: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: ""})),
        level: new fields.NumberField({required: true, nullable: false, initial: 1})
    };
}

/** @extends {SR6GenesisItemData<ReturnType<typeof qualityItemSchema>>} */
export default class SR6QualityItemData extends SR6GenesisItemData {

    static defineSchema() {
        return qualityItemSchema();
    }

    /** @inheritDoc */
    static migrateData(source) {
        this._sanitizeNumbers(source, ["value", "level"]);
        if ("modifier" in source && !Array.isArray(source.modifier) && !Object.isFrozen(source)) source.modifier = [];
        return super.migrateData(source);
    }
}
