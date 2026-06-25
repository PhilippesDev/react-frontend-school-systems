// ═══════════════════════════════════════════════════════════════════════════════
//  schoolJoins.js — Jointures et enrichissement des données API
// ═══════════════════════════════════════════════════════════════════════════════

export const getActiveAnnee = (annees) =>
  annees.find((a) => a.estActive) ?? annees[annees.length - 1] ?? null;

export const classeNom = (classe) => classe?.designation ?? classe?.nom ?? '—';

export const optionNom = (option) => option?.designation ?? '—';

export function mapClasseForUi(classe, options = []) {
  const opt = options.find((o) => o.id === classe.optionId);
  const nom = classeNom(classe);
  const parts = nom.match(/^(\d+(?:ème|ère))\s+(.+)$/);
  return {
    ...classe,
    nom,
    niveau: parts?.[1] ?? '',
    lettre: parts?.[2] ?? '',
    option: optionNom(opt),
    optionId: classe.optionId,
    description: classe.description ?? `Classe ${nom}`,
    capacite: classe.capacite ?? 40,
  };
}

/** Mappe une option API vers le format UI. */
export function mapOptionForUi(option, classes = []) {
  const linked = classes.filter((c) => c.optionId === option.id).map(classeNom);
  return {
    ...option,
    code: option.abreviation ?? option.code ?? '',
    classes: linked,
  };
}

/** Mappe une année scolaire API vers le format timeline / UI. */
export function mapAnneeForUi(annee, index = 0) {
  const colors = ['#f97316', '#a855f7', '#38bdf8', '#4ade80', '#f43f5e', '#818cf8'];
  return {
    ...annee,
    label: annee.designation,
    startDate: new Date(annee.dateDebut),
    endDate: new Date(annee.dateFin),
    color: colors[index % colors.length],
  };
}

export function getInscriptionForEleve(inscriptions, eleveId, anneeId) {
  return inscriptions.find(
    (i) => i.eleveId === eleveId && (!anneeId || i.anneeScolaireId === anneeId),
  );
}

export function enrichEleves({
  eleves,
  inscriptions,
  classes,
  options,
  anneeId,
}) {
  const clsMap = Object.fromEntries(classes.map((c) => [c.id, c]));
  const optMap = Object.fromEntries(options.map((o) => [o.id, o]));

  return eleves.map((eleve) => {
    const ins = getInscriptionForEleve(inscriptions, eleve.id, anneeId);
    const cls = ins ? clsMap[ins.classeId] : null;
    const opt = cls ? optMap[cls.optionId] : null;
    return {
      ...eleve,
      inscriptionId: ins?.id ?? null,
      classeId: ins?.classeId ?? null,
      anneeScolaireId: ins?.anneeScolaireId ?? null,
      dateInscription: ins?.dateInscription ?? null,
      classe: cls ? classeNom(cls) : '—',
      option: opt ? optionNom(opt) : '—',
    };
  });
}

export function buildMeta({ anneesScolaires, semestres, periodes }) {
  return { anneesScolaires, semestres, periodes };
}

export function buildClassesData(classes, options) {
  return {
    classes: classes.map((c) => mapClasseForUi(c, options)),
  };
}

export function mapCotationFromApi(cotation, inscriptions) {
  const ins = inscriptions.find((i) => i.id === cotation.inscriptionId);
  return {
    id: cotation.id,
    eleveId: ins?.eleveId ?? null,
    inscriptionId: cotation.inscriptionId,
    coursClasseId: cotation.coursConcernerClasseId,
    coursConcernerClasseId: cotation.coursConcernerClasseId,
    periodeId: cotation.periodeId,
    valeur: cotation.cote,
    cote: cotation.cote,
    dateSaisie: cotation.dateCotation,
    dateCotation: cotation.dateCotation,
  };
}

export function mapCotationToApi(cotation, inscriptions) {
  let inscriptionId = cotation.inscriptionId;
  if (!inscriptionId && cotation.eleveId) {
    const ins = inscriptions.find((i) => i.eleveId === cotation.eleveId);
    inscriptionId = ins?.id;
  }
  return {
    inscriptionId,
    coursConcernerClasseId: cotation.coursClasseId ?? cotation.coursConcernerClasseId,
    periodeId: cotation.periodeId,
    cote: cotation.valeur ?? cotation.cote,
    dateCotation: cotation.dateSaisie ?? cotation.dateCotation ?? new Date().toISOString().slice(0, 10),
  };
}

export function presenceToRecords(presences, inscriptions, classes) {
  const clsMap = Object.fromEntries(classes.map((c) => [c.id, c]));
  const byKey = {};

  presences.forEach((p) => {
    const ins = inscriptions.find((i) => i.id === p.inscriptionId);
    if (!ins) return;
    const cls = clsMap[ins.classeId];
    const classe = classeNom(cls);
    const key = `${p.datePresence}_${classe}`;
    if (!byKey[key]) {
      byKey[key] = { id: key, date: p.datePresence, classe, presents: [] };
    }
    byKey[key].presents.push(ins.eleveId);
  });

  return Object.values(byKey);
}

export function mapPresenceToApi(inscriptionId, datePresence) {
  return { inscriptionId, datePresence };
}

export function mapPaiementForUi(paiement, inscriptions, fraisConcerner, frais, categories) {
  const ins = inscriptions.find((i) => i.id === paiement.inscriptionId);
  const fcc = fraisConcerner.find((f) => f.id === paiement.fraisConcernerClasseId);
  const fraisItem = fcc ? frais.find((f) => f.id === fcc.fraisId) : null;
  const cat = fraisItem ? categories.find((c) => c.id === fraisItem.categorieFraisId) : null;
  return {
    ...paiement,
    eleveId: ins?.eleveId ?? null,
    fraisId: fcc?.fraisId ?? null,
    montantPaye: paiement.montant,
    fraisDesignation: fraisItem?.designation ?? '—',
    categorieDesignation: cat?.designation ?? '—',
  };
}

export function computePaymentProgress(eleveId, inscriptions, fraisConcerner, paiements, anneeId) {
  const ins = inscriptions.find(
    (i) => i.eleveId === eleveId && (!anneeId || i.anneeScolaireId === anneeId),
  );
  if (!ins) return 0;

  const due = fraisConcerner
    .filter((f) => f.classeId === ins.classeId && f.anneeScolaireId === ins.anneeScolaireId)
    .reduce((sum, f) => sum + (f.montant ?? 0), 0);

  if (due <= 0) return 100;

  const paid = paiements
    .filter((p) => p.inscriptionId === ins.id)
    .reduce((sum, p) => sum + (p.montant ?? p.montantPaye ?? 0), 0);

  return Math.min(100, Math.round((paid / due) * 100));
}

export function getPaymentInfo(progress) {
  const p = progress;
  if (p === 100) return { progress: p, label: 'Soldé', color: '#4ade80', bg: '#12241c', border: '#1b3d2b' };
  if (p >= 70) return { progress: p, label: 'Bon', color: '#38bdf8', bg: '#0c1f2e', border: '#1a3548' };
  if (p >= 40) return { progress: p, label: 'Moyen', color: '#fbbf24', bg: '#2a1f0a', border: '#3d2e12' };
  if (p > 0) return { progress: p, label: 'Bas', color: '#f97316', bg: '#2a1200', border: '#3d1f08' };
  return { progress: p, label: 'Non payé', color: '#f43f5e', bg: '#291415', border: '#441d22' };
}

/** Enseignant → libellé court pour l'UI Cours. */
export function enseignantLabel(e) {
  if (!e) return '—';
  return `Prof. ${e.nom} ${e.prenom?.[0] ?? ''}.`.trim();
}

/** CoursConcernerClasse enrichi pour l'UI Cours / Cotations. */
export function enrichCoursConcerner(cc, { cours = [], classes = [], enseignants = [], annees = [] }) {
  const coursItem = cours.find((c) => c.id === cc.coursId);
  const cls = classes.find((c) => c.id === cc.classeId);
  const ens = enseignants.find((e) => e.id === cc.enseignantId);
  const annee = annees.find((a) => a.id === cc.anneeScolaireId);
  return {
    ...cc,
    max: cc.max,
    nombreHeures: cc.nombreHeures,
    coursDesignation: coursItem?.designation ?? '—',
    coursAbrev: coursItem?.abreviation ?? '—',
    classe: classeNom(cls),
    classeId: cc.classeId,
    enseignant: enseignantLabel(ens),
    annee: annee?.designation ?? '—',
    anneeScolaireId: cc.anneeScolaireId,
    heuresPrevues: cc.nombreHeures,
    heuresRealisees: cc.heuresRealisees ?? 0,
    actif: cc.actif ?? true,
  };
}
