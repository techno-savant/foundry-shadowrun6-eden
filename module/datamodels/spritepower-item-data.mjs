import SR6GenesisItemData, { genesisItemSchema } from "./genesis-item-data.mjs";

/** Schema of the `spritepower` item type; module-level so checkJs can type the model from it. */
export function spritepowerItemSchema() {
    const fields = foundry.data.fields;

    return {
        ...genesisItemSchema(),
        duration: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: "sustained"})),
        isSustained: new fields.BooleanField({initial: false}),
        skill: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: ""})),
        skillSpec: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: ""})),
        oppAttr1: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: ""})),
        oppAttr2: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: ""})),
        dmg: new fields.NumberField({required: true, nullable: false, initial: 0})
    };
}

/** @extends {SR6GenesisItemData<ReturnType<typeof spritepowerItemSchema>>} */
export default class SR6SpritepowerItemData extends SR6GenesisItemData {

    static defineSchema() {
        return spritepowerItemSchema();
    }

    /** @inheritDoc */
    static migrateData(source) {
        this._sanitizeNumbers(source, ["dmg"]);
        return super.migrateData(source);
    }
}
