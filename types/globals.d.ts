// Project-level type declarations for checkJs. Extend as DataModels replace template.json.
import type { SR6Config } from "../module/config.js";
import type SR6Roll from "../module/SR6Roll.js";
import type SR6SocketHandler from "../module/util/SR6SocketHandler.js";
import type macros from "../module/util/macros.js";
import type releaseNotes from "../releasenotes/releasenotes.js";

declare global {
  interface CONFIG {
    SR6: SR6Config;
  }
  // The system's code only runs after init/ready, so treat `game` as fully initialised.
  interface AssumeHookRan {
    ready: never;
  }
  // `game` is typed through the lifecycle interfaces (not the global `Game` alias), so merge there.
  interface InitGame { sr6: SR6GameNamespace }
  interface I18nInitGame { sr6: SR6GameNamespace }
  interface SetupGame { sr6: SR6GameNamespace }
  interface ReadyGame { sr6: SR6GameNamespace }
}

/** Everything `Shadowrun6.js` assigns to `game.sr6` during `init`. */
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
}
