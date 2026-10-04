import SR6GenesisItemData from "./genesis-item-data.mjs";

export default class SR6AdeptpowerItemData extends SR6GenesisItemData {

    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            ...super.defineSchema(),
            hasLevel: new fields.BooleanField({initial: false}),
            level: new fields.NumberField({required: true, nullable: false, initial: 1}),
            choice: new fields.StringField({required: true, blank: true, initial: ""}),
            cost: new fields.NumberField({required: true, nullable: false, initial: 0.0}),
            activation: new fields.StringField({required: true, blank: true, initial: ""}),
        };
    }

    /** @inheritDoc */
    static migrateData(source) {
        this._sanitizeNumbers(source, ["level", "cost"]);
        return super.migrateData(source);
    }
}
