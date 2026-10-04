import SR6GenesisItemData, { genesisItemSchema } from "./genesis-item-data.mjs";

/** Schema of the `martialarttech` item type; module-level so checkJs can type the model from it. */
export function martialarttechItemSchema() {
    const fields = foundry.data.fields;

    return {
        ...genesisItemSchema(),
        style: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: ""})),
        choice: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: ""})),
    };
}

/** @extends {SR6GenesisItemData<ReturnType<typeof martialarttechItemSchema>>} */
export default class SR6MartialarttechItemData extends SR6GenesisItemData {

    static defineSchema() {
        return martialarttechItemSchema();
    }
}
