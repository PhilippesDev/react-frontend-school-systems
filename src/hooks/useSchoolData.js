import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAnneeScolaire } from '../context/AnneeScolaireContext';
import { fetchMany } from '../lib/api';
import {
  enrichEleves,
  getActiveAnnee,
  mapClasseForUi,
  mapOptionForUi,
  mapAnneeForUi,
  buildMeta,
  buildClassesData,
  mapCotationFromApi,
  enrichCoursConcerner,
} from '../lib/schoolJoins';

const CORE_KEYS = [
  'eleve',
  'inscription',
  'classe',
  'option',
  'anneeScolaire',
  'semestre',
  'periode',
  'cours',
  'coursConcernerClasse',
  'enseignant',
  'cotation',
  'presence',
  'paiement',
  'frais',
  'fraisConcernerClasse',
  'categorieFrais',
  'parent',
];

/**
 * Charge les données scolaires depuis l'API et expose des vues enrichies pour l'UI.
 */
export function useSchoolData({ keys = CORE_KEYS, anneeId: anneeIdProp } = {}) {
  const { anneeId: globalAnneeId } = useAnneeScolaire();
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMany(keys);
      setRaw(data);
    } catch (err) {
      setError(err);
      setRaw(null);
    } finally {
      setLoading(false);
    }
  }, [keys.join(',')]);

  useEffect(() => {
    load();
  }, [load]);

  const activeAnnee = useMemo(
    () => (raw?.anneeScolaire ? getActiveAnnee(raw.anneeScolaire) : null),
    [raw],
  );

  const anneeId = anneeIdProp ?? globalAnneeId ?? activeAnnee?.id ?? null;

  const classesUi = useMemo(
    () => (raw?.classe ?? []).map((c) => mapClasseForUi(c, raw?.option ?? [])),
    [raw],
  );

  const optionsUi = useMemo(
    () => (raw?.option ?? []).map((o) => mapOptionForUi(o, raw?.classe ?? [])),
    [raw],
  );

  const anneesUi = useMemo(
    () => (raw?.anneeScolaire ?? []).map(mapAnneeForUi),
    [raw],
  );

  const elevesEnriched = useMemo(() => {
    if (!raw) return [];
    return enrichEleves({
      eleves: raw.eleve ?? [],
      inscriptions: raw.inscription ?? [],
      classes: raw.classe ?? [],
      options: raw.option ?? [],
      anneeId,
      annees: raw.anneeScolaire ?? [],
    });
  }, [raw, anneeId]);

  const meta = useMemo(() => {
    if (!raw) return { anneesScolaires: [], semestres: [], periodes: [] };
    return buildMeta({
      anneesScolaires: raw.anneeScolaire ?? [],
      semestres: raw.semestre ?? [],
      periodes: raw.periode ?? [],
    });
  }, [raw]);

  const classesData = useMemo(
    () => buildClassesData(raw?.classe ?? [], raw?.option ?? []),
    [raw],
  );

  const cotationsUi = useMemo(() => {
    if (!raw?.cotation) return [];
    return raw.cotation.map((c) => mapCotationFromApi(c, raw.inscription ?? []));
  }, [raw]);

  const coursClassesEnriched = useMemo(() => {
    if (!raw?.coursConcernerClasse) return [];
    return raw.coursConcernerClasse.map((cc) =>
      enrichCoursConcerner(cc, {
        cours: raw.cours ?? [],
        classes: raw.classe ?? [],
        enseignants: raw.enseignant ?? [],
        annees: raw.anneeScolaire ?? [],
      }),
    );
  }, [raw]);

  return {
    raw,
    loading,
    error,
    reload: load,
    activeAnnee,
    anneeId,
    eleves: elevesEnriched,
    classes: classesUi,
    options: optionsUi,
    annees: anneesUi,
    meta,
    classesData,
    cotations: cotationsUi,
    cours: raw?.cours ?? [],
    coursClasses: coursClassesEnriched,
    enseignants: raw?.enseignant ?? [],
    inscriptions: raw?.inscription ?? [],
    presences: raw?.presence ?? [],
    paiements: raw?.paiement ?? [],
    frais: raw?.frais ?? [],
    fraisConcerner: raw?.fraisConcernerClasse ?? [],
    categoriesFrais: raw?.categorieFrais ?? [],
    parents: raw?.parent ?? [],
  };
}
