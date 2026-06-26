import { keysToCamel, toPascalCase } from './caseUtils';
import { ApiError, TABLES } from './api';

const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:5027/api').replace(/\/$/, '');

const TEXT_FIELDS = [
  'nom', 'postnom', 'prenom', 'sexe', 'dateNaissance', 'lieuNaissance',
  'adresse', 'nomsPere', 'nomsMere', 'numPere', 'numMere',
];

async function parseJson(res) {
  try {
    return await res.json();
  } catch {
    return { message: res.statusText || 'Réponse invalide' };
  }
}

function buildFormData(body) {
  const fd = new FormData();

  for (const key of TEXT_FIELDS) {
    const value = body[key];
    if (value !== undefined && value !== null) {
      fd.append(toPascalCase(key), String(value));
    }
  }

  if (body.imageFile instanceof File) {
    fd.append('ImageFile', body.imageFile);
  }

  return fd;
}

async function sendFormData(path, method, body) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { Accept: 'application/json' },
      body: buildFormData(body),
    });
  } catch (err) {
    throw new ApiError(`Impossible de joindre le serveur : ${err.message}`, 0, null);
  }

  const data = await parseJson(res);
  if (!res.ok) {
    throw new ApiError(data?.message ?? `Erreur HTTP ${res.status}`, res.status, data);
  }

  return keysToCamel(data);
}

export async function createEleve(body) {
  const table = TABLES.eleve ?? 'Eleves';
  return sendFormData(`/${table}`, 'POST', body);
}

export async function updateEleve(id, body) {
  const table = TABLES.eleve ?? 'Eleves';
  return sendFormData(`/${table}/${id}`, 'PATCH', body);
}
