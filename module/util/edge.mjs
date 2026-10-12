/**
 * The update data that sets an actor's current Edge. V2 (DataModel) actors store it at `system.edge.current`; `edge.value` is only a
 * compatibility getter there, not a schema field, so a write to it is not guaranteed to land. Legacy actors keep `system.edge.value`.
 * @param {{isActorV2?: boolean}} actor   The actor whose Edge is written
 * @param {number} value                  The new current Edge
 * @returns {Record<string, number>}      Update data for actor.update()
 */
export function edgeUpdate(actor, value) {
    return { [actor?.isActorV2 ? "system.edge.current" : "system.edge.value"]: value };
}
