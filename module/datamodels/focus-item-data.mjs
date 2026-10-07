import SR6GenesisItemData, { genesisItemSchema } from "./genesis-item-data.mjs";

/** Schema of the `focus` item type; module-level so checkJs can type the model from it. */
export function focusItemSchema() {
    const fields = foundry.data.fields;

    return {
        ...genesisItemSchema(),
        rating: new fields.NumberField({required: true, nullable: false, initial: 1}),
    };
}

/** @extends {SR6GenesisItemData<ReturnType<typeof focusItemSchema>>} */
export default class SR6FocusItemData extends SR6GenesisItemData {

    static defineSchema() {
        return focusItemSchema();
    }

    /** @inheritDoc */
    static migrateData(source) {
        this._sanitizeNumbers(source, ["rating"]);
        return super.migrateData(source);
    }
}
