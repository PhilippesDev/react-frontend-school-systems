// ═══════════════════════════════════════════════════════════════════════════════
//  parentsUtils.js — Comptes parents, session (API Parent + Eleve.ParentId)
// ═══════════════════════════════════════════════════════════════════════════════

import { createOne, fetchAll, updateOne } from './api';

export const PARENT_SESSION_KEY = 'parent_session';

export const getSession = () => {
  try {
    const s = localStorage.getItem(PARENT_SESSION_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
};

export const setSession = (parent) => {
  localStorage.setItem(PARENT_SESSION_KEY, JSON.stringify({
    parentId: parent.id,
    telephone: parent.telephone,
    nom: `${parent.nom} ${parent.prenom ?? ''}`.trim(),
  }));
};

export const clearSession = () => {
  localStorage.removeItem(PARENT_SESSION_KEY);
};

/** Connexion par numéro de téléphone (champ Telephone de la table Parent). */
export const findParentByTelephone = (parents, telephone) => {
  const t = telephone?.trim().replace(/\s/g, '');
  if (!t) return null;
  return parents.find((p) => p.telephone?.replace(/\s/g, '') === t);
};

/** @deprecated alias — utilise le téléphone */
export const findParentByCode = (parents, code) => findParentByTelephone(parents, code);

/** Enfants liés via Eleve.ParentId */
export const getElevesForParent = (eleves, parentId) =>
  eleves.filter((e) => e.parentId === parentId);

export const registerParent = async ({ nom, postnom, prenom, sexe, profession, telephone, eleveIds }) => {
  const parent = await createOne('parent', {
    nom: nom.trim(),
    postnom: postnom?.trim() || '',
    prenom: prenom?.trim() || '',
    sexe: sexe || 'M',
    profession: profession?.trim() || '',
    telephone: telephone?.trim() || '',
  });

  const parents = await fetchAll('parent');

  if (eleveIds?.length) {
    await Promise.all(
      eleveIds.map((eleveId) => updateOne('eleve', eleveId, { parentId: parent.id })),
    );
  }

  return { parent, parents };
};
