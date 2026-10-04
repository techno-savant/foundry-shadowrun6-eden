import SR6GenesisItemData from "./genesis-item-data.mjs";

export default class SR6LifestyleItemData extends SR6GenesisItemData {

    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            ...super.defineSchema(),
            type: new fields.StringField({required: true, blank: true, initial: "low"}),
            paid: new fields.NumberField({required: true, nullable: false, initial: 1}),
            cost: new fields.NumberField({required: true, nullable: false, initial: 2000}),
            sin: new fields.StringField({required: true, blank: true, initial: ""}),
        };
    }

    /** @inheritDoc */
    static migrateData(source) {
        this._sanitizeNumbers(source, ["paid", "cost"]);
        return super.migrateData(source);
    }
}
