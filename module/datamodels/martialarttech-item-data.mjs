import SR6GenesisItemData from "./genesis-item-data.mjs";

export default class SR6MartialarttechItemData extends SR6GenesisItemData {

    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            ...super.defineSchema(),
            style: new fields.StringField({required: true, blank: true, initial: ""}),
            choice: new fields.StringField({required: true, blank: true, initial: ""}),
        };
    }
}
