import SR6GenesisItemData, { genesisItemSchema } from "./genesis-item-data.mjs";

/** Schema of the `complexform` item type; module-level so checkJs can type the model from it. */
export function complexformItemSchema() {
    const fields = foundry.data.fields;

    return {
        ...genesisItemSchema(),
        duration: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: "sustained"})),
        fading: new fields.NumberField({required: true, nullable: false, initial: 3}),
        skill: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: ""})),
        skillSpec: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: ""})),
        attrib: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: "res"})),
        threshold: new fields.NumberField({required: true, nullable: false, initial: 0}),
        oppAttr1: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: ""})),
        oppAttr2: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: ""})),
        isSustained: new fields.BooleanField({initial: false})
    };
}

/** @extends {SR6GenesisItemData<ReturnType<typeof complexformItemSchema>>} */
export default class SR6ComplexformItemData extends SR6GenesisItemData {

    static defineSchema() {
        return complexformItemSchema();
    }

    /** @inheritDoc */
    static migrateData(source) {
        this._sanitizeNumbers(source, ["fading", "threshold"]);
        return super.migrateData(source);
    }
}
