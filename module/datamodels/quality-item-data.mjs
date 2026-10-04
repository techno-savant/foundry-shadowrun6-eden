import SR6GenesisItemData from "./genesis-item-data.mjs";

export default class SR6QualityItemData extends SR6GenesisItemData {

    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            ...super.defineSchema(),
            value: new fields.NumberField({required: true, nullable: false, initial: 0}),
            explain: new fields.StringField({required: true, blank: true, initial: ""}),
            modifier: new fields.ArrayField(new fields.AnyField()),
            category: new fields.StringField({required: true, blank: true, initial: ""}),
            level: new fields.NumberField({required: true, nullable: false, initial: 1})
        };
    }

    /** @inheritDoc */
    static migrateData(source) {
        this._sanitizeNumbers(source, ["value", "level"]);
        if ("modifier" in source && !Array.isArray(source.modifier)) source.modifier = [];
        return super.migrateData(source);
    }
}
