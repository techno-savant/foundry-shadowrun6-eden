import SR6GenesisItemData from "./genesis-item-data.mjs";
import { sanitizeNumbers, sanitizeObjects } from "./legacy-item-sanitizers.mjs";

/**
 * Gear items (weapons, armor, ware, electronics, vehicles and matrix devices).
 * Mirrors the `gear` block of the legacy template.json with its dice-pool and matrix-device templates.
 * The four genesis keys come from the genesis base. Nothing is renamed.
 */
export default class SR6GearItemData extends SR6GenesisItemData {

    /**
     * Default metadata which applies to each instance of this Document type.
     * @type {object}
     */
    static metadata = Object.freeze({
        type: "gear"
    });

    static defineSchema() {
        const fields = foundry.data.fields;
        const str = (initial) => new fields.StringField({required: true, blank: true, initial});
        const num = (initial) => new fields.NumberField({required: true, nullable: false, initial});
        const bool = (initial) => new fields.BooleanField({initial});

        return {
            ...super.defineSchema(),
            // Template default is "" (the V2 base has "1L")
            availDef: /** @type {any} */ (str("")), // the cast keeps the static side compatible with the base field type
            // dice-pool template
            modifier: num(0),
            wild: bool(false),
            pool: num(0),
            // matrix-device template
            isElectronicMatrixDevice: bool(false),
            matrix: new fields.SchemaField({
                deviceRating: num(2),
                hasWirelessInterface: bool(true),
                hasDataCableInterface: bool(false),
                wirelessActive: bool(true),
                matrixCM: new fields.SchemaField({
                    value: new fields.NumberField({required: false, nullable: true, initial: null})
                })
            }),
            // core
            type: str("WEAPON_FIREARMS"),
            subtype: str(""),
            count: num(0),
            countable: bool(false),
            avail: num(0),
            ammocap: num(0),
            ammocount: num(0),
            ammoLoaded: str("regular"),
            // SR6Item.migrateData turns every string priceDef into a number
            priceDef: num(0),
            customName: str(""),
            usedForPool: bool(false),
            notes: str(""),
            accessories: new fields.HTMLField({required: true, blank: true, initial: ""}),
            // weapon
            needsRating: bool(false),
            rating: num(0),
            skill: str(""),
            skillSpec: str(""),
            dmg: num(0),
            stun: bool(false),
            dmgDef: str(""),
            attackRating: new fields.ArrayField(num(0), {initial: [0, 0, 0, 0, 0]}),
            modes: new fields.SchemaField({
                BF: bool(false),
                FA: bool(false),
                SA: bool(false),
                SS: bool(false),
                // Runtime values written by SR6Item#prepareDerivedData; declared so effect paths resolve against the schema
                SA_ar_mod: num(-2),
                BF_ar_mod: num(-4),
                FA_ar_mod: num(-6),
                dicePoolMod: num(0)
            }),
            // armor and ware
            defense: num(0),
            social: num(0),
            essence: num(0),
            capacity: num(0),
            natural: bool(false),
            a: num(0),
            s: num(0),
            d: num(0),
            f: num(0),
            progSlots: num(0),
            // vehicle
            handlOn: num(0),
            handlOff: num(0),
            accOn: num(0),
            accOff: num(0),
            spdiOn: num(0),
            spdiOff: num(0),
            tspd: num(0),
            bod: num(0),
            arm: num(0),
            pil: num(0),
            sen: num(0),
            sea: num(0),
            vtype: str(""),
            vehicle: new fields.SchemaField({
                opMode: str("manual")
            }),
            strWeapon: bool(false),
            dualHand: bool(false)
        };
    }

    /** @inheritDoc */
    static migrateData(source) {
        // Nested objects first, so the coercions below can rely on them being objects
        sanitizeObjects(this, source, ["matrix", "modes", "vehicle"]);

        // The gear-only coercions of SR6Item.migrateData, with unchanged logic
        // TODO Currently all Gear items have a matrix.deviceRating; this should only be for Electronic Matrix Devices
        if (source.devRating !== undefined) {
            source.matrix ??= {};
            source.matrix.deviceRating = parseInt(source.devRating) || 2;
            delete source.devRating
        }

        if (typeof source.stun === 'string') source.stun = (source.stun === "true");
        if (typeof source.ammocap === 'string') source.ammocap = parseInt(source.ammocap) || 0;
        if (typeof source.ammocount === 'string') source.ammocount = parseInt(source.ammocount) || 0;
        if (typeof source.priceDef === 'string') source.priceDef = ( isNaN(parseInt(source.priceDef)) ? parseInt(source.price) : parseInt(source.priceDef) );
        if (Array.isArray(source.attackRating) && typeof source.attackRating[0] === 'string') source.attackRating = source.attackRating.map(ar => parseInt(ar));
        if (typeof source.defense === 'string') source.defense = parseInt(source.defense) || 0;
        if (typeof source.capacity === 'string') source.capacity = parseInt(source.capacity) || 0;
        if (typeof source.social === 'string') source.social = parseInt(source.social) || 0;
        if (typeof source.matrix?.deviceRating === 'string') source.matrix.deviceRating = parseInt(source.matrix.deviceRating) || 0;

        if (source.needsRating === true && source.rating === 0) source.needsRating = false;
        if (source.subtype === "IMAGING") source.subtype = "OPTICAL";

        if (source.isElectronicMatrixDevice) {
            const matrixCmValue = source.matrix?.matrixCM?.value;
            if (matrixCmValue === null || matrixCmValue === undefined) {
                source.matrix ??= {};
                source.matrix.matrixCM ??= {};
                source.matrix.matrixCM.value  = Math.ceil(source.matrix.deviceRating / 2) + 8;
            }
        }

        // Anything that would still fail validation (and so hide the item) falls back to the schema default
        const schemaFields = /** @type {any} */ (this).schema.fields;
        const numberKeys = Object.keys(schemaFields).filter(key => schemaFields[key] instanceof foundry.data.fields.NumberField);
        sanitizeNumbers(this, source, numberKeys);
        if ("matrix" in source) {
            sanitizeObjects({schema: schemaFields.matrix}, source.matrix, ["matrixCM"]);
            sanitizeNumbers({schema: schemaFields.matrix}, source.matrix, ["deviceRating"]);
            if (source.matrix.matrixCM) sanitizeNumbers({schema: schemaFields.matrix.fields.matrixCM}, source.matrix.matrixCM, ["value"]);
        }
        if ("modes" in source) {
            sanitizeNumbers({schema: schemaFields.modes}, source.modes, ["SA_ar_mod", "BF_ar_mod", "FA_ar_mod", "dicePoolMod"]);
        }
        if ("attackRating" in source) {
            source.attackRating = Array.isArray(source.attackRating)
                ? source.attackRating.map(ar => Number.isFinite(Number(ar)) && typeof ar !== "object" && ar !== "" ? ar : 0)
                : [0, 0, 0, 0, 0];
        }
        return super.migrateData(source);
    }
}
