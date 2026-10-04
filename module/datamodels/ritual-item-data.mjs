import SR6GenesisItemData from "./genesis-item-data.mjs";

export default class SR6RitualItemData extends SR6GenesisItemData {

    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            ...super.defineSchema(),
            threshold: new fields.NumberField({required: true, nullable: false, initial: 5}),
            features: new fields.SchemaField({
                anchored: new fields.BooleanField({initial: false}),
                material_link: new fields.BooleanField({initial: false}),
                minion: new fields.BooleanField({initial: false}),
                spell: new fields.BooleanField({initial: false}),
                spotter: new fields.BooleanField({initial: false})
            }),
        };
    }

    /** @inheritDoc */
    static migrateData(source) {
        this._sanitizeNumbers(source, ["threshold"]);
        this._sanitizeObjects(source, ["features"]);
        return super.migrateData(source);
    }
}
