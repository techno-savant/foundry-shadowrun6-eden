import { sanitizeDescription, sanitizeNumbers } from "./legacy-item-sanitizers.mjs";

export default class SR6ContactItemData extends foundry.abstract.TypeDataModel {

    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            name: new fields.StringField({required: true, blank: true, initial: "Someone"}),
            rating: new fields.NumberField({required: true, nullable: false, initial: 1}),
            loyalty: new fields.NumberField({required: true, nullable: false, initial: 1}),
            favors: new fields.NumberField({required: true, nullable: false, initial: 0}),
            type: new fields.StringField({required: true, blank: true, initial: ""}),
            description: new fields.HTMLField({required: true, blank: true, initial: ""}),
            pronouns: new fields.StringField({required: true, blank: true, initial: ""})
        };
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
