import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { fetchMany } from '../lib/api';
import { getActiveAnnee } from '../lib/schoolJoins';

const STORAGE_KEY = 'school_selected_annee_id';

const AnneeScolaireContext = createContext(null);

export function AnneeScolaireProvider({ children }) {
  const [anneeId, setAnneeIdState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : null;
  });

  const setAnneeId = useCallback((id) => {
    setAnneeIdState(id);
    if (id != null) localStorage.setItem(STORAGE_KEY, String(id));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (anneeId !== null) return;
    fetchMany(['anneeScolaire'])
      .then((data) => {
        const active = getActiveAnnee(data.anneeScolaire ?? []);
        if (active?.id) setAnneeId(active.id);
      })
      .catch(() => {});
  }, [anneeId, setAnneeId]);

  return (
    <AnneeScolaireContext.Provider value={{ anneeId, setAnneeId }}>
      {children}
    </AnneeScolaireContext.Provider>
  );
}

export function useAnneeScolaire() {
  const ctx = useContext(AnneeScolaireContext);
  if (!ctx) {
    throw new Error('useAnneeScolaire doit être utilisé dans AnneeScolaireProvider');
  }
  return ctx;
}
