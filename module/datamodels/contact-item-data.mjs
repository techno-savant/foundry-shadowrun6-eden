import { sanitizeDescription, sanitizeNumbers } from "./legacy-item-sanitizers.mjs";

/** Schema of the `contact` item type; module-level so checkJs can type the model from it. */
export function contactItemSchema() {
    const fields = foundry.data.fields;

    return {
        name: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: "Someone"})),
        rating: new fields.NumberField({required: true, nullable: false, initial: 1}),
        loyalty: new fields.NumberField({required: true, nullable: false, initial: 1}),
        favors: new fields.NumberField({required: true, nullable: false, initial: 0}),
        type: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: ""})),
        description: new fields.HTMLField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: ""})),
        pronouns: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: ""}))
    };
}

/** @extends {foundry.abstract.TypeDataModel<ReturnType<typeof contactItemSchema>, Item.Implementation>} */
export default class SR6ContactItemData extends foundry.abstract.TypeDataModel {

    static defineSchema() {
        return contactItemSchema();
    }

    /** @inheritDoc */
    static migrateData(source) {
        // Repair the "loyality" typo of Eden's own contact sheet input (v2-key-mapping.md rename rule).
        if ("loyality" in source) {
            if (!("loyalty" in source)) source.loyalty = source.loyality;
            delete source.loyality;
        }
        sanitizeDescription(source);
        sanitizeNumbers(this, source, ["rating", "loyalty", "favors"]);
        return super.migrateData(source);
    }
}
