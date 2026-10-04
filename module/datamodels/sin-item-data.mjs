import { sanitizeDescription, sanitizeNumbers } from "./legacy-item-sanitizers.mjs";

/** Schema of the `sin` item type; module-level so checkJs can type the model from it. */
export function sinItemSchema() {
    const fields = foundry.data.fields;

    return {
        name: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: "Someone"})),
        quality: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: "REAL_SIN"})),
        description: new fields.HTMLField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: ""}))
    };
}

/** @extends {foundry.abstract.TypeDataModel<ReturnType<typeof sinItemSchema>, Item.Implementation>} */
export default class SR6SinItemData extends foundry.abstract.TypeDataModel {

    static defineSchema() {
        return sinItemSchema();
    }

    /** @inheritDoc */
    static migrateData(source) {
        sanitizeDescription(source);
        return super.migrateData(source);
    }
}
