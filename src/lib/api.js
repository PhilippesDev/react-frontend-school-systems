
import { keysToCamel, keysToPascal } from './caseUtils';

const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:5027/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const TABLES = {
  eleve: 'Eleves',
  parent: 'Parents',
  inscription: 'Inscriptions',
  presence: 'Presences',
  cotation: 'Cotations',
  periode: 'Periodes',
  semestre: 'Semestres',
  coursConcernerClasse: 'cours-concerner-classes',
  cours: 'Cours',
  enseignant: 'Enseignants',
  classe: 'Classes',
  option: 'Options',
  anneeScolaire: 'Anneescolaires',
  paiement: 'Paiements',
  fraisConcernerClasse: 'Frais-Concerner-Classes',
  frais: 'Frais',
  categorieFrais: 'CategorieFrais',
};

async function parseJson(res) {
  try {
    return await res.json();
  } catch {
    return { message: res.statusText || 'Réponse invalide' };
  }
}

function unwrapList(data, tableName) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data[tableName])) return data[tableName];
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...options.headers },
      ...options,
    });
  } catch (err) {
    throw new ApiError(`Impossible de charger les données : ${err.message}`, 0, null);
  }

  const data = await parseJson(res);

  if (!res.ok) {
    const msg = data?.message ?? `Erreur HTTP ${res.status}`;
    throw new ApiError(msg, res.status, data);
  }

  if (data && typeof data === 'object' && Object.keys(data).length === 1 && 'message' in data && !Array.isArray(data)) {
    return data;
  }

  return data;
}

export async function apiRequest(path, options = {}) {
  return request(path, options);
}

export async function fetchAll(tableKey) {
  const table = TABLES[tableKey] ?? tableKey;
  const data = await request(`/${table}`);
  return keysToCamel(unwrapList(data, table));
}

export async function fetchOne(tableKey, id) {
  const table = TABLES[tableKey] ?? tableKey;
  const data = await request(`/${table}/${id}`);
  if (data?.message && !data?.id && !data?.Id) {
    throw new ApiError(data.message, 404, data);
  }
  return keysToCamel(data);
}

export async function createOne(tableKey, body) {
  const table = TABLES[tableKey] ?? tableKey;
  const payload = keysToPascal(body);
  const data = await request(`/${table}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return keysToCamel(data);
}

export async function updateOne(tableKey, id, body) {
  const table = TABLES[tableKey] ?? tableKey;
  const payload = keysToPascal(body);
  const data = await request(`/${table}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return keysToCamel(data);
}


export async function deleteOne(tableKey, id) {
  const table = TABLES[tableKey] ?? tableKey;
  const data = await request(`/${table}/${id}`, { method: 'DELETE' });
  return keysToCamel(data);
}

export async function fetchMany(tableKeys) {
  const entries = await Promise.all(
    tableKeys.map(async (key) => [key, await fetchAll(key)]),
  );
  return Object.fromEntries(entries);
}
