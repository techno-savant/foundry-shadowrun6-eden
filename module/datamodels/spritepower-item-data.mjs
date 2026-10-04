import SR6GenesisItemData from "./genesis-item-data.mjs";

export default class SR6SpritepowerItemData extends SR6GenesisItemData {

    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            ...super.defineSchema(),
            duration: new fields.StringField({required: true, blank: true, initial: "sustained"}),
            isSustained: new fields.BooleanField({initial: false}),
            skill: new fields.StringField({required: true, blank: true, initial: ""}),
            skillSpec: new fields.StringField({required: true, blank: true, initial: ""}),
            oppAttr1: new fields.StringField({required: true, blank: true, initial: ""}),
            oppAttr2: new fields.StringField({required: true, blank: true, initial: ""}),
            dmg: new fields.NumberField({required: true, nullable: false, initial: 0})
        };
    }

    /** @inheritDoc */
    static migrateData(source) {
        this._sanitizeNumbers(source, ["dmg"]);
        return super.migrateData(source);
    }
}
