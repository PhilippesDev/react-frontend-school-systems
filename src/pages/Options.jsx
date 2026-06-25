import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  X,
  Users,
  BookOpen,
  Save,
  AlertCircle,
  ChevronRight,
  School,
  Filter,
  LayoutGrid,
  List
} from 'lucide-react';
import { useSchoolData } from '../hooks/useSchoolData';
import { createOne, updateOne, deleteOne } from '../lib/api';

// ─────────────────────────────────────────────────────────────────────────────
//  DONNÉES & CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
//  COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function Options() {
  const { options, eleves: elevesList, loading, error, reload } = useSchoolData({
    keys: ['option', 'classe', 'eleve', 'inscription', 'anneeScolaire'],
  });

  const [search, setSearch] = useState('');
  const [filterOption, setFilterOption] = useState('Toutes');
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [modalAdd, setModalAdd] = useState(false);
  const [modalEdit, setModalEdit] = useState(null);
  const [modalDelete, setModalDelete] = useState(null);
  const [modalViewClasses, setModalViewClasses] = useState(null);

  // Données élèves
  const eleves = elevesList || [];

  // ── Stats par option ────────────────────────────────────────────────────────
  const statsParOption = useMemo(() => {
    const stats = {};
    options.forEach((opt) => {
      const elevesOption = eleves.filter((e) => e.option === opt.designation || e.option === opt.code);
      // Fallback : si aucun match exact, chercher par classes associées
      const elevesParClasse = opt.classes.length > 0
        ? eleves.filter((e) => opt.classes.includes(e.classe))
        : [];
      const total = elevesOption.length > 0 ? elevesOption.length : elevesParClasse.length;
      stats[opt.id] = { total };
    });
    return stats;
  }, [options, eleves]);

  // ── Filtres ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let data = [...options];

    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((o) =>
        o.code.toLowerCase().includes(q) ||
        o.designation.toLowerCase().includes(q) ||
        o.classes.some((c) => c.toLowerCase().includes(q))
      );
    }

    if (filterOption !== 'Toutes') {
      data = data.filter((o) => o.designation === filterOption || o.code === filterOption);
    }

    return data;
  }, [options, search, filterOption]);

  // ── Formulaires ─────────────────────────────────────────────────────────────
  const [formAdd, setFormAdd] = useState({
    code: '', designation: '', classes: '', couleur: '#4ade80'
  });
  const [formEdit, setFormEdit] = useState({});

  const handleAddChange = (field, value) => setFormAdd((f) => ({ ...f, [field]: value }));
  const handleEditChange = (field, value) => setFormEdit((f) => ({ ...f, [field]: value }));

  const parseClasses = (str) => str.split(',').map((s) => s.trim()).filter(Boolean);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await createOne('option', {
        designation: formAdd.designation,
        abreviation: formAdd.code.toUpperCase(),
      });
      await reload();
      setModalAdd(false);
      setFormAdd({ code: '', designation: '', classes: '', couleur: '#4ade80' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateOne('option', modalEdit.id, {
        designation: formEdit.designation,
        abreviation: formEdit.code?.toUpperCase() ?? formEdit.abreviation,
      });
      await reload();
      setModalEdit(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteOne('option', modalDelete.id);
      await reload();
    } catch (err) {
      console.error(err);
    }
    setModalDelete(null);
  };

  const openEdit = (opt) => {
    setFormEdit({ ...opt, classes: opt.classes.join(', ') });
    setModalEdit(opt);
  };

  // ── Couleurs de fond teintées pour les badges code ────────────────────────
  const getCodeBadgeStyle = (color) => ({
    color: color,
  });

  // ── Rendu ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090e] text-white p-8 pl-12 flex items-center justify-center">
        <p className="text-[#62627a]">Chargement des options…</p>
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
            Gestion des options
          </h1>
          <p className="text-[#62627a] text-sm mt-1">
            <span className="text-white font-semibold">{options.length}</span> options au total ·{' '}
            <span className="text-white font-semibold">{eleves.length}</span> élèves inscrits
          </p>
        </div>

        <button
          onClick={() => setModalAdd(true)}
                                     className="flex items-center gap-2.5 px-6 py-3.5 text-sm  transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background:  '#4ade80',
                color:       '#09090e'
      
              }}
        >
          <Plus size={18} />
          <span>Ajouter une option</span>
        </button>
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
              placeholder="Rechercher une option, un code, une classe..."
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
            {filterOption !== 'Toutes' && (
              <span className="w-2 h-2 rounded-full bg-[#4ade80]" />
            )}
          </button>

          {/* Stats rapides */}
          <div className="flex items-center gap-4 ml-auto">
            <span className="text-[11px] text-[#62627a]">
              Options actives : <span className="text-white font-semibold">{options.filter((o) => (statsParOption[o.id]?.total || 0) > 0).length}</span>
            </span>
            <span className="text-[11px] text-[#62627a]">
              Vides : <span className="text-white font-semibold">{options.filter((o) => (statsParOption[o.id]?.total || 0) === 0).length}</span>
            </span>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 pt-4 border-t border-[#1b1b26]">
            <FormSelect
              label="Option"
              value={filterOption}
              onChange={(e) => setFilterOption(e.target.value)}
              options={['Toutes', ...options.map((o) => o.designation)]}
            />
            <div className="flex items-end">
              <button
                onClick={() => { setFilterOption('Toutes'); setSearch(''); }}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-[#a0a0b0] hover:text-white bg-[#09090e] border border-[#222233] hover:bg-[#1a1a26] transition-colors"
              >
                Réinitialiser les filtres
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          TABLEAU DES OPTIONS (Vue Liste uniquement)
      ════════════════════════════════════════════════════════════════════ */}
      <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#1b1b26]">
                <th className="px-5 py-4 text-[11px] font-bold text-[#62627a] uppercase tracking-wider">Code</th>
                <th className="px-5 py-4 text-[11px] font-bold text-[#62627a] uppercase tracking-wider">Désignation</th>
                <th className="px-5 py-4 text-[11px] font-bold text-[#62627a] uppercase tracking-wider">Élèves inscrits</th>
                <th className="px-5 py-4 text-[11px] font-bold text-[#62627a] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b1b26]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-[#62627a]">
                    <BookOpen size={32} className="mx-auto mb-3 text-[#44445a]" />
                    <p className="text-sm">Aucune option ne correspond à vos critères.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((opt) => {
                  const stats = statsParOption[opt.id] || { total: 0 };
                  const total = stats.total;

                  return (
                    <tr key={opt.id} className="group hover:bg-[#16161c] transition-colors">
                      {/* Code */}
                      <td className="px-5 py-4">
                        <span
                          className="inline-flex items-center justify-center text-[11px] font-bold px-3 py-1.5 rounded-lg"
                          style={getCodeBadgeStyle(opt.couleur)}
                        >
                          {opt.code}
                        </span>
                      </td>

                      {/* Désignation */}
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-white">{opt.designation}</span>
                      </td>

                      {/* Élèves inscrits */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-[#55556d]" />
                          <span className="text-sm font-bold text-white">{total}</span>
                          <span className="text-xs text-[#62627a]">élève{total > 1 ? 's' : total === 0 ? '' : ''}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setModalViewClasses(opt)}
                            className="flex items-center gap-1.5 px-3.5 py-2  text-xs  bg-[#4ade80] text-[#0f0f1a] border border-[#1b3d2b] hover:bg-[#1a3528] hover:text-white transition-all"
                          >
                            <School size={13} />
                            Voir classes
                          </button>
                          <button
                            onClick={() => openEdit(opt)}
                            className="p-2 rounded-lg bg-[#1e1b4b]/40 border border-[#2e2b6b]/30 text-[#818cf8] hover:bg-[#1e1b4b] hover:text-white transition-all"
                            title="Modifier"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => setModalDelete(opt)}
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

        {/* Footer tableau */}
        <div className="px-5 py-3 border-t border-[#1b1b26] flex items-center justify-between">
          <span className="text-xs text-[#62627a]">
            Affichage de <span className="text-white font-semibold">{filtered.length}</span> sur <span className="text-white font-semibold">{options.length}</span> options
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#44445a]">Total élèves :</span>
            <span className="text-[11px] font-bold text-white">{eleves.length}</span>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          MODAL — AJOUTER UNE OPTION
      ════════════════════════════════════════════════════════════════════ */}
      <Modal isOpen={modalAdd} onClose={() => setModalAdd(false)} title="Ajouter une option" maxWidth="max-w-lg">
        <form onSubmit={handleAddSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput label="Code" value={formAdd.code} onChange={(e) => handleAddChange('code', e.target.value)} placeholder="Ex: BIO" required />
            <FormInput label="Désignation" value={formAdd.designation} onChange={(e) => handleAddChange('designation', e.target.value)} placeholder="Ex: Sciences Biologiques" required />
            <div className="md:col-span-2">
              <FormInput label="Classes associées" value={formAdd.classes} onChange={(e) => handleAddChange('classes', e.target.value)} placeholder="Ex: 1ère C, 2ème A (séparées par des virgules)" />
            </div>
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
          MODAL — MODIFIER UNE OPTION
      ════════════════════════════════════════════════════════════════════ */}
      <Modal isOpen={!!modalEdit} onClose={() => setModalEdit(null)} title="Modifier l'option" maxWidth="max-w-lg">
        {modalEdit && (
          <form onSubmit={handleEditSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput label="Code" value={formEdit.code || ''} onChange={(e) => handleEditChange('code', e.target.value)} required />
              <FormInput label="Désignation" value={formEdit.designation || ''} onChange={(e) => handleEditChange('designation', e.target.value)} required />
              <div className="md:col-span-2">
                <FormInput label="Classes associées" value={typeof formEdit.classes === 'string' ? formEdit.classes : formEdit.classes?.join(', ')} onChange={(e) => handleEditChange('classes', e.target.value)} placeholder="Ex: 1ère C, 2ème A (séparées par des virgules)" />
              </div>
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
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1b1b26]">
              <button type="button" onClick={() => setModalEdit(null)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#a0a0b0] hover:text-white hover:bg-[#1a1a26] transition-colors">
                Annuler
              </button>
              <button type="submit" className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-[#1e1b4b] text-[#818cf8] border border-[#2e2b6b] hover:bg-[#2e2b6b] hover:text-white transition-all">
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
                  Vous êtes sur le point de supprimer l'option :
                </p>
                <p className="text-lg font-bold text-white mt-1">{modalDelete.designation}</p>
                <p className="text-xs text-[#62627a] mt-0.5">Code : {modalDelete.code}</p>
              </div>
            </div>
            <div className="bg-[#3b1820]/30 border border-[#441d22]/40 rounded-xl p-4">
              <p className="text-xs text-[#f43f5e] font-medium">
                Cette action est irréversible. Les classes associées ne seront pas supprimées, mais perdront leur lien avec cette option.
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
          MODAL — VOIR CLASSES (par option)
      ════════════════════════════════════════════════════════════════════ */}
      <Modal isOpen={!!modalViewClasses} onClose={() => setModalViewClasses(null)} title={modalViewClasses ? `Classes — ${modalViewClasses.designation}` : ''} maxWidth="max-w-2xl">
        {modalViewClasses && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <span
                className="inline-flex items-center justify-center text-[11px] font-bold px-3 py-1.5 rounded-lg"
                style={getCodeBadgeStyle(modalViewClasses.couleur)}
              >
                {modalViewClasses.code}
              </span>
              <div>
                <p className="text-sm font-bold text-white">{modalViewClasses.designation}</p>
                <p className="text-xs text-[#62627a]">{modalViewClasses.classes.length} classe{modalViewClasses.classes.length > 1 ? 's' : ''} associée{modalViewClasses.classes.length > 1 ? 's' : ''}</p>
              </div>
            </div>

            {modalViewClasses.classes.length === 0 ? (
              <div className="text-center py-10">
                <School size={32} className="mx-auto mb-3 text-[#44445a]" />
                <p className="text-sm text-[#62627a]">Aucune classe associée à cette option.</p>
              </div>
            ) : (
              <div className="bg-[#09090e] border border-[#1b1b26] rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#1b1b26]">
                      <th className="px-4 py-3 text-[10px] font-bold text-[#62627a] uppercase">Classe</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-[#62627a] uppercase">Élèves</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-[#62627a] uppercase">Remplissage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1b1b26]">
                    {modalViewClasses.classes.map((cl) => {
                      const elevesClasse = eleves.filter((e) => e.classe === cl);
                      const total = elevesClasse.length;
                      const capacite = 40;
                      const pct = Math.min(100, Math.round((total / capacite) * 100));
                      return (
                        <tr key={cl} className="hover:bg-[#16161c] transition-colors">
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#1e1b4b] border border-[#2e2b6b] px-2.5 py-1 rounded-lg">
                              <School size={11} className="text-[#818cf8]" />
                              {cl}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-white font-medium">{total} élève{total > 1 ? 's' : ''}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 rounded-full bg-[#1b1b26] overflow-hidden flex-1 max-w-[120px]">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${pct}%`, backgroundColor: modalViewClasses.couleur }}
                                />
                              </div>
                              <span className="text-[10px] text-[#62627a] font-mono">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
