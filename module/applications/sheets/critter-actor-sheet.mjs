import SR6BaseActorSheet from "./base-actor-sheet.mjs";
import { initiativeView } from "./critter-sheet-helpers.mjs";

/** Item types a Critter accepts by drop; gear is further limited to weapons. */
const DROPPABLE_ITEM_TYPES = new Set(["critterpower", "quality", "gear"]);
/** Attributes in statblock order. Resonance and matrix are not shown for Critters. */
const ATTRIBUTES = ["body", "agility", "reaction", "strength", "willpower", "logic", "intuition", "charisma", "magic", "essence"];
const INITIATIVES = ["physical", "astral"];
const DEFENSE_POOLS = ["physical", "damage_physical", "astral", "damage_astral", "spells_direct", "spells_indirect", "toxin"];

/** The base sheet is untyped under checkJs (no ApplicationV2 mixin typings), so it is viewed as `any` here like the sprite sheet's mixin. */
const BaseSheet = /** @type {any} */ (SR6BaseActorSheet);

/**
 * The V2 sheet for Critter actors.
 */
export default class SR6CritterActorSheet extends BaseSheet {
    _defaultTab = "summary";

    /** Auto merged with supers by Foundry */
    static DEFAULT_OPTIONS = {
        classes: ["critter"],
    };

    /** @inheritdoc */
    static PARTS = {
        ...super.PARTS,
        summary: {
            ...super.PARTS.summary,
            template: "systems/shadowrun6-eden/templates/sheets/actor/summary-tab/critter.hbs",
        },
        features: {
            ...super.PARTS.features,
            template: "systems/shadowrun6-eden/templates/sheets/actor/features-tab/critter.hbs",
        },
    };

    _configureRenderOptions(options) {
        super._configureRenderOptions(options);
        if (this.document.limited || this.options.limited) return;
        options.parts.push("summary", "features", "description", "effects");
    }

    async _preparePartContext(partId, context) {
        context = await super._preparePartContext(partId, context);

        switch (partId) {
            case "header":
                this._prepareHeader(context);
                break;
            case "summary":
                context.statblock = this._statBlock();
                context.initiatives = INITIATIVES.map((key) => ({
                    key,
                    field: this.actor.system.schema.getField(`initiative.${key}`),
                    ...initiativeView(this.actor.system, this.actor._source.system, key),
                }));
                context.skillRows = this._skillRows();
                context.defensePools = this._defensePools();
                this._prepareCritterItems(context);
                break;
            case "features":
                this._prepareCritterItems(context);
                break;
        }
        return context;
    }

    /**
     * Prepare traits below the name on the header of the sheet
     * @param {object} context The context object to mutate
     */
    _prepareHeader(context) {
        context.traits = [
            {
                field: context.systemFields.metatype,
                value: context.system.metatype,
            },
        ];
    }

    /**
     * Organize and classify Items for Critter sheets.
     * @param {object} context The context object to mutate
     */
    _prepareCritterItems(context) {
        const bySort = (a, b) => (a.sort || 0) - (b.sort || 0);
        const items = Array.from(this.document.items);
        context.powers = items.filter((i) => i.type === "critterpower").sort(bySort);
        context.qualities = items.filter((i) => i.type === "quality").sort(bySort);
        context.weapons = items.filter((i) => SR6CritterActorSheet.#isWeapon(i)).sort(bySort);
    }

    /**
     * @param {Item} item
     * @returns {boolean} Whether the item is a weapon (gear whose type is in the WEAPON_ family)
     */
    static #isWeapon(item) {
        return item.type === "gear" && String(item.system.type).startsWith("WEAPON_");
    }

    /**
     * @returns {Array} The attributes, edge-less, in statblock order. Edit mode shows the stored rank.
     */
    _statBlock() {
        const edit = this._editMode;
        const schema = this.actor.system.schema;
        const system = edit ? this.actor._source.system : this.actor.system;
        return ATTRIBUTES.map((key) => {
            const field = schema.getField(`attributes.${key}`);
            if (key === "essence") return {field, value: system.attributes.essence};
            return {
                field,
                value: system.attributes[key][edit ? "rank" : "pool"],
                rollType: "attribute",
            };
        });
    }

    /**
     * Skills the Critter has ranks in (all skills in edit mode), with their dice pool.
     * @returns {Array<{id: string, label: string, pool: number, rank: number}>}
     */
    _skillRows() {
        const edit = this._editMode;
        const schema = this.actor.system.schema;
        const source = this.actor._source.system.skills;
        return Object.keys(this.actor.system.skills)
            .filter((id) => edit || this.actor.system.skills[id].rank > 0)
            .map((id) => ({
                id,
                label: schema.getField(`skills.${id}`).label,
                pool: this.actor.system.skillPool(id),
                rank: source[id].rank,
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }

    /**
     * @returns {{pools: Array<{key: string, label: string, pool: number}>, rating: number}} Defense pools from the prepared bags
     */
    _defensePools() {
        const system = this.actor.system;
        return {
            pools: DEFENSE_POOLS.map((key) => ({
                key,
                label: game.i18n.localize(`shadowrun6.defense.${key}`),
                pool: system.defensePool[key].pool,
            })),
            rating: system.defenseRating.physical.pool,
        };
    }

    /**
     * Handle a dropped document on the ActorSheet. Critters take critter powers, qualities and weapons.
     * @param {DragEvent} event         The initiating drop event
     * @param {any} document            The resolved Document class
     * @returns {Promise<any>}          The dropped document, or null when it was refused
     * @protected
     */
    async _onDropDocument(event, document) {
        if (document.documentName === "Item") {
            const allowed = DROPPABLE_ITEM_TYPES.has(document.type)
                && (document.type !== "gear" || SR6CritterActorSheet.#isWeapon(document));
            if (!allowed) {
                ui.notifications.error("shadowrun6.ui.notifications.item_not_allowed_to_be_dropped", { localize: true });
                return null;
            }
        }
        return super._onDropDocument(event, document);
    }
}
