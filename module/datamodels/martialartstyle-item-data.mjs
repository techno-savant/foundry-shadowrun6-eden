import SR6GenesisItemData, { genesisItemSchema } from "./genesis-item-data.mjs";

/** Schema of the `martialartstyle` item type; module-level so checkJs can type the model from it. */
export function martialartstyleItemSchema() {
    const fields = foundry.data.fields;

    return {
        ...genesisItemSchema(),
        category: new fields.SchemaField({
            grappling: new fields.BooleanField({initial: false}),
            mobility: new fields.BooleanField({initial: false}),
            ranged: new fields.BooleanField({initial: false}),
            striking: new fields.BooleanField({initial: false}),
            weapon: new fields.BooleanField({initial: false})
        }),
    };
}

/** @extends {SR6GenesisItemData<ReturnType<typeof martialartstyleItemSchema>>} */
export default class SR6MartialartstyleItemData extends SR6GenesisItemData {

    static defineSchema() {
        return martialartstyleItemSchema();
    }

    /** @inheritDoc */
    static migrateData(source) {
        this._sanitizeObjects(source, ["category"]);
        return super.migrateData(source);
    }
}
