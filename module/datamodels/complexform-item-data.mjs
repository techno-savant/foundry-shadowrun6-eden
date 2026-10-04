import SR6GenesisItemData from "./genesis-item-data.mjs";

export default class SR6ComplexformItemData extends SR6GenesisItemData {

    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            ...super.defineSchema(),
            duration: new fields.StringField({required: true, blank: true, initial: "sustained"}),
            fading: new fields.NumberField({required: true, nullable: false, initial: 3}),
            skill: new fields.StringField({required: true, blank: true, initial: ""}),
            skillSpec: new fields.StringField({required: true, blank: true, initial: ""}),
            attrib: new fields.StringField({required: true, blank: true, initial: "res"}),
            threshold: new fields.NumberField({required: true, nullable: false, initial: 0}),
            oppAttr1: new fields.StringField({required: true, blank: true, initial: ""}),
            oppAttr2: new fields.StringField({required: true, blank: true, initial: ""}),
            isSustained: new fields.BooleanField({initial: false})
        };
    }

    /** @inheritDoc */
    static migrateData(source) {
        this._sanitizeNumbers(source, ["fading", "threshold"]);
        return super.migrateData(source);
    }
}
