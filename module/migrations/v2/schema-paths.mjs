/**
 * Does a DataModel schema declare `path` (dotted, relative to the model's system)? Duck-typed on `field.fields`
 * (SchemaField, EmbeddedDataField), so it works on real Foundry schemas and on the rig tools' recording mock.
 * Anything below an object-like field with no declared children (TypedObjectField, ObjectField, ArrayField) counts as declared.
 * @param {{fields?: object}} schema
 * @param {string} path
 * @returns {boolean}
 */
export function schemaDeclares(schema, path) {
    let field = schema;
    for (const segment of path.split(".")) {
        const children = field?.fields;
        if (!children) return field !== schema && field !== undefined; // a leaf (or typed object) swallows the rest
        field = children[segment];
        if (field === undefined) return false;
    }
    return true;
}

/** Every leaf path a schema declares (typed-object and array fields count as leaves). */
export function schemaLeafPaths(schema, prefix = "") {
    const out = [];
    for (const [name, field] of Object.entries(schema?.fields ?? {})) {
        const path = prefix ? `${prefix}.${name}` : name;
        if (field?.fields && Object.keys(field.fields).length) out.push(...schemaLeafPaths(field, path));
        else out.push(path);
    }
    return out;
}
