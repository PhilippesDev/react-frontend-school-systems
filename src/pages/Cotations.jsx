// ═══════════════════════════════════════════════════════════════════════════════
//  Cotations.jsx — Module complet de cotation des élèves
//  Onglets : Saisie | Tableau classe | Fiche individuelle | Bulletins
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Search, X, ChevronDown, Save, Trash2, CheckCircle2,
  AlertCircle, ClipboardCheck, Table2, User, FileText, Printer,
  FileSpreadsheet, Download, ArrowUpDown, Keyboard, Plus, Eye,
  GraduationCap, Award,
} from 'lucide-react';

import { useSchoolData } from '../hooks/useSchoolData';
import { elevePhotoUrl } from '../lib/elevePhoto';
import { ETABLISSEMENT } from '../lib/schoolConfig';
import {
  fullName, getActiveAnnee, getClasseByNom, getElevesByClasse,
  getCoursClasseForClasse, enrichCoursClasse, validateCote, findCotation,
  saveCotation, removeCotation, getMaxCote,
  nextCotationId, buildClassTableRows, buildEleveResults, computeRankings,
  computeSemesterMoyenne, computeAnnualMoyenne, formatPourcentage,
  BULLETIN_TYPES,
} from '../lib/cotationsUtils';

// ─────────────────────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────


const AVT_BG   = ['#132c3f','#2e163d','#1e1b4b','#3c2a16','#103024','#3b1820'];
const AVT_TEXT = ['#38bdf8','#c084fc','#818cf8','#fbbf24','#4ade80','#f43f5e'];

const MAIN_TABS = [
  { id: 'saisie',    label: 'Saisie',           icon: ClipboardCheck },
  { id: 'tableau',   label: 'Tableau classe',   icon: Table2 },
  { id: 'fiche',     label: 'Fiche individuelle', icon: User },
  { id: 'bulletins', label: 'Bulletins',        icon: FileText },
];

const SORT_OPTIONS = [
  { value: 'nom_asc',  label: 'Nom (A → Z)' },
  { value: 'nom_desc', label: 'Nom (Z → A)' },
  { value: 'moy_desc', label: 'Moyenne ↓' },
  { value: 'moy_asc',  label: 'Moyenne ↑' },
  { value: 'rang_asc', label: 'Rang ↑' },
];

// ─────────────────────────────────────────────────────────────────────────────
//  SHARED UI
// ─────────────────────────────────────────────────────────────────────────────

const Overlay = ({ onClose, children }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ backgroundColor: 'rgba(9,9,14,0.88)', backdropFilter: 'blur(6px)' }}
  >
    <div className="absolute inset-0" onClick={onClose} />
    <div className="relative z-10 w-full flex items-center justify-center">{children}</div>
  </div>
);

const Avatar = ({ eleve, size = 'md' }) => {
  const [err, setErr] = useState(false);
  const cls = { sm: 'w-8 h-8 text-[10px]', md: 'w-10 h-10 text-sm', lg: 'w-16 h-16 text-xl' }[size];

  const photoUrl = elevePhotoUrl(eleve.photo);

  if (!err && photoUrl) {
    return (
      <img src={photoUrl} alt="" onError={() => setErr(true)}
        className={`${cls} rounded-full object-cover ring-2 ring-[#222233] shrink-0`} />
    );
  }
  return (
    <div
      className={`${cls} rounded-full flex items-center justify-center font-bold ring-2 ring-[#222233] shrink-0`}
      style={{ backgroundColor: AVT_BG[(eleve.id - 1) % AVT_BG.length], color: AVT_TEXT[(eleve.id - 1) % AVT_TEXT.length] }}
    >
      {eleve.nom[0]}{eleve.prenom[0]}
    </div>
  );
};

const Field = ({ label, required, error, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-bold uppercase tracking-widest text-[#44445a]">
      {label}{required && <span className="text-[#f43f5e] ml-0.5">*</span>}
    </label>
    {children}
    {error && <p className="text-[#f43f5e] text-[10px]">{error}</p>}
  </div>
);

const SelInput = ({ value, onChange, options, placeholder }) => (
  <div className="relative">
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#09090e] border border-[#222233] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#4ade80] transition-colors appearance-none cursor-pointer">
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value;
        const l = typeof o === 'string' ? o : o.label;
        return <option key={v} value={v}>{l}</option>;
      })}
    </select>
    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#44445a] pointer-events-none" />
  </div>
);

const Toast = ({ toast }) => {
  if (!toast) return null;
  const isErr = toast.type === 'error';
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl"
      style={{ backgroundColor: isErr ? '#1e0a0b' : '#0d1f15', borderColor: isErr ? '#441d22' : '#1b3d2b' }}>
      {isErr
        ? <AlertCircle size={16} className="text-[#f43f5e] shrink-0" />
        : <CheckCircle2 size={16} className="text-[#4ade80] shrink-0" />}
      <span className="text-sm font-medium text-white">{toast.msg}</span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  MODAL SAISIE / MODIFICATION / SUPPRESSION
// ─────────────────────────────────────────────────────────────────────────────

const CotationModal = ({
  eleve, coursList, periodes, semestres, cotations, anneeId,
  onClose, onSave, onDelete, notify,
}) => {
  const [coursClasseId, setCoursClasseId] = useState('');
  const [semestreId, setSemestreId] = useState('1');
  const [periodeId, setPeriodeId] = useState('');
  const [valeur, setValeur] = useState('');
  const [error, setError] = useState('');

  const selectedCours = coursList.find((c) => String(c.id) === coursClasseId);
  const max = selectedCours && periodeId
    ? getMaxCote(selectedCours, Number(periodeId))
    : selectedCours?.max ?? 100;

  const periodesFiltered = useMemo(
    () => periodes.filter((p) => String(p.semestreId) === semestreId),
    [periodes, semestreId],
  );

  const existing = useMemo(() => {
    if (!coursClasseId || !periodeId) return null;
    return findCotation(cotations, eleve.id, Number(coursClasseId), Number(periodeId));
  }, [cotations, eleve.id, coursClasseId, periodeId]);

  useEffect(() => {
    if (existing) setValeur(String(existing.valeur));
    else setValeur('');
    setError('');
  }, [existing, coursClasseId, periodeId]);

  const handleValidate = () => {
    const result = validateCote(valeur, max);
    if (!result.valid) { setError(result.error); return; }
    if (!coursClasseId || !periodeId) { setError('Sélectionnez le cours et la période'); return; }

    onSave({
      id: existing?.id,
      eleveId: eleve.id,
      coursClasseId: Number(coursClasseId),
      periodeId: Number(periodeId),
      semestreId: Number(semestreId),
      anneeScolaireId: anneeId,
      valeur: result.value,
      dateSaisie: new Date().toISOString().slice(0, 10),
    });
    notify(existing ? 'Cote modifiée' : 'Cote enregistrée');
    setValeur('');
    setError('');
  };

  const handleValeurChange = (v) => {
    setValeur(v);
    if (v !== '') {
      const r = validateCote(v, max);
      setError(r.valid ? '' : r.error);
    } else {
      setError('');
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[#1b1b26]">
          <div className="flex items-center gap-3">
            <Avatar eleve={eleve} />
            <div>
              <h2 className="text-white font-bold">{fullName(eleve)}</h2>
              <p className="text-[#62627a] text-xs">{eleve.classe}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#1a1a26] text-[#55556d] hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <Field label="Semestre" required>
            <SelInput value={semestreId} onChange={(v) => { setSemestreId(v); setPeriodeId(''); }}
              options={semestres.map((s) => ({ value: String(s.id), label: s.designation }))} />
          </Field>

          <Field label="Période" required>
            <SelInput value={periodeId} onChange={setPeriodeId} placeholder="Choisir la période..."
              options={periodesFiltered.map((p) => ({
                value: String(p.id),
                label: `${p.designation} (coef. ${p.coefficient})`,
              }))} />
          </Field>

          <Field label="Cours" required>
            <SelInput value={coursClasseId} onChange={setCoursClasseId} placeholder="Choisir le cours..."
              options={coursList.map((c) => {
                const m = periodeId ? getMaxCote(c, Number(periodeId)) : c.max;
                return { value: String(c.id), label: `${c.coursDesignation} (max ${m})` };
              })} />
          </Field>

          <Field label={`Cote / ${max}`} required error={error}>
            <input
              type="number" min={0} max={max} step={0.5} value={valeur}
              onChange={(e) => handleValeurChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleValidate(); }}
              autoFocus
              className={`bg-[#09090e] border rounded-xl px-3.5 py-2.5 text-sm text-white w-full focus:outline-none transition-colors ${
                error ? 'border-[#f43f5e]' : 'border-[#222233] focus:border-[#4ade80]'
              }`}
              placeholder={`0 – ${max}`}
            />
          </Field>

          {existing && (
            <p className="text-[#62627a] text-xs">
              Cote existante : <span className="text-[#4ade80] font-bold">{existing.valeur}/{max}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 p-6 border-t border-[#1b1b26]">
          {existing && (
            <button onClick={() => { onDelete(existing.id); notify('Cote supprimée'); onClose(); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#441d22] text-[#f43f5e] hover:bg-[#291415] text-sm font-medium transition-colors">
              <Trash2 size={14} /> Supprimer
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#222233] text-[#a0a0b0] hover:text-white text-sm transition-colors">
            Annuler
          </button>
          <button onClick={handleValidate}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#4ade80] text-[#0a0a0e]  text-sm hover:bg-[#22c55e] transition-colors">
            <CheckCircle2 size={14} /> Valider
          </button>
        </div>
      </div>
    </Overlay>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  ONGLET SAISIE
// ─────────────────────────────────────────────────────────────────────────────

const SaisieTab = ({
  classe, setClasse, classOptions, eleves, coursList, cotations, pending, setPending,
  dirty, onSaveAll, onOpenModal, quickMode, setQuickMode,
  semestreId, setSemestreId, periodeId, setPeriodeId, periodes, semestres,
  onQuickChange, anneeId,
}) => {
  const [search, setSearch] = useState('');
  const gridRef = useRef(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return eleves;
    const q = search.toLowerCase();
    return eleves.filter((e) => fullName(e).toLowerCase().includes(q));
  }, [eleves, search]);

  const periodesFiltered = periodes.filter((p) => String(p.semestreId) === String(semestreId));

  const getCellValue = (eleveId, ccId) => {
    const key = `${eleveId}_${ccId}_${periodeId}`;
    if (pending[key] !== undefined) return pending[key];
    const c = findCotation(cotations, eleveId, ccId, Number(periodeId));
    return c?.valeur ?? '';
  };

  const handleKeyNav = (e, eleveIdx, coursIdx) => {
    const rows = filtered.length;
    const cols = coursList.length;
    let ni = eleveIdx;
    let nj = coursIdx;

    if (e.key === 'ArrowDown') { e.preventDefault(); ni = Math.min(rows - 1, eleveIdx + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); ni = Math.max(0, eleveIdx - 1); }
    else if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) { e.preventDefault(); nj = Math.min(cols - 1, coursIdx + 1); }
    else if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) { e.preventDefault(); nj = Math.max(0, coursIdx - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); ni = Math.min(rows - 1, eleveIdx + 1); }
    else return;

    const next = gridRef.current?.querySelector(`[data-row="${ni}"][data-col="${nj}"]`);
    next?.focus();
  };

  return (
    <div className="space-y-4">
      {/* Barre de contrôle */}
      <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Field label="Classe">
            <SelInput value={classe} onChange={setClasse} placeholder="Choisir..."
              options={(classOptions ?? []).map((c) => ({ value: c, label: c }))} />
          </Field>
          <Field label="Semestre">
            <SelInput value={String(semestreId)} onChange={setSemestreId}
              options={semestres.map((s) => ({ value: String(s.id), label: s.designation }))} />
          </Field>
          {quickMode && (
            <Field label="Période (saisie rapide)">
              <SelInput value={String(periodeId)} onChange={setPeriodeId} placeholder="Période..."
                options={periodesFiltered.map((p) => ({ value: String(p.id), label: p.designation }))} />
            </Field>
          )}
          <div className="flex items-end gap-2">
            <button onClick={() => setQuickMode(!quickMode)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                quickMode ? 'border-[#4ade80] text-[#4ade80] bg-[#0d1f15]' : 'border-[#222233] text-[#a0a0b0] hover:text-white'
              }`}>
              <Keyboard size={14} /> {quickMode ? 'Mode popup' : 'Saisie rapide'}
            </button>
            {dirty && (
              <button onClick={onSaveAll}
                className="flex items-center gap-2 px-4 py-2.5  bg-[#4ade80] text-[#0a0a0e] text-sm hover:bg-[#22c55e]">
                <Save size={14} /> Enregistrer ({Object.keys(pending).length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#44445a]" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un élève..."
          className="w-full bg-[#111116] border border-[#1b1b26] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#44445a] focus:outline-none focus:border-[#4ade80]" />
      </div>

      {!classe ? (
        <div className="text-center py-16 text-[#44445a]">
          <ClipboardCheck size={40} className="mx-auto mb-3 opacity-30" />
          <p>Sélectionnez une classe pour commencer la saisie</p>
        </div>
      ) : quickMode && periodeId ? (
        /* ── Grille saisie rapide ── */
        <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1b1b26] flex items-center gap-2">
            <Keyboard size={14} className="text-[#4ade80]" />
            <span className="text-white text-sm font-medium">Saisie rapide</span>
            <span className="text-[#44445a] text-xs">— Tab/Flèches pour naviguer, Entrée pour descendre</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1b1b26]">
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#44445a] sticky left-0 bg-[#111116] z-10 min-w-[180px]">Élève</th>
                  {coursList.map((c) => (
                    <th key={c.id} className="px-2 py-3 text-[10px] font-bold uppercase tracking-widest text-[#44445a] text-center min-w-[70px]">
                      {c.coursAbrev}<br /><span className="text-[#33334a]">/{periodeId ? getMaxCote(c, Number(periodeId)) : c.max}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody ref={gridRef}>
                {filtered.map((eleve, ri) => (
                  <tr key={eleve.id} className="border-b border-[#1b1b26] hover:bg-[#0d0d12]">
                    <td className="px-4 py-2 sticky left-0 bg-[#111116] z-10">
                      <div className="flex items-center gap-2">
                        <Avatar eleve={eleve} size="sm" />
                        <span className="text-white text-xs font-medium truncate">{eleve.nom} {eleve.prenom}</span>
                      </div>
                    </td>
                    {coursList.map((c, ci) => {
                      const cellMax = getMaxCote(c, Number(periodeId));
                      const val = getCellValue(eleve.id, c.id);
                      const r = val !== '' ? validateCote(val, cellMax) : { valid: true };
                      return (
                        <td key={c.id} className="px-1 py-1">
                          <input
                            type="number" min={0} max={cellMax} step={0.5}
                            data-row={ri} data-col={ci}
                            value={val}
                            onChange={(e) => onQuickChange(eleve.id, c.id, e.target.value, cellMax)}
                            onKeyDown={(e) => handleKeyNav(e, ri, ci)}
                            className={`w-full bg-[#09090e] border rounded-lg px-2 py-1.5 text-xs text-center text-white focus:outline-none ${
                              !r.valid ? 'border-[#f43f5e]' : 'border-[#222233] focus:border-[#4ade80]'
                            }`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── Liste élèves (mode popup) ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((eleve) => {
            const nbCotes = cotations.filter((c) => c.eleveId === eleve.id).length;
            return (
              <button key={eleve.id} onClick={() => onOpenModal(eleve)}
                className="flex items-center gap-3 bg-[#111116] border border-[#1b1b26] rounded-2xl p-4 hover:border-[#4ade80]/40 hover:bg-[#0d0d12] transition-all text-left group">
                <Avatar eleve={eleve} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{eleve.nom} {eleve.prenom}</p>
                  <p className="text-[#44445a] text-xs">{nbCotes} cote(s)</p>
                </div>
                <Plus size={16} className="text-[#44445a] group-hover:text-[#4ade80] shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  ONGLET TABLEAU CLASSE
// ─────────────────────────────────────────────────────────────────────────────

const TableauTab = ({ classe, setClasse, classOptions, tableRows, periodes, semestreId, setSemestreId, semestres, anneeLabel }) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('nom_asc');
  const [showExport, setShowExport] = useState(false);
  const [filterMin, setFilterMin] = useState('');

  const periodesCols = semestreId
    ? periodes.filter((p) => p.semestreId === Number(semestreId))
    : periodes;

  const filtered = useMemo(() => {
    let rows = [...tableRows];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => fullName(r.eleve).toLowerCase().includes(q));
    }
    if (filterMin !== '') {
      const min = Number(filterMin);
      rows = rows.filter((r) => r.moyenneGenerale != null && r.moyenneGenerale >= min);
    }
    rows.sort((a, b) => {
      switch (sortBy) {
        case 'nom_desc': return fullName(b.eleve).localeCompare(fullName(a.eleve));
        case 'moy_desc': return (b.moyenneGenerale ?? -1) - (a.moyenneGenerale ?? -1);
        case 'moy_asc':  return (a.moyenneGenerale ?? 999) - (b.moyenneGenerale ?? 999);
        case 'rang_asc': return (a.rang ?? 999) - (b.rang ?? 999);
        default:         return fullName(a.eleve).localeCompare(fullName(b.eleve));
      }
    });
    return rows;
  }, [tableRows, search, sortBy, filterMin]);

  const exportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const data = filtered.map((r) => {
        const row = { Élève: fullName(r.eleve), Classe: r.eleve.classe };
        r.periodAvgs.forEach((p) => { row[p.label] = formatPourcentage(p.moyenne); });
        row['Total semestre'] = formatPourcentage(r.totalSemestre);
        row['Moyenne générale'] = formatPourcentage(r.moyenneGenerale);
        row.Rang = r.rang ?? '—';
        return row;
      });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Cotations');
      XLSX.writeFile(wb, `cotations_${classe}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch {
      alert('Erreur export Excel');
    }
  };

  const exportPrint = (title) => {
    const html = `<html><head><title>${title}</title><style>
      body{font-family:Arial,sans-serif;font-size:10px;margin:20px;color:#111}
      h1{font-size:16px;margin-bottom:4px} .sub{color:#666;margin-bottom:12px}
      table{width:100%;border-collapse:collapse}
      th{background:#0f0f14;color:#fff;padding:6px 8px;text-align:center;font-size:9px}
      td{padding:5px 8px;border-bottom:1px solid #eee;text-align:center}
      td:first-child{text-align:left} tr:nth-child(even) td{background:#f9f9f9}
      .total{font-weight:bold;background:#eef}
    </style></head><body>
    <h1>${title}</h1>
    <p class="sub">${classe} · ${anneeLabel} · ${new Date().toLocaleDateString('fr-FR')}</p>
    <table><thead><tr>
      <th>Élève</th>
      ${periodesCols.map((p) => `<th>${p.designation}</th>`).join('')}
      <th>Total sem.</th><th>Moyenne</th><th>Rang</th>
    </tr></thead><tbody>
    ${filtered.map((r) => `<tr>
      <td>${fullName(r.eleve)}</td>
      ${r.periodAvgs.map((p) => `<td>${formatPourcentage(p.moyenne)}</td>`).join('')}
      <td class="total">${formatPourcentage(r.totalSemestre ?? r.moyenneGenerale)}</td>
      <td class="total">${formatPourcentage(r.moyenneGenerale)}</td>
      <td>${r.rang ?? '—'}</td>
    </tr>`).join('')}
    </tbody></table></body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <Field label="Classe">
            <SelInput value={classe} onChange={setClasse} placeholder="Choisir..."
              options={(classOptions ?? []).map((c) => ({ value: c, label: c }))} />
          </Field>
          <Field label="Semestre">
            <SelInput value={semestreId ? String(semestreId) : ''} onChange={(v) => setSemestreId(v ? Number(v) : null)}
              placeholder="Année complète"
              options={[{ value: '', label: 'Année complète' }, ...semestres.map((s) => ({ value: String(s.id), label: s.designation }))]} />
          </Field>
          <Field label="Tri">
            <SelInput value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
          </Field>
          <Field label="Moyenne min. (%)">
            <input type="number" min={0} max={100} step={1} value={filterMin} onChange={(e) => setFilterMin(e.target.value)}
              placeholder="Filtrer..."
              className="w-full bg-[#09090e] border border-[#222233] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#4ade80]" />
          </Field>
          <div className="flex items-end gap-2 relative">
            <button onClick={() => setShowExport(!showExport)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#222233] text-[#a0a0b0] hover:text-white text-sm">
              <Download size={14} /> Exporter
            </button>
            {showExport && (
              <div className="absolute top-full right-0 mt-2 bg-[#111116] border border-[#1b1b26] rounded-xl shadow-xl z-20 min-w-[180px]">
                {[
                  { label: 'Excel (.xlsx)', icon: FileSpreadsheet, fn: exportExcel },
                  { label: 'PDF / Imprimer', icon: Printer, fn: () => exportPrint(`Cotations — ${classe}`) },
                ].map(({ label, icon: Icon, fn }) => (
                  <button key={label} onClick={() => { fn(); setShowExport(false); }}
                    className="flex items-center gap-2 w-full px-4 py-3 text-sm text-[#a0a0b0] hover:text-white hover:bg-[#1a1a26] first:rounded-t-xl last:rounded-b-xl">
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#44445a]" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Recherche instantanée..."
          className="w-full bg-[#111116] border border-[#1b1b26] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#44445a] focus:outline-none focus:border-[#4ade80]" />
      </div>

      {!classe ? (
        <div className="text-center py-16 text-[#44445a]">
          <Table2 size={40} className="mx-auto mb-3 opacity-30" />
          <p>Sélectionnez une classe pour afficher le tableau</p>
        </div>
      ) : (
        <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1b1b26] bg-[#0d0d12]">
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#44445a] sticky left-0 bg-[#0d0d12] z-10 min-w-[200px]">
                    <span className="flex items-center gap-1"><ArrowUpDown size={10} /> Élève</span>
                  </th>
                  {periodesCols.map((p) => (
                    <th key={p.id} className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-[#44445a] text-center whitespace-nowrap">
                      {p.designation}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-[#4ade80] text-center">Total sem.</th>
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-[#38bdf8] text-center">Moyenne %</th>
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-[#fbbf24] text-center">Rang</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.eleve.id} className="border-b border-[#1b1b26] hover:bg-[#0d0d12]">
                    <td className="px-4 py-3 sticky left-0 bg-[#111116] z-10">
                      <div className="flex items-center gap-2">
                        <Avatar eleve={row.eleve} size="sm" />
                        <span className="text-white text-xs font-medium">{fullName(row.eleve)}</span>
                      </div>
                    </td>
                    {row.periodAvgs.map((p) => (
                      <td key={p.periodeId} className="px-3 py-3 text-center text-[#a0a0b0] text-xs">
                        {formatPourcentage(p.moyenne)}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-center text-[#4ade80] font-bold text-xs">
                      {formatPourcentage(row.totalSemestre ?? row.moyenneGenerale)}
                    </td>
                    <td className="px-3 py-3 text-center text-[#38bdf8] font-bold text-xs">
                      {formatPourcentage(row.moyenneGenerale)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {row.rang != null ? (
                        <span className="inline-flex items-center gap-1 text-[#fbbf24] text-xs font-bold">
                          <Award size={12} /> {row.rang}<sup>e</sup>
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-[#1b1b26] text-[#44445a] text-xs">
            {filtered.length} élève(s) · Totaux et moyennes calculés automatiquement
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  ONGLET FICHE INDIVIDUELLE
// ─────────────────────────────────────────────────────────────────────────────

const FicheTab = ({ eleves, selectedEleve, setSelectedEleve, results, classe, anneeLabel, ranks, onPrint }) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return eleves;
    const q = search.toLowerCase();
    return eleves.filter((e) => fullName(e).toLowerCase().includes(q));
  }, [eleves, search]);

  if (!selectedEleve) {
    return (
      <div className="space-y-4">
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#44445a]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un élève..."
            className="w-full bg-[#111116] border border-[#1b1b26] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#44445a] focus:outline-none focus:border-[#4ade80]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((e) => (
            <button key={e.id} onClick={() => setSelectedEleve(e)}
              className="flex items-center gap-3 bg-[#111116] border border-[#1b1b26] rounded-2xl p-4 hover:border-[#4ade80]/40 text-left">
              <Avatar eleve={e} />
              <div>
                <p className="text-white text-sm font-semibold">{fullName(e)}</p>
                <p className="text-[#44445a] text-xs">{e.classe}</p>
              </div>
              <Eye size={14} className="ml-auto text-[#44445a]" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  const eleve = selectedEleve;
  const rang = ranks.get(eleve.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setSelectedEleve(null)}
          className="text-[#a0a0b0] hover:text-white text-sm flex items-center gap-1">
          ← Retour à la liste
        </button>
        <button onClick={() => onPrint(eleve, results)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#222233] text-[#a0a0b0] hover:text-white text-sm">
          <Printer size={14} /> Imprimer la fiche
        </button>
      </div>

      {/* En-tête fiche */}
      <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-6">
        <div className="flex items-start gap-6">
          <Avatar eleve={eleve} size="lg" />
          <div className="flex-1">
            <h2 className="text-white text-xl font-bold">{fullName(eleve)}</h2>
            <div className="flex flex-wrap gap-4 mt-2 text-sm">
              <span className="text-[#62627a]"><GraduationCap size={14} className="inline mr-1 text-[#4ade80]" />{classe || eleve.classe}</span>
              <span className="text-[#62627a]">Année : <span className="text-white">{anneeLabel}</span></span>
              {rang && <span className="text-[#fbbf24]"><Award size={14} className="inline mr-1" />Rang {rang}<sup>e</sup></span>}
            </div>
          </div>
          <div className="text-right space-y-1">
            {results.semesterMoyennes.map((s) => (
              <div key={s.semestreId}>
                <p className="text-[#44445a] text-[10px] uppercase">{s.label}</p>
                <p className="text-[#4ade80] font-bold">{formatPourcentage(s.moyenne)}</p>
              </div>
            ))}
            <div className="pt-2 border-t border-[#1b1b26] mt-2">
              <p className="text-[#44445a] text-[10px] uppercase">Moyenne annuelle</p>
              <p className="text-[#38bdf8] font-bold text-lg">{formatPourcentage(results.moyenneAnnuelle)}</p>
              <p className={`text-xs font-bold mt-1 ${results.decision === 'ADMIS' ? 'text-[#4ade80]' : 'text-[#f43f5e]'}`}>
                {results.decision}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau détaillé par cours */}
      <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1b1b26] bg-[#0d0d12]">
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase text-[#44445a] sticky left-0 bg-[#0d0d12] z-10">Cours</th>
                <th className="px-2 py-3 text-[10px] font-bold uppercase text-[#44445a]">Max</th>
                {results.periodMoyennes.map((p) => (
                  <th key={p.periodeId} className="px-2 py-3 text-[10px] font-bold uppercase text-[#44445a] text-center whitespace-nowrap">{p.label}</th>
                ))}
                <th className="px-2 py-3 text-[10px] font-bold uppercase text-[#4ade80]">Tot. S1</th>
                <th className="px-2 py-3 text-[10px] font-bold uppercase text-[#4ade80]">Tot. S2</th>
              </tr>
            </thead>
            <tbody>
              {results.coursResults.map((cr) => (
                <tr key={cr.id} className="border-b border-[#1b1b26]">
                  <td className="px-4 py-2.5 text-white font-medium sticky left-0 bg-[#111116] z-10">{cr.coursDesignation}</td>
                  <td className="px-2 py-2.5 text-center text-[#44445a]">{cr.max}</td>
                  {cr.periodeCotes.map((pc) => (
                    <td key={pc.periodeId} className="px-2 py-2.5 text-center text-[#a0a0b0]">
                      {pc.cote != null ? `${pc.cote}/${pc.max}` : '—'}
                    </td>
                  ))}
                  {cr.semestreMoyennes.map((sm) => (
                    <td key={sm.semestreId} className="px-2 py-2.5 text-center text-[#4ade80] font-bold">
                      {sm.moyenne != null ? formatPourcentage(sm.moyenne) : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  ONGLET BULLETINS
// ─────────────────────────────────────────────────────────────────────────────

const BulletinsTab = ({ eleves, classe, anneeLabel, cotations, coursList, meta, etab, onGenerate }) => {
  const [selectedEleve, setSelectedEleve] = useState('');
  const [bulletinType, setBulletinType] = useState('sem1');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return eleves;
    const q = search.toLowerCase();
    return eleves.filter((e) => fullName(e).toLowerCase().includes(q));
  }, [eleves, search]);

  return (
    <div className="space-y-4">
      <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-6">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <FileText size={16} className="text-[#4ade80]" /> Génération de bulletins
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Type de bulletin">
            <SelInput value={bulletinType} onChange={setBulletinType}
              options={BULLETIN_TYPES.map((b) => ({ value: b.id, label: b.label }))} />
          </Field>
          <Field label="Élève">
            <SelInput value={selectedEleve} onChange={setSelectedEleve} placeholder="Choisir un élève..."
              options={filtered.map((e) => ({ value: String(e.id), label: fullName(e) }))} />
          </Field>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => {
              const eleve = eleves.find((e) => String(e.id) === selectedEleve);
              if (!eleve) return;
              onGenerate(eleve, bulletinType);
            }}
            disabled={!selectedEleve}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#4ade80] text-[#0a0a0e]  text-sm hover:bg-[#22c55e] disabled:opacity-40 disabled:cursor-not-allowed">
            <Printer size={14} /> Générer et imprimer
          </button>
          <button
            onClick={() => eleves.forEach((e) => onGenerate(e, bulletinType))}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#222233] text-[#a0a0b0] hover:text-white text-sm">
            <Printer size={14} /> Toute la classe
          </button>
        </div>
      </div>

    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  IMPRESSION — Fiche & Bulletin
// ─────────────────────────────────────────────────────────────────────────────

const buildPrintHtml = (eleve, results, opts) => {
  const { title, classe, anneeLabel, etab, rang, bulletinType, periodesFilter } = opts;

  const coursRows = results.coursResults.map((cr) => {
    const cols = cr.periodeCotes
      .filter((pc) => !periodesFilter || periodesFilter.includes(pc.periodeId))
      .map((pc) => `<td>${pc.cote != null ? pc.cote : '—'}</td>`)
      .join('');

    const totCols = bulletinType?.includes('sem') || bulletinType === 'annuel'
      ? cr.semestreMoyennes.map((sm) =>
          (!opts.semestreFilter || sm.semestreId === opts.semestreFilter)
            ? `<td><strong>${sm.moyenne != null ? formatPourcentage(sm.moyenne) : '—'}</strong></td>`
            : '',
        ).join('')
      : '';

    return `<tr><td>${cr.coursDesignation}</td><td>${cr.max}</td>${cols}${totCols}</tr>`;
  }).join('');

  const periodHeaders = results.coursResults[0]?.periodeCotes
    .filter((pc) => !periodesFilter || periodesFilter.includes(pc.periodeId))
    .map((pc) => `<th>${pc.periodeLabel}</th>`).join('') ?? '';

  const totHeaders = bulletinType?.includes('sem') || bulletinType === 'annuel'
    ? (opts.semestreFilter
      ? `<th>Total S${opts.semestreFilter}</th>`
      : '<th>Total S1</th><th>Total S2</th>')
    : '';

  return `<html><head><title>${title}</title><style>
    @page{margin:15mm} body{font-family:Georgia,serif;font-size:11px;color:#111;margin:0;padding:20px}
    .header{display:flex;align-items:center;gap:16px;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:16px}
    .header img{width:60px;height:60px;object-fit:contain}
    .school h1{font-size:16px;margin:0} .school p{font-size:10px;color:#555;margin:2px 0}
    .title{text-align:center;font-size:14px;font-weight:bold;margin:16px 0;text-transform:uppercase;letter-spacing:1px}
    .info{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;font-size:11px}
    .info span{color:#555} .info strong{color:#111}
    table{width:100%;border-collapse:collapse;margin-bottom:16px}
    th,td{border:1px solid #ccc;padding:5px 8px;text-align:center;font-size:10px}
    th{background:#f0f0f0;font-weight:bold} td:first-child,th:first-child{text-align:left}
    .summary{display:flex;justify-content:space-around;background:#f8f8f8;border:1px solid #ccc;padding:12px;margin-bottom:20px}
    .summary div{text-align:center} .summary .val{font-size:16px;font-weight:bold;color:#111}
    .summary .lbl{font-size:9px;color:#555;text-transform:uppercase}
    .signatures{display:flex;justify-content:space-between;margin-top:40px}
    .sig{text-align:center;width:30%} .sig-line{border-top:1px solid #111;margin-top:40px;padding-top:4px;font-size:10px}
    .stamp{border:2px dashed #999;border-radius:50%;width:80px;height:80px;display:flex;align-items:center;justify-content:center;font-size:8px;color:#999;margin:20px auto}
    .decision{text-align:center;font-size:13px;font-weight:bold;padding:8px;border:2px solid #111;margin-top:12px}
  </style></head><body>
  <div class="header">
    <img src="${etab.logo}" alt="Logo" />
    <div class="school"><h1>${etab.nom}</h1><p>${etab.adresse}</p><p>Tél : ${etab.telephone}</p></div>
  </div>
  <div class="title">${title}</div>
  <div class="info">
    <div><span>Élève :</span> <strong>${fullName(eleve)}</strong></div>
    <div><span>Classe :</span> <strong>${classe}</strong></div>
    <div><span>Année scolaire :</span> <strong>${anneeLabel}</strong></div>
    <div><span>Classement :</span> <strong>${rang ? rang + 'e' : '—'}</strong></div>
  </div>
  <table>
    <thead><tr><th>Cours</th><th>Max</th>${periodHeaders}${totHeaders}</tr></thead>
    <tbody>${coursRows}</tbody>
  </table>
  <div class="summary">
    ${results.semesterMoyennes.map((s) =>
      (!opts.semestreFilter || s.semestreId === opts.semestreFilter)
        ? `<div><div class="lbl">${s.label}</div><div class="val">${formatPourcentage(s.moyenne)}</div></div>`
        : '',
    ).join('')}
    ${!opts.semestreFilter || bulletinType === 'annuel' ? `
    <div><div class="lbl">Moyenne annuelle</div><div class="val">${formatPourcentage(results.moyenneAnnuelle)}</div></div>` : ''}
  </div>
  ${bulletinType === 'annuel' ? `<div class="decision">Décision : ${results.decision}</div>` : ''}
  <div class="signatures">
    <div class="sig"><div class="sig-line">${etab.directeur}</div></div>
    <div class="stamp">Cachet de<br/>l'établissement</div>
    <div class="sig"><div class="sig-line">${etab.proviseur}</div></div>
  </div>
  </body></html>`;
};

const printDocument = (html) => {
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.print();
};

// ─────────────────────────────────────────────────────────────────────────────
//  COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function Cotations() {
  const {
    eleves: allEleves,
    classesData,
    cours: coursData,
    coursClasses: coursClassesData,
    meta: metaData,
    cotations: cotationsFromApi,
    inscriptions,
    loading,
    error,
    reload,
    activeAnnee,
    anneeId,
  } = useSchoolData();

  const anneeLabel = activeAnnee?.designation ?? '—';
  const etablissement = ETABLISSEMENT;

  const CLASSES_LIST = useMemo(
    () => classesData.classes.map((c) => c.nom),
    [classesData],
  );

  const [cotations, setCotations] = useState([]);
  useEffect(() => { setCotations(cotationsFromApi); }, [cotationsFromApi]);
  const [mainTab, setMainTab] = useState('saisie');
  const [classe, setClasse] = useState('');
  const [semestreId, setSemestreId] = useState(1);
  const [tableSemestre, setTableSemestre] = useState(1);
  const [periodeId, setPeriodeId] = useState('');
  const [quickMode, setQuickMode] = useState(false);
  const [modalEleve, setModalEleve] = useState(null);
  const [selectedEleve, setSelectedEleve] = useState(null);
  const [pending, setPending] = useState({});
  const [toast, setToast] = useState(null);

  const notify = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const classeObj = classe ? getClasseByNom(classesData, classe) : null;
  const eleves = useMemo(
    () => (classe ? getElevesByClasse(allEleves, classe) : []),
    [classe, allEleves],
  );

  const coursList = useMemo(() => {
    if (!classeObj) return [];
    const raw = getCoursClasseForClasse(coursClassesData, classeObj.id, anneeId);
    return enrichCoursClasse(raw, coursData);
  }, [classeObj, anneeId, coursClassesData, coursData]);

  const dirty = Object.keys(pending).length > 0;

  // ── CRUD cotations ──
  const upsertCotation = useCallback(async (data) => {
    try {
      const existing = data.id
        ? cotations.find((c) => c.id === data.id)
        : findCotation(cotations, data.eleveId, data.coursClasseId, data.periodeId);
      await saveCotation(data, inscriptions, existing?.id);
      await reload();
    } catch (err) {
      notify(err.message ?? 'Erreur de sauvegarde', 'error');
    }
  }, [cotations, inscriptions, reload, notify]);

  const deleteCotation = useCallback(async (id) => {
    try {
      await removeCotation(id);
      await reload();
    } catch (err) {
      notify(err.message ?? 'Erreur de suppression', 'error');
    }
  }, [reload, notify]);

  const handleSaveAll = useCallback(async () => {
    const entries = Object.entries(pending);
    try {
      for (const [key, val] of entries) {
        const [eleveId, ccId, pid] = key.split('_').map(Number);
        const cc = coursList.find((c) => c.id === ccId);
        if (!cc) continue;
        const maxP = getMaxCote(cc, pid);
        const r = validateCote(val, maxP);
        if (!r.valid) continue;

        const existing = findCotation(cotations, eleveId, ccId, pid);
        const payload = {
          eleveId,
          coursClasseId: ccId,
          periodeId: pid,
          valeur: r.value,
          dateSaisie: new Date().toISOString().slice(0, 10),
        };
        await saveCotation(payload, inscriptions, existing?.id);
      }
      await reload();
      setPending({});
      notify(`${entries.length} cote(s) enregistrée(s)`);
    } catch (err) {
      notify(err.message ?? 'Erreur de sauvegarde', 'error');
    }
  }, [cotations, pending, coursList, inscriptions, reload, notify]);

  const onQuickChange = useCallback((eleveId, ccId, val, max) => {
    const key = `${eleveId}_${ccId}_${periodeId}`;
    if (val === '') {
      setPending((p) => { const n = { ...p }; delete n[key]; return n; });
      return;
    }
    const r = validateCote(val, max);
    if (r.valid) setPending((p) => ({ ...p, [key]: val }));
  }, [periodeId]);

  // ── Tableau & fiche data ──
  const tableRows = useMemo(() => {
    if (!eleves.length || !coursList.length) return [];
    return buildClassTableRows(cotations, eleves, coursList, metaData, tableSemestre || null);
  }, [cotations, eleves, coursList, tableSemestre]);

  const ficheResults = useMemo(() => {
    if (!selectedEleve || !coursList.length) return null;
    return buildEleveResults(cotations, selectedEleve, coursList, metaData);
  }, [cotations, selectedEleve, coursList]);

  const ficheRanks = useMemo(() => {
    if (!eleves.length || !coursList.length) return new Map();
    return computeRankings(eleves, (id) =>
      computeAnnualMoyenne(cotations, id, coursList, metaData.periodes),
    );
  }, [cotations, eleves, coursList]);

  const handlePrintFiche = (eleve, results) => {
    const html = buildPrintHtml(eleve, results, {
      title: `Fiche de cotation — ${fullName(eleve)}`,
      classe: classe || eleve.classe,
      anneeLabel,
      etab: etablissement,
      rang: ficheRanks.get(eleve.id),
      bulletinType: 'annuel',
    });
    printDocument(html);
  };

  const handleGenerateBulletin = (eleve, typeId) => {
    const bType = BULLETIN_TYPES.find((b) => b.id === typeId);
    const results = buildEleveResults(cotations, eleve, coursList, metaData);
    const ranks = computeRankings(eleves, (id) => {
      if (bType?.semestreId) return computeSemesterMoyenne(cotations, id, bType.semestreId, coursList, metaData.periodes);
      return computeAnnualMoyenne(cotations, id, coursList, metaData.periodes);
    });

    const html = buildPrintHtml(eleve, results, {
      title: bType?.label ?? 'Bulletin',
      classe: classe || eleve.classe,
      anneeLabel,
      etab: etablissement,
      rang: ranks.get(eleve.id),
      bulletinType: typeId,
      periodesFilter: bType?.periodeId ? [bType.periodeId] : undefined,
      semestreFilter: bType?.semestreId && !bType?.periodeId ? bType.semestreId : undefined,
    });
    printDocument(html);
  };

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-[#09090e]">
      {loading && (
        <p className="text-[#62627a] text-center py-20">Chargement des cotations…</p>
      )}
      {error && (
        <div className="text-center py-20">
          <p className="text-[#f43f5e] mb-4">{error.message}</p>
          <button onClick={reload} className="px-4 py-2 rounded-xl bg-[#1b2e1f] text-[#4ade80] text-sm">Réessayer</button>
        </div>
      )}
      {!loading && !error && (
      <>
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Cotations</h1>
          <p className="text-[#55556d] text-sm mt-1.5">
            Saisie, calculs automatiques et bulletins · {anneeLabel}
          </p>
        </div>
        {dirty && (
          <button onClick={handleSaveAll}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#4ade80] text-[#0a0a0e]  text-sm hover:bg-[#22c55e]">
            <Save size={16} /> Enregistrer les modifications ({Object.keys(pending).length})
          </button>
        )}
      </div>

      {/* Sélecteur classe global */}
      <div className="mb-6 max-w-xs">
        <Field label="Classe active">
          <SelInput value={classe} onChange={(v) => { setClasse(v); setSelectedEleve(null); }}
            placeholder="Choisir une classe..."
            options={CLASSES_LIST.map((c) => ({ value: c, label: c }))} />
        </Field>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 mb-6 bg-[#111116] border border-[#1b1b26] rounded-2xl p-1.5 overflow-x-auto">
        {MAIN_TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setMainTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              mainTab === id
                ? 'bg-[#4ade80] text-[#0a0a0e] font-bold'
                : 'text-[#62627a] hover:text-white hover:bg-[#1a1a26]'
            }`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Contenu onglets */}
      {mainTab === 'saisie' && (
        <SaisieTab
          classe={classe} setClasse={setClasse} classOptions={CLASSES_LIST}
          eleves={eleves} coursList={coursList}
          cotations={cotations} pending={pending} setPending={setPending}
          dirty={dirty} onSaveAll={handleSaveAll}
          onOpenModal={setModalEleve}
          quickMode={quickMode} setQuickMode={setQuickMode}
          semestreId={semestreId} setSemestreId={setSemestreId}
          periodeId={periodeId} setPeriodeId={setPeriodeId}
          periodes={metaData.periodes} semestres={metaData.semestres}
          onQuickChange={onQuickChange} anneeId={anneeId}
        />
      )}

      {mainTab === 'tableau' && (
        <TableauTab
          classe={classe} setClasse={setClasse} classOptions={CLASSES_LIST}
          tableRows={tableRows}
          periodes={metaData.periodes}
          semestreId={tableSemestre} setSemestreId={setTableSemestre}
          semestres={metaData.semestres}
          anneeLabel={anneeLabel}
        />
      )}

      {mainTab === 'fiche' && (
        <FicheTab
          eleves={eleves}
          selectedEleve={selectedEleve}
          setSelectedEleve={setSelectedEleve}
          results={ficheResults}
          classe={classe}
          anneeLabel={anneeLabel}
          ranks={ficheRanks}
          onPrint={handlePrintFiche}
        />
      )}

      {mainTab === 'bulletins' && (
        <BulletinsTab
          eleves={eleves}
          classe={classe}
          anneeLabel={anneeLabel}
          cotations={cotations}
          coursList={coursList}
          meta={metaData}
          etab={etablissement}
          onGenerate={handleGenerateBulletin}
        />
      )}

      {/* Modal saisie individuelle */}
      {modalEleve && (
        <CotationModal
          eleve={modalEleve}
          coursList={coursList}
          periodes={metaData.periodes}
          semestres={metaData.semestres}
          cotations={cotations}
          anneeId={anneeId}
          onClose={() => setModalEleve(null)}
          onSave={upsertCotation}
          onDelete={deleteCotation}
          notify={notify}
        />
      )}

      <Toast toast={toast} />
      </>
      )}
    </div>
  );
}
