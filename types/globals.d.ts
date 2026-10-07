// Project-level type declarations for checkJs. Extend as DataModels replace template.json.
import type { SR6Config } from "../module/config.js";
import type SR6Roll from "../module/SR6Roll.js";
import type SR6SocketHandler from "../module/util/SR6SocketHandler.js";
import type macros from "../module/util/macros.js";
import type releaseNotes from "../releasenotes/releasenotes.js";

declare global {
  /**
   * Options cast for StringField/HTMLField in schemas. With strictNullChecks off, fvtt-types resolves an absent
   * `choices` to `never`, so a bare StringField types as `""` (blank) or `never`; widening the options restores `string`.
   */
  type SR6StringOptions = foundry.data.fields.StringField.Options<string>;
  // Instance types of the item TypeDataModels, for narrowing `item.system` where the code path is type-specific.
  type SR6BaseItemSystem = import("../module/datamodels/base-item-data.mjs").default<ReturnType<typeof import("../module/datamodels/base-item-data.mjs").baseItemSchema>>;
  type SR6GearSystem = InstanceType<typeof import("../module/datamodels/gear-item-data.mjs").default>;
  type SR6ModSystem = InstanceType<typeof import("../module/datamodels/mod-item-data.mjs").default>;
  type SR6SoftwareSystem = InstanceType<typeof import("../module/datamodels/software-item-data.mjs").default>;
  type SR6SpellSystem = InstanceType<typeof import("../module/datamodels/spell-item-data.mjs").default>;
  type SR6SpritepowerSystem = InstanceType<typeof import("../module/datamodels/spritepower-item-data.mjs").default>;
  type SR6ComplexformSystem = InstanceType<typeof import("../module/datamodels/complexform-item-data.mjs").default>;
  /** A condition monitor as initialised at prepare time (SR6ConditionMonitor carries no schema types yet). */
  type SR6PreparedConditionMonitor = Pick<InstanceType<typeof import("../module/datamodels/fields/condition-monitor-data.mjs").default>, "dmg" | "penalty" | "parseDmgToValue"> & { max: number; value: number };
  /**
   * Gear system after SR6Item#_prepareElectronicMatrixDevice replaced `matrix.matrixCM` with an initialised condition monitor.
   * Partial so the stored `{value}` shape stays comparable for the cast (strictNullChecks is off, so reads are unaffected).
   */
  type SR6PreparedGearSystem = SR6GearSystem & { matrix: { matrixCM: Partial<SR6PreparedConditionMonitor> } };
  /** Any item system that has a TypeDataModel (every registered item type). */
  type SR6ItemSystem = {
    [K in keyof import("fvtt-types/configuration").DataModelConfig["Item"]]: InstanceType<import("fvtt-types/configuration").DataModelConfig["Item"][K]>
  }[keyof import("fvtt-types/configuration").DataModelConfig["Item"]];
  /** parseInt stringifies its argument first, so a number is a valid input (legacy code calls it on NumberField values). */
  function parseInt(value: number, radix?: number): number;
  interface CONFIG {
    SR6: SR6Config;
  }
  // The system's code only runs after init/ready, so treat `game` as fully initialised.
  interface AssumeHookRan {
    ready: never;
  }
  // `game` is typed through the lifecycle interfaces (not the global `Game` alias), so merge there.
  interface InitGame { sr6: Partial<SR6GameNamespace> }
  interface I18nInitGame { sr6: Partial<SR6GameNamespace> }
  interface SetupGame { sr6: Partial<SR6GameNamespace> }
  interface ReadyGame { sr6: Partial<SR6GameNamespace> }
}

/** Everything `Shadowrun6.js` assigns to `game.sr6` during `init`. Exposed as Partial because init starts from `game.sr6 = {}`; strictNullChecks is off so reads stay typed. */
interface SR6GameNamespace {
  config: SR6Config;
  datamodels: typeof import("../module/datamodels/_module.mjs");
  documents: typeof import("../module/documents/_module.mjs");
  applications: typeof import("../module/applications/_module.mjs");
  utils: typeof import("../module/util/helper.js");
  rollTypes: typeof import("../module/dice/RollTypes.js");
  macros: typeof macros;
  roll: typeof SR6Roll;
  sockets: SR6SocketHandler;
  releaseNotes: typeof releaseNotes;
  migrations: typeof import("../module/migrations/v2/index.mjs");
}
