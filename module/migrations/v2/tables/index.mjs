import { CRITTER_TABLE } from "./critter.mjs";

/** Rename tables by legacy actor type. V1a ships Critter only, unregistered. */
export const TABLES = Object.freeze({ Critter: CRITTER_TABLE });
