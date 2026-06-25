/** Convertit la première lettre en minuscule (PascalCase → camelCase). */
export function toCamelCase(str) {
  if (!str || typeof str !== 'string') return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/** Convertit la première lettre en majuscule (camelCase → PascalCase). */
export function toPascalCase(str) {
  if (!str || typeof str !== 'string') return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Convertit récursivement les clés d'un objet API (PascalCase) vers camelCase. */
export function keysToCamel(value) {
  if (Array.isArray(value)) return value.map(keysToCamel);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [toCamelCase(k), keysToCamel(v)]),
    );
  }
  return value;
}

/** Convertit récursivement les clés d'un objet frontend (camelCase) vers PascalCase pour l'API. */
export function keysToPascal(value) {
  if (Array.isArray(value)) return value.map(keysToPascal);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [toPascalCase(k), keysToPascal(v)]),
    );
  }
  return value;
}
