import SR6GenesisItemData, { genesisItemSchema } from "./genesis-item-data.mjs";

/** Schema of the `adeptpower` item type; module-level so checkJs can type the model from it. */
export function adeptpowerItemSchema() {
    const fields = foundry.data.fields;

    return {
        ...genesisItemSchema(),
        hasLevel: new fields.BooleanField({initial: false}),
        level: new fields.NumberField({required: true, nullable: false, initial: 1}),
        choice: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: ""})),
        cost: new fields.NumberField({required: true, nullable: false, initial: 0.0}),
        activation: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: ""})),
    };
}

/** @extends {SR6GenesisItemData<ReturnType<typeof adeptpowerItemSchema>>} */
export default class SR6AdeptpowerItemData extends SR6GenesisItemData {

    static defineSchema() {
        return adeptpowerItemSchema();
    }

    /** @inheritDoc */
    static migrateData(source) {
        this._sanitizeNumbers(source, ["level", "cost"]);
        return super.migrateData(source);
    }
}
