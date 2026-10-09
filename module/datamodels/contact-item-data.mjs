import { sanitizeDescription, sanitizeNumbers } from "./legacy-item-sanitizers.mjs";
import { removeKey } from "../migrations/v2/table.mjs";

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
        if ("loyality" in source && !Object.isFrozen(source)) {
            // A sealed or frozen source (an initialised document's _source) is already cleaned, so it can't hold "loyality"; if one
            // ever does, a key can't be added to it, and the typo is left alone rather than dropping the value
            if (!("loyalty" in source) && Object.isExtensible(source)) source.loyalty = source.loyality;
            if ("loyalty" in source) removeKey(source, "loyality");
        }
        sanitizeDescription(source);
        sanitizeNumbers(this, source, ["rating", "loyalty", "favors"]);
        return super.migrateData(source);
    }
}
