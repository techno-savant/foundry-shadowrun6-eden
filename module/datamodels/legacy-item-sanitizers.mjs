/**
 * Load-time sanitisers for item types that used to come from template.json.
 * Each one replaces a stored value that would fail validation (and so make the whole item invalid)
 * with something the schema accepts. They change `source` in place and never rename or add keys.
 *
 * `source` can be an object Foundry has already sealed (an initialised document's `_source` fed back through migrateData):
 * only existing keys may be assigned there, and `delete` throws, so removal goes through removeKey. A frozen source can't be
 * changed at all and is left as is.
 */
import { removeKey } from "../migrations/v2/table.mjs";

/**
 * Replace values that are not finite numbers with the field's initial value.
 * Numeric strings are left alone, because NumberField casts them.
 * @param {object} model Model class (a TypeDataModel subclass) whose schema holds the keys
 * @param {object} source Source data, changed in place
 * @param {string[]} keys NumberField keys of the schema
 */
export function sanitizeNumbers(model, source, keys) {
    if (Object.isFrozen(source)) return;
    for (const key of keys) {
        if (!(key in source)) continue;
        const value = source[key];
        const isUsable = typeof value !== "object" && value !== "" && Number.isFinite(Number(value));
        if (!isUsable) source[key] = /** @type {any} */ (model).schema.fields[key].initial;
    }
}

/**
 * Replace values that are not plain objects with `{}`, so the SchemaField defaults fill them.
 * @param {object} model Model class (a TypeDataModel subclass) whose schema holds the keys
 * @param {object} source Source data, changed in place
 * @param {string[]} keys SchemaField keys of the schema
 */
export function sanitizeObjects(model, source, keys) {
    if (Object.isFrozen(source)) return;
    for (const key of keys) {
        if (key in source && foundry.utils.getType(source[key]) !== "Object") source[key] = {};
    }
}

/**
 * Handle the constraints of the V2 item base (SR6BaseItemData) that legacy data can violate:
 * `page` must be a number of at least 1 (else null), and `product` must be a known book slug (else removed).
 * @param {object} source Source data, changed in place
 */
export function sanitizeV2Base(source) {
    if (Object.isFrozen(source)) return;
    if ("page" in source) {
        const page = source.page;
        const isUsable = page !== null && page !== "" && typeof page !== "object" && Number.isFinite(Number(page)) && Number(page) >= 1;
        if (!isUsable) source.page = null;
    }
    if ("product" in source) {
        const product = typeof source.product === "string" ? source.product.toLowerCase() : undefined;
        if (product !== undefined && Object.hasOwn(CONFIG.SR6.PDF_OPTIONS.BOOKS, product)) source.product = product;
        else removeKey(source, "product");
    }
}

/**
 * Turn a description stored as `{value: "…"}` into the string; any other non-string becomes "".
 * @param {object} source Source data, changed in place
 */
export function sanitizeDescription(source) {
    if (Object.isFrozen(source) || !("description" in source)) return;
    const description = source.description;
    if (typeof description === "string") return;
    source.description = typeof description?.value === "string" ? description.value : "";
}
