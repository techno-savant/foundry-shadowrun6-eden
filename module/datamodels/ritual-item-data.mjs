import SR6GenesisItemData, { genesisItemSchema } from "./genesis-item-data.mjs";

/** Schema of the `ritual` item type; module-level so checkJs can type the model from it. */
export function ritualItemSchema() {
    const fields = foundry.data.fields;

    return {
        ...genesisItemSchema(),
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

/** @extends {SR6GenesisItemData<ReturnType<typeof ritualItemSchema>>} */
export default class SR6RitualItemData extends SR6GenesisItemData {

    static defineSchema() {
        return ritualItemSchema();
    }

    /** @inheritDoc */
    static migrateData(source) {
        this._sanitizeNumbers(source, ["threshold"]);
        this._sanitizeObjects(source, ["features"]);
        return super.migrateData(source);
    }
}
