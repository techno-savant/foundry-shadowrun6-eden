import SR6GenesisItemData from "./genesis-item-data.mjs";

export default class SR6SpellItemData extends SR6GenesisItemData {

    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            ...super.defineSchema(),
            category: new fields.StringField({required: true, blank: true, initial: "health"}),
            duration: new fields.StringField({required: true, blank: true, initial: "instantaneous"}),
            drain: new fields.NumberField({required: true, nullable: false, initial: 1}),
            type: new fields.StringField({required: true, blank: true, initial: "physical"}),
            range: new fields.StringField({required: true, blank: true, initial: "self"}),
            damage: new fields.StringField({required: true, blank: true, initial: "physical"}),
            alchemic: new fields.BooleanField({initial: false}),
            multiSense: new fields.BooleanField({initial: false}),
            withEssence: new fields.BooleanField({initial: false}),
            wildDie: new fields.BooleanField({initial: false}),
            isSustained: new fields.BooleanField({initial: false}),
            isOpposed: new fields.BooleanField({initial: true}),
            combatSpellType: new fields.StringField({required: true, blank: true, initial: "spells_indirect"})
        };
    }

    /** @inheritDoc */
    static migrateData(source) {
        this._sanitizeNumbers(source, ["drain"]);
        return super.migrateData(source);
    }
}
