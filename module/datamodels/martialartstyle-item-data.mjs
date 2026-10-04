import SR6GenesisItemData from "./genesis-item-data.mjs";

export default class SR6MartialartstyleItemData extends SR6GenesisItemData {

    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            ...super.defineSchema(),
            category: new fields.SchemaField({
                grappling: new fields.BooleanField({initial: false}),
                mobility: new fields.BooleanField({initial: false}),
                ranged: new fields.BooleanField({initial: false}),
                striking: new fields.BooleanField({initial: false}),
                weapon: new fields.BooleanField({initial: false})
            }),
        };
    }

    /** @inheritDoc */
    static migrateData(source) {
        this._sanitizeObjects(source, ["category"]);
        return super.migrateData(source);
    }
}
