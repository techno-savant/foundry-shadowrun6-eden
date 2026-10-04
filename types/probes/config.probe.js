// Type-level probes: checked by `npm run typecheck`, never loaded by Foundry (not in system.json esmodules).
// If a declaration in types/ regresses, an assignment here fails or an @ts-expect-error goes unused.

/** @type {import("../../module/config.js").SR6Config} */
export const config = CONFIG.SR6;

/** @type {typeof import("../../module/documents/actor.js").default} */
export const actorClass = CONFIG.Actor.documentClass;

/** @type {typeof import("../../module/documents/item.mjs").default} */
export const itemClass = CONFIG.Item.documentClass;

/** @type {typeof import("../../module/documents/token.mjs").default} */
export const tokenClass = CONFIG.Token.documentClass;

/** @type {typeof import("../../module/Shadowrun6Combat.js").default} */
export const combatClass = CONFIG.Combat.documentClass;

/** @type {typeof import("../../module/Shadowrun6Combatant.js").default} */
export const combatantClass = CONFIG.Combatant.documentClass;

/** @type {typeof import("../../module/placeables/SR6Token.js").default} */
export const tokenObjectClass = CONFIG.Token.objectClass;

/** @type {typeof import("../../module/SR6Roll.js").default} */
export const roll = game.sr6.roll;

/** @type {import("../../module/config.js").SR6Config} */
export const gameConfig = game.sr6.config;

// `game.sr6` must not be `any`.
// @ts-expect-error
game.sr6.doesNotExist;

/** @param {Actor.Known} actor */
export function spriteNarrowing(actor) {
  if (actor.type === "sprite") {
    /** @type {InstanceType<typeof import("../../module/datamodels/sprite-actor-data.mjs").default>} */
    const system = actor.system;
    return system;
  }
}

/** @param {Item.Known} item */
export function modNarrowing(item) {
  if (item.type === "mod") {
    /** @type {InstanceType<typeof import("../../module/datamodels/mod-item-data.mjs").default>} */
    const system = item.system;
    return system;
  }
}

/** @type {typeof import("../../module/datamodels/ritual-item-data.mjs").default} */
export const ritualModel = CONFIG.Item.dataModels.ritual;

/** @param {Item.Known} item */
export function focusNarrowing(item) {
  if (item.type === "focus") {
    /** @type {InstanceType<typeof import("../../module/datamodels/focus-item-data.mjs").default>} */
    const system = item.system;
    return system;
  }
}

/** @param {Item.Known} item */
export function spellNarrowing(item) {
  if (item.type === "spell") {
    /** @type {InstanceType<typeof import("../../module/datamodels/spell-item-data.mjs").default>} */
    const system = item.system;
    return system;
  }
}

/** @param {Item.Known} item */
export function gearNarrowing(item) {
  if (item.type === "gear") {
    /** @type {InstanceType<typeof import("../../module/datamodels/gear-item-data.mjs").default>} */
    const system = item.system;
    return system;
  }
}

/** @param {Actor.Known} actor */
export function legacyLooseSystem(actor) {
  // Legacy template.json types have a loose `system` until they get a TypeDataModel.
  if (actor.type === "Player") return actor.system.anything.at.all;
}
