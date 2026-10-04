import SR6GenesisItemData from "./genesis-item-data.mjs";

export default class SR6SkillItemData extends SR6GenesisItemData {

    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            ...super.defineSchema(),
            points: new fields.NumberField({required: true, nullable: false, initial: 0}),
            modifier: new fields.NumberField({required: true, nullable: false, initial: 0})
        };
    }

    /** @inheritDoc */
    static migrateData(source) {
        this._sanitizeNumbers(source, ["points", "modifier"]);
        return super.migrateData(source);
    }
}
