import SR6GenesisItemData, { genesisItemSchema } from "./genesis-item-data.mjs";

/**
 * Echoes have no fields beyond the genesis template.
 * @extends {SR6GenesisItemData<ReturnType<typeof genesisItemSchema>>}
 */
export default class SR6EchoItemData extends SR6GenesisItemData {}
