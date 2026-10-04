import SR6GenesisItemData from "./genesis-item-data.mjs";

export default class SR6CritterpowerItemData extends SR6GenesisItemData {

    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            ...super.defineSchema(),
            duration: new fields.StringField({required: true, blank: true, initial: "instantaneous"}),
            action: new fields.StringField({required: true, blank: true, initial: ""}),
            type: new fields.StringField({required: true, blank: true, initial: "physical"}),
            range: new fields.StringField({required: true, blank: true, initial: "self"}),
        };
    }
}
