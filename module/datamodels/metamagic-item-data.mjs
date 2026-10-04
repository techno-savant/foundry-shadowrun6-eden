import SR6GenesisItemData, { genesisItemSchema } from "./genesis-item-data.mjs";

/** Schema of the `metamagic` item type; module-level so checkJs can type the model from it. */
export function metamagicItemSchema() {
    const fields = foundry.data.fields;

    return {
        ...genesisItemSchema(),
        hasLevel: new fields.BooleanField({initial: false}),
        level: new fields.NumberField({required: true, nullable: false, initial: 1}),
        adepts: new fields.BooleanField({initial: false}),
        mages: new fields.BooleanField({initial: false}),
    };
}

/** @extends {SR6GenesisItemData<ReturnType<typeof metamagicItemSchema>>} */
export default class SR6MetamagicItemData extends SR6GenesisItemData {

    static defineSchema() {
        return metamagicItemSchema();
    }

    /** @inheritDoc */
    static migrateData(source) {
        this._sanitizeNumbers(source, ["level"]);
        return super.migrateData(source);
    }
}
