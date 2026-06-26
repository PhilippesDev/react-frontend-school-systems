import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  X,
  Users,
  School,
  BookOpen,
  Save,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  LayoutGrid,
  List,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { useSchoolData } from '../hooks/useSchoolData';
import { createOne, updateOne, deleteOne } from '../lib/api';
import { elevePhotoUrl } from '../lib/elevePhoto';

// ─────────────────────────────────────────────────────────────────────────────
//  DONNÉES & CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const NIVEAUX = ['Tous', '7ème', '8ème', '1ère', '2ème', '3ème', '4ème'];

// ─────────────────────────────────────────────────────────────────────────────
//  MODAL — Wrapper générique
// ─────────────────────────────────────────────────────────────────────────────
function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} bg-[#111116] border border-[#222233] rounded-2xl shadow-2xl overflow-hidden`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1b1b26]">
          <h3 className="text-white font-bold text-lg tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#1a1a26] text-[#62627a] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  FORMULAIRE — Inputs cohérents
// ─────────────────────────────────────────────────────────────────────────────
function FormInput({ label, type = 'text', value, onChange, placeholder, required = false }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-[#a0a0b0] uppercase tracking-wider">
        {label} {required && <span className="text-[#f43f5e]">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full bg-[#09090e] border border-[#222233] rounded-xl text-sm text-white placeholder-[#44445a] outline-none focus:border-[#4ade80] transition-colors px-3.5 py-2.5"
      />
    </div>
  );
}

function FormSelect({ label, value, onChange, options, required = false }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-[#a0a0b0] uppercase tracking-wider">
        {label} {required && <span className="text-[#f43f5e]">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          required={required}
          className="w-full bg-[#09090e] border border-[#222233] rounded-xl text-sm text-white outline-none focus:border-[#4ade80] transition-colors appearance-none pl-3.5 pr-10 py-2.5 cursor-pointer"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-[#55556d] pointer-events-none" />
      </div>
    </div>
  );
}

function FormTextarea({ label, value, onChange, placeholder, required = false }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-[#a0a0b0] uppercase tracking-wider">
        {label} {required && <span className="text-[#f43f5e]">*</span>}
      </label>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        rows={3}
        className="w-full bg-[#09090e] border border-[#222233] rounded-xl text-sm text-white placeholder-[#44445a] outline-none focus:border-[#4ade80] transition-colors px-3.5 py-2.5 resize-none"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function Classes() {
  const { classes, eleves, options, loading, error, reload } = useSchoolData({
    keys: ['classe', 'option', 'eleve', 'inscription', 'anneeScolaire'],
  });

  const OPTIONS = useMemo(
    () => ['Toutes', ...options.map((o) => o.designation)],
    [options],
  );

  const [search, setSearch] = useState('');
  const [filterNiveau, setFilterNiveau] = useState('Tous');
  const [filterOption, setFilterOption] = useState('Toutes');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Modals
  const [modalAdd, setModalAdd] = useState(false);
  const [modalEdit, setModalEdit] = useState(null);
  const [modalDelete, setModalDelete] = useState(null);
  const [modalViewList, setModalViewList] = useState(null);

  // Données élèves
  const elevesList = eleves || [];

  // ── Stats par classe ──────────────────────────────────────────────────────
  const statsParClasse = useMemo(() => {
    const stats = {};
    classes.forEach((c) => {
      const elevesClasse = elevesList.filter((e) => e.classe === c.nom);
      const garcons = elevesClasse.filter((e) => e.sexe === 'M').length;
      const filles = elevesClasse.filter((e) => e.sexe === 'F').length;
      const total = elevesClasse.length;
      // Capacité simulée (max 40 élèves)
      const capacite = 40;
      const tauxRemplissage = capacite > 0 ? Math.min(100, Math.round((total / capacite) * 100)) : 0;
      stats[c.id] = { total, garcons, filles, capacite, tauxRemplissage };
    });
    return stats;
  }, [classes, elevesList]);

  // ── Filtres ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let data = [...classes];

    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((c) =>
        c.nom.toLowerCase().includes(q) ||
        c.option.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.niveau.toLowerCase().includes(q)
      );
    }

    if (filterNiveau !== 'Tous') data = data.filter((c) => c.niveau === filterNiveau);
    if (filterOption !== 'Toutes') data = data.filter((c) => c.option === filterOption);

    return data;
  }, [classes, search, filterNiveau, filterOption]);

  // ── Formulaires ─────────────────────────────────────────────────────────────
  const [formAdd, setFormAdd] = useState({
    nom: '', niveau: '7ème', option: 'Pédagogie', description: '', couleur: '#4ade80'
  });
  const [formEdit, setFormEdit] = useState({});

  const handleAddChange = (field, value) => setFormAdd((f) => ({ ...f, [field]: value }));
  const handleEditChange = (field, value) => setFormEdit((f) => ({ ...f, [field]: value }));

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const opt = options.find((o) => o.designation === formAdd.option);
    try {
      await createOne('classe', {
        designation: formAdd.nom,
        optionId: opt?.id ?? options[0]?.id,
      });
      await reload();
      setModalAdd(false);
      setFormAdd({ nom: '', niveau: '7ème', option: options[0]?.designation ?? '', description: '', couleur: '#4ade80' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const opt = options.find((o) => o.designation === formEdit.option);
    try {
      await updateOne('classe', modalEdit.id, {
        designation: formEdit.nom,
        optionId: opt?.id ?? modalEdit.optionId,
      });
      await reload();
      setModalEdit(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteOne('classe', modalDelete.id);
      await reload();
    } catch (err) {
      console.error(err);
    }
    setModalDelete(null);
  };

  const openEdit = (classe) => {
    setFormEdit({ ...classe });
    setModalEdit(classe);
  };

  // ── Couleurs de fond teintées pour les badges niveau ──────────────────────
  const getNiveauBg = (niveau) => {
    const map = {
      '7ème': '#12241c',
      '8ème': '#132c3f',
      '1ère': '#1e1b4b',
      '2ème': '#3c2a16',
      '3ème': '#2e163d',
      '4ème': '#3b1820',
    };
    return map[niveau] || '#1a1a26';
  };

  const getNiveauText = (niveau) => {
    const map = {
      '7ème': '#4ade80',
      '8ème': '#38bdf8',
      '1ère': '#818cf8',
      '2ème': '#fbbf24',
      '3ème': '#c084fc',
      '4ème': '#f43f5e',
    };
    return map[niveau] || '#a0a0b0';
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090e] text-white p-8 pl-12 flex items-center justify-center">
        <p className="text-[#62627a]">Chargement des classes…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#09090e] text-white p-8 pl-12 flex flex-col items-center justify-center gap-4">
        <p className="text-[#f43f5e]">{error.message}</p>
        <button onClick={reload} className="px-4 py-2 rounded-xl bg-[#1b2e1f] text-[#4ade80] text-sm">Réessayer</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090e] text-white p-8 pl-12">

      {/* ════════════════════════════════════════════════════════════════════
          HEADER
      ════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-sans">
            Gestion des classes
          </h1>
          <p className="text-[#62627a] text-sm mt-1">
            <span className="text-white font-semibold">{classes.length}</span> classes au total ·{' '}
            <span className="text-white font-semibold">{elevesList.length}</span> élèves inscrits
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle vue */}
          <div className="flex bg-[#111116] border border-[#222233] rounded-xl p-1 gap-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#1b2e1f] text-[#4ade80]' : 'text-[#55556d] hover:text-[#a0a0b0]'}`}
              title="Grille"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#1b2e1f] text-[#4ade80]' : 'text-[#55556d] hover:text-[#a0a0b0]'}`}
              title="Liste"
            >
              <List size={16} />
            </button>
          </div>

          {/* Bouton Ajouter */}
          <button
            onClick={() => setModalAdd(true)}
                          className="flex items-center gap-2.5 px-6 py-3.5 text-sm  transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background:  '#4ade80',
                color:       '#09090e'
      
              }}
            >
            <Plus size={18} />
            <span>Ajouter une classe</span>
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          BARRE D'OUTILS — Recherche + Filtres
      ════════════════════════════════════════════════════════════════════ */}
      <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-5 mb-6">
        <div className="flex flex-col xl:flex-row xl:items-center gap-4">
          {/* Recherche */}
          <div className="relative flex items-center bg-[#09090e] border border-[#222233] rounded-xl px-3.5 py-2.5 group focus-within:border-[#4ade80] transition-colors flex-1 max-w-md">
            <Search size={18} className="text-[#55556d] group-focus-within:text-[#4ade80] transition-colors" />
            <input
              type="text"
              placeholder="Rechercher une classe, un niveau, une option..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none pl-2.5 text-sm text-white placeholder-[#44445a] w-full"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 text-[#55556d] hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtres */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${showFilters ? 'bg-[#1b2e1f] text-[#4ade80] border-[#1b3d2b]' : 'bg-[#09090e] text-[#a0a0b0] border-[#222233] hover:text-white hover:bg-[#1a1a26]'}`}
          >
            <Filter size={16} />
            Filtres
            {(filterNiveau !== 'Tous' || filterOption !== 'Toutes') && (
              <span className="w-2 h-2 rounded-full bg-[#4ade80]" />
            )}
          </button>

          {/* Stats rapides */}
          <div className="flex items-center gap-4 ml-auto">
            {NIVEAUX.slice(1).map((niv) => {
              const count = classes.filter((c) => c.niveau === niv).length;
              return (
                <div key={niv} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getNiveauText(niv) }} />
                  <span className="text-[11px] text-[#62627a]">{niv} ({count})</span>
                </div>
              );
            })}
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 pt-4 border-t border-[#1b1b26]">
            <FormSelect label="Niveau" value={filterNiveau} onChange={(e) => setFilterNiveau(e.target.value)} options={NIVEAUX} />
            <FormSelect label="Option" value={filterOption} onChange={(e) => setFilterOption(e.target.value)} options={OPTIONS} />
            <div className="flex items-end">
              <button
                onClick={() => { setFilterNiveau('Tous'); setFilterOption('Toutes'); setSearch(''); }}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-[#a0a0b0] hover:text-white bg-[#09090e] border border-[#222233] hover:bg-[#1a1a26] transition-colors"
              >
                Réinitialiser les filtres
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          VUE GRILLE
      ════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((classe) => {
            const stats = statsParClasse[classe.id] || { total: 0, garcons: 0, filles: 0, capacite: 40, tauxRemplissage: 0 };
            const pct = stats.tauxRemplissage;

            return (
              <div
                key={classe.id}
                className="group bg-[#111116] border border-[#1b1b26] rounded-2xl p-5 hover:border-[#2d2d3f] transition-all duration-300 flex flex-col"
              >
                {/* Header carte */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3.5">
                    {/* Badge niveau */}
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-white truncate">{classe.nom}</h3>
                      <p className="text-xs text-[#62627a] mt-0.5">{classe.option}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(classe)}
                      className="p-1.5 rounded-lg bg-[#1e1b4b]/40 border border-[#2e2b6b]/30 text-[#818cf8] hover:bg-[#1e1b4b] hover:text-white transition-all"
                      title="Modifier"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => setModalDelete(classe)}
                      className="p-1.5 rounded-lg bg-[#3b1820]/40 border border-[#441d22]/30 text-[#f43f5e] hover:bg-[#3b1820] hover:text-white transition-all"
                      title="Supprimer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-[#62627a] mb-4 line-clamp-2">{classe.description}</p>

                {/* Stats élèves */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-[#55556d]" />
                    <span className="text-sm font-bold text-white">{stats.total}</span>
                    <span className="text-xs text-[#62627a]">élève{stats.total > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-[#22c55e]">♂ {stats.garcons}</span>
                    <span className="text-[#f9a8d4]">♀ {stats.filles}</span>
                  </div>
                </div>

                {/* Bouton Voir liste */}
                <button
                  onClick={() => setModalViewList(classe)}
                  className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs bg-[#12241c] text-[#4ade80] border border-[#1b3d2b] hover:bg-[#1a3528] hover:text-white transition-all"
                >
                  <GraduationCap size={14} />
                  Voir liste
                </button>

                {/* Progress bar taux de remplissage */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-[#62627a]">Taux de remplissage</span>
                    <span className="text-[10px] font-bold" style={{ color: classe.couleur }}>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#1b1b26] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: classe.couleur }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          VUE LISTE
      ════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'list' && (
        <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#1b1b26]">
                  <th className="px-5 py-4 text-[11px] font-bold text-[#62627a] uppercase tracking-wider">Classe</th>
                  <th className="px-5 py-4 text-[11px] font-bold text-[#62627a] uppercase tracking-wider">Niveau</th>
                  <th className="px-5 py-4 text-[11px] font-bold text-[#62627a] uppercase tracking-wider">Option</th>
                  <th className="px-5 py-4 text-[11px] font-bold text-[#62627a] uppercase tracking-wider">Description</th>
                  <th className="px-5 py-4 text-[11px] font-bold text-[#62627a] uppercase tracking-wider">Élèves</th>
                  <th className="px-5 py-4 text-[11px] font-bold text-[#62627a] uppercase tracking-wider min-w-[140px]">Remplissage</th>
                  <th className="px-5 py-4 text-[11px] font-bold text-[#62627a] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b1b26]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-[#62627a]">
                      <School size={32} className="mx-auto mb-3 text-[#44445a]" />
                      <p className="text-sm">Aucune classe ne correspond à vos critères.</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((classe) => {
                    const stats = statsParClasse[classe.id] || { total: 0, capacite: 40, tauxRemplissage: 0 };
                    const pct = stats.tauxRemplissage;

                    return (
                      <tr key={classe.id} className="group hover:bg-[#16161c] transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                              style={{ backgroundColor: getNiveauBg(classe.niveau), color: getNiveauText(classe.niveau) }}
                            >
                              {classe.niveau.replace('ème', 'è').replace('ère', '1')}
                            </div>
                            <span className="text-sm font-bold text-white">{classe.nom}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-[#a0a0b0]">{classe.niveau}</td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#132c3f] border border-[#1b3d5c] text-[#38bdf8]">
                            <BookOpen size={11} />
                            {classe.option}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-[#62627a] max-w-xs truncate">{classe.description}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Users size={14} className="text-[#55556d]" />
                            <span className="text-sm font-bold text-white">{stats.total}</span>
                            <span className="text-xs text-[#62627a]">/ {stats.capacite}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-[#62627a]">{stats.total} / {stats.capacite}</span>
                              <span className="font-bold" style={{ color: classe.couleur }}>{pct}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-[#1b1b26] overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${pct}%`, backgroundColor: classe.couleur }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setModalViewList(classe)}
                              className="p-2 rounded-lg bg-[#132c3f]/40 border border-[#1b3d5c]/30 text-[#38bdf8] hover:bg-[#132c3f] hover:text-white transition-all"
                              title="Voir liste"
                            >
                              <GraduationCap size={14} />
                            </button>
                            <button
                              onClick={() => openEdit(classe)}
                              className="p-2 rounded-lg bg-[#1e1b4b]/40 border border-[#2e2b6b]/30 text-[#818cf8] hover:bg-[#1e1b4b] hover:text-white transition-all"
                              title="Modifier"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => setModalDelete(classe)}
                              className="p-2 rounded-lg bg-[#3b1820]/40 border border-[#441d22]/30 text-[#f43f5e] hover:bg-[#3b1820] hover:text-white transition-all"
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODAL — AJOUTER UNE CLASSE
      ════════════════════════════════════════════════════════════════════ */}
      <Modal isOpen={modalAdd} onClose={() => setModalAdd(false)} title="Ajouter une classe" maxWidth="max-w-lg">
        <form onSubmit={handleAddSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput label="Nom de la classe" value={formAdd.nom} onChange={(e) => handleAddChange('nom', e.target.value)} placeholder="Ex: 7ème A" required />
            <FormSelect label="Niveau" value={formAdd.niveau} onChange={(e) => handleAddChange('niveau', e.target.value)} options={['7ème', '8ème', '1ère', '2ème', '3ème', '4ème']} required />
            <FormSelect label="Option" value={formAdd.option} onChange={(e) => handleAddChange('option', e.target.value)} options={OPTIONS.slice(1)} required />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#a0a0b0] uppercase tracking-wider">Couleur</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formAdd.couleur}
                  onChange={(e) => handleAddChange('couleur', e.target.value)}
                  className="w-10 h-10 rounded-lg bg-transparent border border-[#222233] cursor-pointer"
                />
                <span className="text-xs text-[#62627a] font-mono">{formAdd.couleur}</span>
              </div>
            </div>
          </div>
          <FormTextarea label="Description" value={formAdd.description} onChange={(e) => handleAddChange('description', e.target.value)} placeholder="Description de la classe..." />
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1b1b26]">
            <button type="button" onClick={() => setModalAdd(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#a0a0b0] hover:text-white hover:bg-[#1a1a26] transition-colors">
              Annuler
            </button>
            <button type="submit" className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-[#4ade80] text-[#09090e] border border-[#1b3d2b] hover:bg-[#1a3528] hover:text-white transition-all">
              <Save size={16} />
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════════
          MODAL — MODIFIER UNE CLASSE
      ════════════════════════════════════════════════════════════════════ */}
      <Modal isOpen={!!modalEdit} onClose={() => setModalEdit(null)} title="Modifier la classe" maxWidth="max-w-lg">
        {modalEdit && (
          <form onSubmit={handleEditSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput label="Nom de la classe" value={formEdit.nom || ''} onChange={(e) => handleEditChange('nom', e.target.value)} required />
              <FormSelect label="Niveau" value={formEdit.niveau || ''} onChange={(e) => handleEditChange('niveau', e.target.value)} options={['7ème', '8ème', '1ère', '2ème', '3ème', '4ème']} required />
              <FormSelect label="Option" value={formEdit.option || ''} onChange={(e) => handleEditChange('option', e.target.value)} options={OPTIONS.slice(1)} required />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#a0a0b0] uppercase tracking-wider">Couleur</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formEdit.couleur || '#4ade80'}
                    onChange={(e) => handleEditChange('couleur', e.target.value)}
                    className="w-10 h-10 rounded-lg bg-transparent border border-[#222233] cursor-pointer"
                  />
                  <span className="text-xs text-[#62627a] font-mono">{formEdit.couleur}</span>
                </div>
              </div>
            </div>
            <FormTextarea label="Description" value={formEdit.description || ''} onChange={(e) => handleEditChange('description', e.target.value)} />
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1b1b26]">
              <button type="button" onClick={() => setModalEdit(null)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#a0a0b0] hover:text-white hover:bg-[#1a1a26] transition-colors">
                Annuler
              </button>
              <button type="submit" className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-[#4ade80] text-[#09090e] border border-[#1b3d2b] hover:bg-[#1a3528] hover:text-white transition-all">
                <Save size={16} />
                Mettre à jour
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ════════════════════════════════════════════════════════════════════
          MODAL — SUPPRIMER
      ════════════════════════════════════════════════════════════════════ */}
      <Modal isOpen={!!modalDelete} onClose={() => setModalDelete(null)} title="Confirmer la suppression" maxWidth="max-w-md">
        {modalDelete && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#3b1820] flex items-center justify-center text-[#f43f5e] shrink-0">
                <AlertCircle size={26} />
              </div>
              <div>
                <p className="text-sm text-[#a0a0b0]">
                  Vous êtes sur le point de supprimer la classe :
                </p>
                <p className="text-lg font-bold text-white mt-1">{modalDelete.nom}</p>
                <p className="text-xs text-[#62627a] mt-0.5">{modalDelete.description}</p>
              </div>
            </div>
            <div className="bg-[#3b1820]/30 border border-[#441d22]/40 rounded-xl p-4">
              <p className="text-xs text-[#f43f5e] font-medium">
                Cette action est irréversible. Les élèves associés ne seront pas supprimés, mais perdront leur affectation de classe.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setModalDelete(null)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#a0a0b0] hover:text-white hover:bg-[#1a1a26] transition-colors">
                Annuler
              </button>
              <button onClick={handleDelete} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-[#3b1820] text-[#f43f5e] border border-[#441d22] hover:bg-[#4a2028] hover:text-white transition-all">
                <Trash2 size={16} />
                Supprimer définitivement
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ════════════════════════════════════════════════════════════════════
          MODAL — VOIR LISTE DES ÉLÈVES (par classe)
      ════════════════════════════════════════════════════════════════════ */}
      <Modal isOpen={!!modalViewList} onClose={() => setModalViewList(null)} title={modalViewList ? `Élèves — ${modalViewList.nom}` : ''} maxWidth="max-w-3xl">
        {modalViewList && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: getNiveauBg(modalViewList.niveau), color: getNiveauText(modalViewList.niveau) }}
              >
                {modalViewList.niveau.replace('ème', 'è').replace('ère', '1')}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{modalViewList.nom}</p>
                <p className="text-xs text-[#62627a]">{modalViewList.option} · {modalViewList.description}</p>
              </div>
            </div>

            {(() => {
              const elevesClasse = elevesList.filter((e) => e.classe === modalViewList.nom);
              if (elevesClasse.length === 0) {
                return (
                  <div className="text-center py-10">
                    <Users size={32} className="mx-auto mb-3 text-[#44445a]" />
                    <p className="text-sm text-[#62627a]">Aucun élève inscrit dans cette classe.</p>
                  </div>
                );
              }
              return (
                <div className="bg-[#09090e] border border-[#1b1b26] rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[#1b1b26]">
                        <th className="px-4 py-3 text-[10px] font-bold text-[#62627a] uppercase">Photo</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-[#62627a] uppercase">Nom complet</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-[#62627a] uppercase">Sexe</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-[#62627a] uppercase">Date naissance</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-[#62627a] uppercase">Option</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1b1b26]">
                      {elevesClasse.map((eleve) => (
                        <tr key={eleve.id} className="hover:bg-[#16161c] transition-colors">
                          <td className="px-4 py-3">
                            <img
                              src={elevePhotoUrl(eleve.photo) || `https://ui-avatars.com/api/?name=${eleve.nom}+${eleve.prenom}&background=1a1a26&color=fff`}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover ring-2 ring-[#222233]"
                              onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${eleve.nom}+${eleve.prenom}&background=1a1a26&color=fff`; }}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-white">{eleve.nom} {eleve.postnom} {eleve.prenom}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${eleve.sexe === 'M' ? 'bg-[#12241c] text-[#4ade80] border border-[#1b3d2b]' : 'bg-[#2e163d] text-[#c084fc] border border-[#3d2050]'}`}>
                              {eleve.sexe === 'M' ? '♂' : '♀'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-[#a0a0b0]">{new Date(eleve.dateNaissance).toLocaleDateString('fr-FR')}</td>
                          <td className="px-4 py-3">
                            <span className="text-[11px] font-semibold text-[#38bdf8] bg-[#132c3f] border border-[#1b3d5c] px-2 py-0.5 rounded-lg">
                              {eleve.option}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}
      </Modal>
    </div>
  );
}
