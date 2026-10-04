import SR6GenesisItemData from "./genesis-item-data.mjs";

export default class SR6FocusItemData extends SR6GenesisItemData {

    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            ...super.defineSchema(),
            rating: new fields.NumberField({required: true, nullable: false, initial: 1}),
        };
    }

    /** @inheritDoc */
    static migrateData(source) {
        this._sanitizeNumbers(source, ["rating"]);
        return super.migrateData(source);
    }
}
