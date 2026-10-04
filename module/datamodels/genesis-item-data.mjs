/**
 * Base for the item types built on the `genesis` template of the legacy template.json.
 * Mirrors the template exactly: no renames, no extra constraints. Tightening is a later change.
 */
export default class SR6GenesisItemData extends foundry.abstract.TypeDataModel {

    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            genesisID: new fields.StringField({required: true, blank: true, initial: ""}),
            description: new fields.HTMLField({required: true, blank: true, initial: ""}),
            product: new fields.StringField({required: true, blank: true, initial: ""}),
            page: new fields.NumberField({required: true, nullable: false, initial: 0})
        };
    }

    /**
     * Replace values that would fail validation (and so make the whole item invalid) with the schema default.
     * Numeric strings are left alone, because NumberField casts them.
     * @param {object} source Source data, changed in place
     * @param {string[]} keys NumberField keys of the schema
     */
    static _sanitizeNumbers(source, keys) {
        for (const key of keys) {
            if (!(key in source)) continue;
            const value = source[key];
            const isUsable = typeof value !== "object" && value !== "" && Number.isFinite(Number(value));
            if (!isUsable) source[key] = this.schema.fields[key].initial;
        }
    }

    /**
     * Replace values that are not plain objects with `{}`, so the SchemaField defaults fill them.
     * @param {object} source Source data, changed in place
     * @param {string[]} keys SchemaField keys of the schema
     */
    static _sanitizeObjects(source, keys) {
        for (const key of keys) {
            if (key in source && foundry.utils.getType(source[key]) !== "Object") source[key] = {};
        }
    }

    /** @inheritDoc */
    static migrateData(source) {
        this._sanitizeNumbers(source, ["page"]);
        return super.migrateData(source);
    }
}
