// Registers the system's document classes and TypeDataModels with fvtt-types.
// Mirrors the `CONFIG.*` assignments in module/Shadowrun6.js `init`.
import type Shadowrun6Actor from "../module/documents/actor.js";
import type SR6Item from "../module/documents/item.mjs";
import type SR6TokenDocument from "../module/documents/token.mjs";
import type Shadowrun6Combat from "../module/Shadowrun6Combat.js";
import type Shadowrun6Combatant from "../module/Shadowrun6Combatant.js";
import type SR6Token from "../module/placeables/SR6Token.js";
import type SR6SpriteActorData from "../module/datamodels/sprite-actor-data.mjs";
import type SR6HostActorData from "../module/datamodels/host-actor-data.mjs";
import type SR6ModItemData from "../module/datamodels/mod-item-data.mjs";
import type SR6SoftwareItemData from "../module/datamodels/software-item-data.mjs";
import type SR6EchoItemData from "../module/datamodels/echo-item-data.mjs";
import type SR6FocusItemData from "../module/datamodels/focus-item-data.mjs";
import type SR6AdeptpowerItemData from "../module/datamodels/adeptpower-item-data.mjs";
import type SR6MetamagicItemData from "../module/datamodels/metamagic-item-data.mjs";
import type SR6MartialarttechItemData from "../module/datamodels/martialarttech-item-data.mjs";
import type SR6MartialartstyleItemData from "../module/datamodels/martialartstyle-item-data.mjs";
import type SR6LifestyleItemData from "../module/datamodels/lifestyle-item-data.mjs";
import type SR6CritterpowerItemData from "../module/datamodels/critterpower-item-data.mjs";
import type SR6RitualItemData from "../module/datamodels/ritual-item-data.mjs";
import type SR6ActiveEffectDataV14 from "../module/datamodels/active-effect-data-v14.mjs";

// LEGACY: these types come from template.json and have no TypeDataModel yet, so their `system` is loose.
// Replace an entry with a DataModelConfig entry when that type gets a TypeDataModel.
type LegacySystem = Record<string, any>;

declare module "fvtt-types/configuration" {
  interface DocumentClassConfig {
    Actor: typeof Shadowrun6Actor;
    Item: typeof SR6Item;
    Token: typeof SR6TokenDocument;
    Combat: typeof Shadowrun6Combat;
    Combatant: typeof Shadowrun6Combatant;
  }
  interface PlaceableObjectClassConfig {
    Token: typeof SR6Token;
  }
  interface DataModelConfig {
    Actor: { sprite: typeof SR6SpriteActorData; host: typeof SR6HostActorData };
    Item: {
      mod: typeof SR6ModItemData;
      software: typeof SR6SoftwareItemData;
      echo: typeof SR6EchoItemData;
      focus: typeof SR6FocusItemData;
      adeptpower: typeof SR6AdeptpowerItemData;
      metamagic: typeof SR6MetamagicItemData;
      martialarttech: typeof SR6MartialarttechItemData;
      martialartstyle: typeof SR6MartialartstyleItemData;
      lifestyle: typeof SR6LifestyleItemData;
      critterpower: typeof SR6CritterpowerItemData;
      ritual: typeof SR6RitualItemData;
    };
    // Types target v14. On Foundry 13 the runtime registers SR6ActiveEffectData instead.
    ActiveEffect: { base: typeof SR6ActiveEffectDataV14 };
  }
  // LEGACY: replace with DataModelConfig when the type gets a TypeDataModel.
  interface SourceConfig {
    Actor: {
      Player: LegacySystem;
      NPC: LegacySystem;
      Critter: LegacySystem;
      Spirit: LegacySystem;
      Vehicle: LegacySystem;
    };
    Item: {
      complexform: LegacySystem;
      contact: LegacySystem;
      spritepower: LegacySystem;
      gear: LegacySystem;
      quality: LegacySystem;
      sin: LegacySystem;
      skill: LegacySystem;
      spell: LegacySystem;
    };
  }
  interface DataConfig {
    Actor: {
      Player: LegacySystem;
      NPC: LegacySystem;
      Critter: LegacySystem;
      Spirit: LegacySystem;
      Vehicle: LegacySystem;
    };
    Item: {
      complexform: LegacySystem;
      contact: LegacySystem;
      spritepower: LegacySystem;
      gear: LegacySystem;
      quality: LegacySystem;
      sin: LegacySystem;
      skill: LegacySystem;
      spell: LegacySystem;
    };
  }
}
