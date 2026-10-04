import { sanitizeDescription, sanitizeNumbers } from "./legacy-item-sanitizers.mjs";

export default class SR6SinItemData extends foundry.abstract.TypeDataModel {

    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            name: new fields.StringField({required: true, blank: true, initial: "Someone"}),
            quality: new fields.StringField({required: true, blank: true, initial: "REAL_SIN"}),
            description: new fields.HTMLField({required: true, blank: true, initial: ""})
        };
    }

    /** @inheritDoc */
    static migrateData(source) {
        sanitizeDescription(source);
        return super.migrateData(source);
    }
}
