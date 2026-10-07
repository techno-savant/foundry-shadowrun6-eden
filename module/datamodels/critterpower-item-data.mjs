import SR6GenesisItemData, { genesisItemSchema } from "./genesis-item-data.mjs";

/** Schema of the `critterpower` item type; module-level so checkJs can type the model from it. */
export function critterpowerItemSchema() {
    const fields = foundry.data.fields;

    return {
        ...genesisItemSchema(),
        duration: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: "instantaneous"})),
        action: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: ""})),
        type: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: "physical"})),
        range: new fields.StringField(/** @type {SR6StringOptions} */ ({required: true, blank: true, initial: "self"})),
    };
}

/** @extends {SR6GenesisItemData<ReturnType<typeof critterpowerItemSchema>>} */
export default class SR6CritterpowerItemData extends SR6GenesisItemData {

    static defineSchema() {
        return critterpowerItemSchema();
    }
}
