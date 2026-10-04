import SR6GenesisItemData from "./genesis-item-data.mjs";

export default class SR6MetamagicItemData extends SR6GenesisItemData {

    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            ...super.defineSchema(),
            hasLevel: new fields.BooleanField({initial: false}),
            level: new fields.NumberField({required: true, nullable: false, initial: 1}),
            adepts: new fields.BooleanField({initial: false}),
            mages: new fields.BooleanField({initial: false}),
        };
    }

    /** @inheritDoc */
    static migrateData(source) {
        this._sanitizeNumbers(source, ["level"]);
        return super.migrateData(source);
    }
}
