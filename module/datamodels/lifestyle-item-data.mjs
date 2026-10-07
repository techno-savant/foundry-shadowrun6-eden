import SR6GenesisItemData, { genesisItemSchema } from "./genesis-item-data.mjs";

/** Schema of the `lifestyle` item type; module-level so checkJs can type the model from it. */
export function lifestyleItemSchema() {
    const fields = foundry.data.fields;

    return {
        ...genesisItemSchema(),
        type: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: "low"})),
        paid: new fields.NumberField({required: true, nullable: false, initial: 1}),
        cost: new fields.NumberField({required: true, nullable: false, initial: 2000}),
        sin: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: ""})),
    };
}

/** @extends {SR6GenesisItemData<ReturnType<typeof lifestyleItemSchema>>} */
export default class SR6LifestyleItemData extends SR6GenesisItemData {

    static defineSchema() {
        return lifestyleItemSchema();
    }

    /** @inheritDoc */
    static migrateData(source) {
        this._sanitizeNumbers(source, ["paid", "cost"]);
        return super.migrateData(source);
    }
}
