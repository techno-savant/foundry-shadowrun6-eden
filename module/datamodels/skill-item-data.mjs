import SR6GenesisItemData, { genesisItemSchema } from "./genesis-item-data.mjs";

/** Schema of the `skill` item type; module-level so checkJs can type the model from it. */
export function skillItemSchema() {
    const fields = foundry.data.fields;

    return {
        ...genesisItemSchema(),
        points: new fields.NumberField({required: true, nullable: false, initial: 0}),
        modifier: new fields.NumberField({required: true, nullable: false, initial: 0})
    };
}

/** @extends {SR6GenesisItemData<ReturnType<typeof skillItemSchema>>} */
export default class SR6SkillItemData extends SR6GenesisItemData {

    static defineSchema() {
        return skillItemSchema();
    }

    /** @inheritDoc */
    static migrateData(source) {
        this._sanitizeNumbers(source, ["points", "modifier"]);
        return super.migrateData(source);
    }
}
