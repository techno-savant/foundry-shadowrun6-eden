// Project-level type declarations for checkJs. Extend as DataModels replace template.json.
export {};

declare global {
  interface CONFIG {
    SR6: any;
  }
  interface Game {
    sr6: any;
  }
  // The system's code only runs after init/ready, so treat `game` as fully initialised.
  interface AssumeHookRan {
    ready: never;
  }
}
