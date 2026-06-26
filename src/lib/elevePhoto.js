/** Serveur backend (images statiques, distinct du frontend). */
export const BACKEND_BASE = 'http://localhost:5027';

const ELEVE_PHOTOS_PATH = '/images/eleves';

/**
 * Construit l'URL d'affichage d'une photo élève.
 * La BDD stocke uniquement le nom de fichier (ex. `uuid.jpeg`).
 */
export function elevePhotoUrl(photo) {
  if (!photo || typeof photo !== 'string') return null;
  const trimmed = photo.trim();
  if (!trimmed) return null;
  if (/^(https?:|blob:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/images/')) return `${BACKEND_BASE}${trimmed}`;
  const filename = trimmed.includes('/') ? trimmed.split('/').pop() : trimmed;
  return `${BACKEND_BASE}${ELEVE_PHOTOS_PATH}/${filename}`;
}
