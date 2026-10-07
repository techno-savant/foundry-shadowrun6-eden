import SR6BaseItemData, { baseItemSchema } from "./base-item-data.mjs";
import { sanitizeDescription, sanitizeNumbers, sanitizeObjects, sanitizeV2Base } from "./legacy-item-sanitizers.mjs";

/** Schema shared by the genesis item types (the V2 item base, unchanged). */
export function genesisItemSchema() {
    return baseItemSchema();
}

/**
 * Base for the item types built on the `genesis` template of the legacy template.json.
 * The four genesis keys (genesisID, description, product, page) come from the V2 item base, which keeps their names.
 * @template {foundry.data.fields.DataSchema} [Schema=ReturnType<typeof genesisItemSchema>]
 * @extends {SR6BaseItemData<Schema>}
 */
export default class SR6GenesisItemData extends SR6BaseItemData {

    /**
     * Replace values that would fail validation with the schema default.
     * @param {object} source Source data, changed in place
     * @param {string[]} keys NumberField keys of the schema
     */
    static _sanitizeNumbers(source, keys) {
        sanitizeNumbers(this, source, keys);
    }

    /**
     * Replace values that are not plain objects with `{}`, so the SchemaField defaults fill them.
     * @param {object} source Source data, changed in place
     * @param {string[]} keys SchemaField keys of the schema
     */
    static _sanitizeObjects(source, keys) {
        sanitizeObjects(this, source, keys);
    }

    /** @inheritDoc */
    static migrateData(source) {
        sanitizeV2Base(source);
        sanitizeDescription(source);
        return super.migrateData(source);
    }
}
