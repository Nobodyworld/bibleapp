function typeMatches(value, type) {
  if (type === "array") return Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "object") return value && typeof value === "object" && !Array.isArray(value);
  if (type === "null") return value === null;
  return typeof value === type;
}

function resolveRef(ref, rootSchema, schemas) {
  if (ref.startsWith("#/$defs/")) return rootSchema.$defs?.[ref.slice("#/$defs/".length)] || null;
  return schemas?.[ref] || null;
}

export function validateJsonSchema(value, schema, options = {}, path = "$", rootSchema = schema) {
  const errors = [];
  if (!schema || typeof schema !== "object") return errors;

  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref, rootSchema, options.schemas || {});
    if (!resolved) return [`${path} unresolved schema ref ${schema.$ref}`];
    return validateJsonSchema(value, resolved, options, path, rootSchema);
  }

  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  if (types.length && !types.some((type) => typeMatches(value, type))) {
    errors.push(`${path} expected ${types.join(" or ")}`);
    return errors;
  }

  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path} must be one of ${schema.enum.join(", ")}`);
  if (schema.pattern && typeof value === "string" && !new RegExp(schema.pattern).test(value)) {
    errors.push(`${path} must match ${schema.pattern}`);
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path} must be >= ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path} must be <= ${schema.maximum}`);
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path} must have at least ${schema.minItems} items`);
    if (schema.items) {
      value.forEach((item, index) => {
        errors.push(...validateJsonSchema(item, schema.items, options, `${path}[${index}]`, rootSchema));
      });
    }
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const key of schema.required || []) {
      if (value[key] === undefined) errors.push(`${path}.${key} is required`);
    }
    for (const [key, childSchema] of Object.entries(schema.properties || {})) {
      if (value[key] !== undefined) {
        errors.push(...validateJsonSchema(value[key], childSchema, options, `${path}.${key}`, rootSchema));
      }
    }
  }

  return errors;
}

export function assertValidJsonSchema(value, schema, options = {}, label = "value") {
  const errors = validateJsonSchema(value, schema, options);
  if (errors.length) {
    throw new Error(`${label} failed schema validation: ${errors.slice(0, 5).join("; ")}`);
  }
}
