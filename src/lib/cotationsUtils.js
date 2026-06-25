// ═══════════════════════════════════════════════════════════════════════════════
//  cotationsUtils.js — Calculs, validation et persistance des cotations
// ═══════════════════════════════════════════════════════════════════════════════

import { createOne, updateOne, deleteOne } from './api';
import { mapCotationToApi } from './schoolJoins';

export const PERIODE_TYPES = {
  1: '1ere_periode',
  2: '2eme_periode',
  3: 'examen',
  4: '1ere_periode',
  5: '2eme_periode',
  6: 'examen',
};

export const BULLETIN_TYPES = [
  { id: 'p1_s1', label: 'Bulletin 1ère période (S1)', periodeId: 1, semestreId: 1 },
  { id: 'p2_s1', label: 'Bulletin 2ème période (S1)', periodeId: 2, semestreId: 1 },
  { id: 'ex_s1', label: "Bulletin d'examen (S1)", periodeId: 3, semestreId: 1 },
  { id: 'sem1', label: 'Bulletin 1er semestre', semestreId: 1 },
  { id: 'p1_s2', label: 'Bulletin 1ère période (S2)', periodeId: 4, semestreId: 2 },
  { id: 'p2_s2', label: 'Bulletin 2ème période (S2)', periodeId: 5, semestreId: 2 },
  { id: 'ex_s2', label: "Bulletin d'examen (S2)", periodeId: 6, semestreId: 2 },
  { id: 'sem2', label: 'Bulletin 2ème semestre', semestreId: 2 },
  { id: 'annuel', label: 'Bulletin annuel complet' },
];

// ─── Helpers données ─────────────────────────────────────────────────────────

export const fullName = (e) => `${e.nom} ${e.postnom} ${e.prenom}`;

export const getActiveAnnee = (meta) =>
  meta.anneesScolaires.find((a) => a.estActive) ?? meta.anneesScolaires[0];

export const getClasseByNom = (classesData, nom) =>
  classesData.classes.find((c) => c.nom === nom);

export const getClasseById = (classesData, id) =>
  classesData.classes.find((c) => c.id === id);

export const getElevesByClasse = (eleves, classeNom) =>
  eleves.filter((e) => e.classe === classeNom);

export const getCoursClasseForClasse = (coursClasses, classeId, anneeId) =>
  coursClasses.filter((cc) => cc.classeId === classeId && cc.anneeScolaireId === anneeId);

export const enrichCoursClasse = (coursClasseList, coursList) =>
  coursClasseList.map((cc) => {
    const cours = coursList.find((c) => c.id === cc.coursId);
    return {
      ...cc,
      coursDesignation: cours?.designation ?? '—',
      coursAbrev: cours?.abreviation ?? '—',
    };
  });

export const getPeriodesForSemestre = (meta, semestreId) =>
  meta.periodes.filter((p) => p.semestreId === semestreId);

export const getSemestreLabel = (meta, semestreId) =>
  meta.semestres.find((s) => s.id === semestreId)?.designation ?? `Semestre ${semestreId}`;

export const isExamenPeriode = (periodeId) => PERIODE_TYPES[periodeId] === 'examen';

/** Max de saisie : max × 2 pour les périodes d'examen */
export const getMaxCote = (coursClasse, periodeId) =>
  coursClasse.max * (isExamenPeriode(periodeId) ? 2 : 1);

// ─── Validation ──────────────────────────────────────────────────────────────

export const validateCote = (valeur, max) => {
  if (valeur === '' || valeur === null || valeur === undefined) {
    return { valid: false, error: 'La cote est requise' };
  }
  const num = Number(valeur);
  if (Number.isNaN(num)) return { valid: false, error: 'Valeur numérique invalide' };
  if (num < 0) return { valid: false, error: 'La cote ne peut pas être négative' };
  if (num > max) return { valid: false, error: `Maximum autorisé : ${max}` };
  return { valid: true, value: num };
};

// ─── Accès aux cotations ─────────────────────────────────────────────────────

export const findCotation = (cotations, eleveId, coursClasseId, periodeId) =>
  cotations.find(
    (c) =>
      c.eleveId === eleveId &&
      c.coursClasseId === coursClasseId &&
      c.periodeId === periodeId,
  );

export const getCoteValue = (cotations, eleveId, coursClasseId, periodeId) => {
  const c = findCotation(cotations, eleveId, coursClasseId, periodeId);
  return c?.valeur ?? null;
};

// ─── Calculs ─────────────────────────────────────────────────────────────────

/** Moyenne pondérée par heures pour une période (en %) */
export const computePeriodMoyenne = (cotations, eleveId, periodeId, coursClasseList) => {
  let sumWeighted = 0;
  let sumHeures = 0;

  for (const cc of coursClasseList) {
    const val = getCoteValue(cotations, eleveId, cc.id, periodeId);
    if (val == null) continue;
    const maxP = getMaxCote(cc, periodeId);
    sumWeighted += (val / maxP) * cc.nombreHeures;
    sumHeures += cc.nombreHeures;
  }

  if (sumHeures === 0) return null;
  return (sumWeighted / sumHeures) * 100;
};

/** Moyenne semestrielle d'un cours (en %, coef périodes) */
export const computeCourseSemesterMoyenne = (
  cotations,
  eleveId,
  coursClasse,
  periodeIds,
  periodes,
) => {
  let sumWeighted = 0;
  let sumCoef = 0;

  for (const pid of periodeIds) {
    const val = getCoteValue(cotations, eleveId, coursClasse.id, pid);
    if (val == null) continue;
    const maxP = getMaxCote(coursClasse, pid);
    const periode = periodes.find((p) => p.id === pid);
    const coef = periode?.coefficient ?? 1;
    sumWeighted += (val / maxP) * coef;
    sumCoef += coef;
  }

  if (sumCoef === 0) return null;
  return (sumWeighted / sumCoef) * 100;
};

/** Moyenne semestrielle générale (pondérée par heures, en %) */
export const computeSemesterMoyenne = (
  cotations,
  eleveId,
  semestreId,
  coursClasseList,
  periodes,
) => {
  const periodeIds = periodes.filter((p) => p.semestreId === semestreId).map((p) => p.id);
  let sumWeighted = 0;
  let sumHeures = 0;

  for (const cc of coursClasseList) {
    const moy = computeCourseSemesterMoyenne(
      cotations,
      eleveId,
      cc,
      periodeIds,
      periodes,
    );
    if (moy == null) continue;
    sumWeighted += (moy / 100) * cc.nombreHeures;
    sumHeures += cc.nombreHeures;
  }

  if (sumHeures === 0) return null;
  return (sumWeighted / sumHeures) * 100;
};

/** Total semestre = moyenne semestrielle (calculée, jamais saisie) */
export const computeSemesterTotal = computeSemesterMoyenne;

/** Moyenne annuelle */
export const computeAnnualMoyenne = (
  cotations,
  eleveId,
  coursClasseList,
  periodes,
) => {
  const m1 = computeSemesterMoyenne(cotations, eleveId, 1, coursClasseList, periodes);
  const m2 = computeSemesterMoyenne(cotations, eleveId, 2, coursClasseList, periodes);
  if (m1 != null && m2 != null) return (m1 + m2) / 2;
  if (m1 != null) return m1;
  if (m2 != null) return m2;
  return null;
};

/** Décision finale basée sur la moyenne annuelle (%) */
export const computeDecision = (moyenneAnnuelle, seuil = 50) => {
  if (moyenneAnnuelle == null) return '—';
  return moyenneAnnuelle >= seuil ? 'ADMIS' : 'REFUSÉ';
};

/** Classements pour une liste d'élèves */
export const computeRankings = (eleves, getMoyenne) => {
  const scored = eleves
    .map((e) => ({ eleve: e, moyenne: getMoyenne(e.id) }))
    .filter((s) => s.moyenne != null)
    .sort((a, b) => b.moyenne - a.moyenne);

  const ranks = new Map();
  let rank = 1;
  for (let i = 0; i < scored.length; i++) {
    if (i > 0 && scored[i].moyenne < scored[i - 1].moyenne) rank = i + 1;
    ranks.set(scored[i].eleve.id, rank);
  }
  return ranks;
};

/** Résultats complets d'un élève pour affichage fiche / bulletin */
export const buildEleveResults = (
  cotations,
  eleve,
  coursClasseList,
  meta,
) => {
  const periodes = meta.periodes;
  const semestres = meta.semestres;

  const coursResults = coursClasseList.map((cc) => {
    const periodeCotes = periodes.map((p) => ({
      periodeId: p.id,
      periodeLabel: p.designation,
      semestreId: p.semestreId,
      coefficient: p.coefficient,
      cote: getCoteValue(cotations, eleve.id, cc.id, p.id),
      max: getMaxCote(cc, p.id),
    }));

    const semestreMoyennes = semestres.map((s) => {
      const pIds = periodes.filter((p) => p.semestreId === s.id).map((p) => p.id);
      return {
        semestreId: s.id,
        label: s.designation,
        moyenne: computeCourseSemesterMoyenne(cotations, eleve.id, cc, pIds, periodes),
        max: 100,
      };
    });

    return { ...cc, periodeCotes, semestreMoyennes };
  });

  const periodMoyennes = periodes.map((p) => ({
    periodeId: p.id,
    label: p.designation,
    semestreId: p.semestreId,
    moyenne: computePeriodMoyenne(cotations, eleve.id, p.id, coursClasseList),
  }));

  const semesterMoyennes = semestres.map((s) => ({
    semestreId: s.id,
    label: s.designation,
    moyenne: computeSemesterMoyenne(cotations, eleve.id, s.id, coursClasseList, periodes),
  }));

  const moyenneAnnuelle = computeAnnualMoyenne(cotations, eleve.id, coursClasseList, periodes);

  return {
    coursResults,
    periodMoyennes,
    semesterMoyennes,
    moyenneAnnuelle,
    decision: computeDecision(moyenneAnnuelle),
  };
};

/** Lignes du tableau de classe */
export const buildClassTableRows = (
  cotations,
  eleves,
  coursClasseList,
  meta,
  semestreId = null,
) => {
  const periodes = semestreId
    ? meta.periodes.filter((p) => p.semestreId === semestreId)
    : meta.periodes;

  const getMoyenne = (eleveId) => {
    if (semestreId) {
      return computeSemesterMoyenne(cotations, eleveId, semestreId, coursClasseList, meta.periodes);
    }
    return computeAnnualMoyenne(cotations, eleveId, coursClasseList, meta.periodes);
  };

  const ranks = computeRankings(eleves, getMoyenne);

  return eleves.map((eleve) => {
    const periodAvgs = periodes.map((p) => ({
      periodeId: p.id,
      label: p.designation,
      moyenne: computePeriodMoyenne(cotations, eleve.id, p.id, coursClasseList),
    }));

    const totalSemestre = semestreId
      ? computeSemesterTotal(cotations, eleve.id, semestreId, coursClasseList, meta.periodes)
      : null;

    const moyenneGenerale = getMoyenne(eleve.id);

    return {
      eleve,
      periodAvgs,
      totalSemestre,
      moyenneGenerale,
      rang: ranks.get(eleve.id) ?? null,
    };
  });
};

// ─── Persistance API ─────────────────────────────────────────────────────────

export const saveCotation = async (cotation, inscriptions, existingId) => {
  const body = mapCotationToApi(cotation, inscriptions);
  if (existingId) return updateOne('cotation', existingId, body);
  return createOne('cotation', body);
};

export const removeCotation = async (id) => deleteOne('cotation', id);

export const nextCotationId = (cotations) =>
  cotations.reduce((max, c) => Math.max(max, c.id), 0) + 1;

export const formatNote = (val, decimals = 2) => {
  if (val == null) return '—';
  return Number(val).toFixed(decimals);
};

export const formatPourcentage = (val) => {
  if (val == null) return '—';
  return `${Number(val).toFixed(2)} %`;
};

/** @deprecated utiliser formatPourcentage */
export const formatNoteSur20 = formatPourcentage;
