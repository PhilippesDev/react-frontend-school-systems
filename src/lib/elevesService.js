import { keysToPascal, keysToCamel } from './caseUtils';
import { ApiError, TABLES } from './api';

const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:5027/api').replace(/\/$/, '');

async function parseJson(res) {
  try { return await res.json(); } catch { return { message: res.statusText || 'Réponse invalide' }; }
}

function ensureString(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string') return v;
  return String(v);
}

export async function createEleve(body) {
  const table = TABLES.eleve ?? 'Eleves';
  const payload = keysToPascal(body || {});

  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (k === 'ImageFile') {
      if (v) fd.append('ImageFile', v);
      return;
    }
    // Append primitive values as strings; complex objects are JSON-stringified
    if (v === undefined || v === null) return;
    if (typeof v === 'object') fd.append(k, JSON.stringify(v));
    else fd.append(k, ensureString(v));
  });

  let res;
  try {
    res = await fetch(`${API_BASE}/${table}`, { method: 'POST', body: fd });
  } catch (err) {
    throw new ApiError(`Impossible de joindre le serveur : ${err.message}`, 0, null);
  }

  const data = await parseJson(res);
  if (!res.ok) throw new ApiError(data?.message ?? `Erreur HTTP ${res.status}`, res.status, data);
  return keysToCamel(data);
}

export async function updateEleve(id, body) {
  const table = TABLES.eleve ?? 'Eleves';
  const payload = keysToPascal(body || {});

  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (k === 'ImageFile') {
      if (v) fd.append('ImageFile', v);
      return;
    }
    if (v === undefined || v === null) return;
    if (typeof v === 'object') fd.append(k, JSON.stringify(v));
    else fd.append(k, ensureString(v));
  });

  let res;
  try {
    res = await fetch(`${API_BASE}/${table}/${id}`, { method: 'PATCH', body: fd });
  } catch (err) {
    throw new ApiError(`Impossible de joindre le serveur : ${err.message}`, 0, null);
  }

  const data = await parseJson(res);
  if (!res.ok) throw new ApiError(data?.message ?? `Erreur HTTP ${res.status}`, res.status, data);
  return keysToCamel(data);
}
