
import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, X, ChevronDown, ChevronLeft, ChevronRight,
  Calendar, CheckCircle2, XCircle, Users, Eye, Check, Save,
} from 'lucide-react';
import { useSchoolData } from '../hooks/useSchoolData';
import { createOne, deleteOne } from '../lib/api';
import { presenceToRecords, mapPresenceToApi } from '../lib/schoolJoins';


const CLASSES_FALLBACK = [
  '7ème A','7ème B','7ème C',
  '8ème A','8ème B','8ème C',
  '1ère A','1ère B','1ère C',
  '2ème A','2ème B','2ème C',
  '3ème A','3ème B','3ème C',
  '4ème A','4ème B','4ème C',
];

const TODAY        = new Date().toISOString().slice(0, 10);
const CURRENT_YEAR = new Date().getFullYear();

// Palette d'avatars (cohérente avec Eleves.jsx)
const AVT_BG   = ['#132c3f','#2e163d','#1e1b4b','#3c2a16','#103024','#3b1820'];
const AVT_TEXT = ['#38bdf8','#c084fc','#818cf8','#fbbf24','#4ade80','#f43f5e'];

// ─────────────────────────────────────────────────────────────────────────────
//  MINI-AVATAR
// ─────────────────────────────────────────────────────────────────────────────

const MiniAvatar = ({ eleve, size = 'sm' }) => {
  const [err, setErr] = useState(false);
  const cls = {
    sm: 'w-8 h-8 text-[10px] font-bold',
    md: 'w-10 h-10 text-sm font-bold',
    lg: 'w-16 h-16 text-xl font-bold',
  }[size];

  if (!err && eleve.photo) {
    return (
      <img
        src={eleve.photo} alt=""
        onError={() => setErr(true)}
        className={`${cls} rounded-full object-cover ring-2 ring-[#222233] shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${cls} rounded-full flex items-center justify-center ring-2 ring-[#222233] shrink-0`}
      style={{
        backgroundColor: AVT_BG[(eleve.id - 1) % AVT_BG.length],
        color: AVT_TEXT[(eleve.id - 1) % AVT_TEXT.length],
      }}
    >
      {eleve.nom[0]}{eleve.prenom[0]}
    </div>
  );
};


const formatDateLong = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const getAge = (dob) => {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

// ─────────────────────────────────────────────────────────────────────────────
//  BUILD YEAR GRID — Grille style GitHub (52 semaines × 5 jours)
// ─────────────────────────────────────────────────────────────────────────────

const buildYearGrid = (eleveId, classe, year, records) => {
  const jan1 = new Date(year, 0, 1);

  // Reculer au lundi précédant ou égal au 1er janvier
  let cur = new Date(jan1);
  const dow0 = cur.getDay();
  if (dow0 === 0)      cur.setDate(cur.getDate() - 6);
  else if (dow0 > 1)   cur.setDate(cur.getDate() - (dow0 - 1));

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const weeks       = [];
  const monthLabels = [];
  let lastMonth     = -1;
  let wi            = 0;

  while (true) {
    const days = [];
    for (let d = 0; d < 6; d++) { // Lundi → Samedi
      const date   = new Date(cur);
      date.setDate(date.getDate() + d);
      const inYear = date.getFullYear() === year;
      const ds     = date.toISOString().slice(0, 10);

      // Étiquette de mois
      if (inYear && date.getMonth() !== lastMonth) {
        monthLabels.push({
          label: date.toLocaleDateString('fr-FR', { month: 'short' }),
          wi,
        });
        lastMonth = date.getMonth();
      }

      let status = 'outside';
      if (inYear) {
        if (date > today) {
          status = 'future';
        } else {
          const rec = records.find((r) => r.date === ds && r.classe === classe);
          if (rec) {
            status = rec.presents.includes(eleveId) ? 'present' : 'absent';
          } else {
            status = 'no-record';
          }
        }
      }
      days.push({ ds, status, inYear });
    }

    weeks.push(days);
    cur.setDate(cur.getDate() + 7);
    wi++;
    if (cur.getFullYear() > year && wi >= 52) break;
    if (wi > 56) break;
  }

  return { weeks, monthLabels };
};

// ─────────────────────────────────────────────────────────────────────────────
//  ATTENDANCE GRID — Composant grille GitHub
// ─────────────────────────────────────────────────────────────────────────────


const GRID_COLOR = {
  present:    '#4ade80',
  absent:     '#f43f5e',
  'no-record':'#1b1b26',
  future:     '#111116',
  outside:    'transparent',
};

// Ajuste ces constantes à l'extérieur de ton composant pour agrandir les cases
const CELL = 12; // Augmenté (auparavant ~10 ou moins)
const GAP = 3;   // Espace entre les cases
const STEP = CELL + GAP;

const AttendanceGrid = ({ eleveId, classe, year, records }) => {
  const [tooltip, setTooltip] = useState(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const { weeks, monthLabels } = useMemo(
    () => buildYearGrid(eleveId, classe, year, records),
    [eleveId, classe, year, records],
  );

  const totalW = weeks.length * STEP + 32;

  return (
    <div
      className="relative select-none font-sans"
      onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
    >
      {/* Tooltip flottant moderne */}
      {tooltip && (
        <div
          className="fixed z-[9999] pointer-events-none transition-transform duration-75 ease-out"
          style={{ left: pos.x + 14, top: pos.y + 14 }}
        >
          <div className="bg-[#161622] border border-[#2d2d44] rounded-lg px-3 py-1.5 shadow-xl backdrop-blur-sm">
            <p className="text-gray-400 text-[11px] font-medium">
              {formatDateShort(tooltip.ds)}
            </p>
            <p
              className="text-xs font-semibold mt-0.5 flex items-center gap-1.5"
              style={{ color: GRID_COLOR[tooltip.status] || '#4b5563' }}
            >
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: GRID_COLOR[tooltip.status] || '#4b5563' }}
              />
              {tooltip.status === 'present' && 'Présent'}
              {tooltip.status === 'absent' && 'Absent'}
              {tooltip.status === 'no-record' && 'Aucun enregistrement'}
            </p>
          </div>
        </div>
      )}

      {/* Grille avec scrollbar stylisée si nécessaire */}
      <div className="overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-gray-8xl">
        <div style={{ minWidth: totalW }} className="relative pt-2">
          
          {/* Étiquettes des mois */}
          <div className="relative h-5 ml-8">
            {monthLabels.map((ml, i) => (
              <span
                key={i}
                className="absolute text-[11px] text-gray-500 font-medium tracking-wide"
                style={{ left: ml.wi * STEP }}
              >
                {ml.label}
              </span>
            ))}
          </div>

          {/* Corps de la grille (Jours + Cases) */}
          <div className="flex items-start">
            
            {/* Labels des jours de la semaine */}
            <div 
              className="flex flex-col pr-2 text-right justify-between pt-[1px]"
              style={{ gap: GAP, height: 6 * CELL + 5 * GAP }}
            >
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day, i) => (
                <div
                  key={i}
                  className="text-[10px] text-gray-500 font-medium flex items-center justify-end"
                  style={{ height: CELL, width: 22 }}
                >
                  {i % 2 === 0 ? day : ''}
                </div>
              ))}
            </div>

            {/* Les colonnes de semaines */}
            <div className="flex" style={{ gap: GAP }}>
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                  {week.map((day, di) => {
                    const isInteractive = ['present', 'absent', 'no-record'].includes(day.status);
                    return (
                      <div
                        key={di}
                        className={`
                          transition-all duration-150 relative
                          ${isInteractive ? 'cursor-pointer hover:scale-115 hover:z-10 shadow-sm' : ''}
                        `}
                        style={{
                          width: CELL,
                          height: CELL,
                          borderRadius: 3, // Arrondi légèrement plus visible et moderne
                          backgroundColor: GRID_COLOR[day.status] ?? 'transparent',
                          opacity: day.inYear ? 1 : 0.15,
                          boxShadow: day.status === 'no-record' ? 'inset 0 0 0 1px rgba(255,255,255,0.03)' : 'none'
                        }}
                        onMouseEnter={() => day.inYear && setTooltip(day)}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* Légende épurée en bas */}
      <div className="flex items-center gap-6 mt-4 pt-2 border-t border-gray-900">
        {[
          { color: '#4ade80', label: 'Présent' },
          { color: '#f43f5e', label: 'Absent' },
          { color: '#1b1b26', label: 'Aucun enregistrement' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div 
              className="shadow-inner"
              style={{ 
                width: CELL - 2, 
                height: CELL - 2, 
                borderRadius: 2, 
                backgroundColor: color 
              }} 
            />
            <span className="text-[11px] text-gray-400 font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────
//  STUDENT VIEW MODAL — Fiche individuelle + grille GitHub
// ─────────────────────────────────────────────────────────────────────────────

const StudentViewModal = ({ eleve, records, onClose }) => {
  const [year, setYear] = useState(CURRENT_YEAR);

  const stats = useMemo(() => {
    const recs    = records.filter((r) => r.date.startsWith(String(year)) && r.classe === eleve.classe);
    const total   = recs.length;
    const present = recs.filter((r) => r.presents.includes(eleve.id)).length;
    const absent  = total - present;
    const rate    = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, rate };
  }, [eleve, year, records]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(9,9,14,0.88)', backdropFilter: 'blur(6px)' }}
    >
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 bg-[#111116] border border-[#1b1b26] rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl">

        {/* ── En-tête élève ── */}
        <div className="flex items-center justify-between p-6 border-b border-[#1b1b26]">
          <div className="flex items-center gap-4">
            <MiniAvatar eleve={eleve} size="lg" />
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">
                {eleve.nom} {eleve.postnom} {eleve.prenom}
              </h2>
              <p className="text-[#62627a] text-sm mt-0.5">{eleve.classe} · {eleve.option}</p>
              <p className="text-[#44445a] text-xs mt-0.5">
                {eleve.sexe === 'M' ? '♂ Masculin' : '♀ Féminin'} · {getAge(eleve.dateNaissance)} ans
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[#1a1a26] text-[#55556d] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Stats + sélecteur année ── */}
        <div className="p-6 border-b border-[#1b1b26]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-sm">Bilan de présence {year}</h3>

            {/* Navigateur d'année */}
            <div className="flex items-center gap-1 bg-[#09090e] border border-[#222233] rounded-xl p-1">
              <button
                onClick={() => setYear((y) => y - 1)}
                className="p-1.5 rounded-lg hover:bg-[#1b1b26] text-[#44445a] hover:text-white transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-white font-bold text-sm px-3">{year}</span>
              <button
                onClick={() => setYear((y) => Math.min(y + 1, CURRENT_YEAR))}
                disabled={year >= CURRENT_YEAR}
                className="p-1.5 rounded-lg hover:bg-[#1b1b26] text-[#44445a] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* 4 cartes statistiques */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Jours enreg.', val: stats.total,    color: '#d4d4d4', bg: '#1e1b4b' },
              { label: 'Présences',    val: stats.present,   color: '#d4d4d4', bg: '#12241c' },
              { label: 'Absences',     val: stats.absent,    color: '#d4d4d4', bg: '#291415' },
              { label: 'Taux',         val: `${stats.rate}%`,color: '#d4d4d4', bg: '#2a1f0a' },
            ].map(({ label, val, color, bg }) => (
              <div
                key={label}
                className="rounded-xl p-3 border border-[#1b1b26]"
                style={{ backgroundColor: bg + '55' }}
              >
                <p className="text-xl font-bold leading-tight" style={{ color }}>{val}</p>
                <p className="text-[#55556d] text-[10px] mt-0.5">{label}</p>
              </div>
            ))}
          </div>

        </div>

        {/* ── Grille GitHub ── */}
        <div className="p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#44445a] mb-5">
            Grille de présence — {year}
          </p>
          <AttendanceGrid
            eleveId={eleve.id}
            classe={eleve.classe}
            year={year}
            records={records}
          />
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function Presence() {
  const {
    eleves: allEleves,
    classes,
    presences,
    inscriptions,
    loading,
    error,
    reload,
    anneeId,
  } = useSchoolData({
    keys: ['eleve', 'inscription', 'classe', 'option', 'anneeScolaire', 'presence'],
  });

  const CLASSES = useMemo(
    () => (classes.length ? classes.map((c) => c.nom) : CLASSES_FALLBACK),
    [classes],
  );

  const records = useMemo(
    () => presenceToRecords(presences, inscriptions, classes),
    [presences, inscriptions, classes],
  );

  // ── Prise de présence ──────────────────────────────────────────────────────
  const [prClasse,   setPrClasse]   = useState('');
  const [prDate,     setPrDate]     = useState(TODAY);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [prSearch,   setPrSearch]   = useState('');
  const [savedMsg,   setSavedMsg]   = useState(false);

  // Élèves de la classe sélectionnée
  const prEleves = useMemo(
    () => (prClasse ? allEleves.filter((e) => e.classe === prClasse) : []),
    [prClasse, allEleves],
  );

  // Charger le record existant (ou cocher tout par défaut)
  useEffect(() => {
    if (!prClasse) { setCheckedIds(new Set()); return; }
    const existing = records.find((r) => r.date === prDate && r.classe === prClasse);
    setCheckedIds(
      existing
        ? new Set(existing.presents)
        : new Set(prEleves.map((e) => e.id)),
    );
  }, [prClasse, prDate]); // volontairement sans `records` pour éviter reset après save

  // Liste filtrée par recherche
  const prElevesFilt = useMemo(() => {
    if (!prSearch.trim()) return prEleves;
    const q = prSearch.toLowerCase();
    return prEleves.filter((e) => `${e.nom} ${e.prenom}`.toLowerCase().includes(q));
  }, [prEleves, prSearch]);

  const toggleId = (id) =>
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectAll   = () => setCheckedIds(new Set(prEleves.map((e) => e.id)));
  const deselectAll = () => setCheckedIds(new Set());

  const saveAttendance = async () => {
    if (!prClasse || !prDate) return;
    const students = prEleves;
    const classInscriptions = inscriptions.filter((ins) => {
      const cls = classes.find((c) => c.nom === prClasse);
      return cls && ins.classeId === cls.id && (!anneeId || ins.anneeScolaireId === anneeId);
    });

    try {
      for (const ins of classInscriptions) {
        const eleve = students.find((e) => e.id === ins.eleveId);
        if (!eleve) continue;
        const isPresent = checkedIds.has(eleve.id);
        const existing = presences.find(
          (p) => p.inscriptionId === ins.id && p.datePresence === prDate,
        );
        if (isPresent && !existing) {
          await createOne('presence', mapPresenceToApi(ins.id, prDate));
        } else if (!isPresent && existing) {
          await deleteOne('presence', existing.id);
        }
      }
      await reload();
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3500);
    } catch (err) {
      console.error(err);
    }
  };

  // ── Consultation ───────────────────────────────────────────────────────────
  const [csDate,   setCsDate]   = useState(TODAY);
  const [csClasse, setCsClasse] = useState('');
  const [csSearch, setCsSearch] = useState('');

  const csRecord = useMemo(
    () => records.find((r) => r.date === csDate && r.classe === csClasse) ?? null,
    [csDate, csClasse, records],
  );

  const csEleves = useMemo(() => {
    if (!csClasse) return [];
    let list = allEleves.filter((e) => e.classe === csClasse);
    if (csSearch.trim()) {
      const q = csSearch.toLowerCase();
      list = list.filter((e) => `${e.nom} ${e.prenom}`.toLowerCase().includes(q));
    }
    return list;
  }, [csClasse, csSearch, allEleves]);

  const csPresents = csRecord ? csEleves.filter((e) => csRecord.presents.includes(e.id)).length : 0;
  const csAbsents  = csRecord ? csEleves.length - csPresents : 0;
  const csRate     = csRecord && csEleves.length > 0 ? Math.round((csPresents / csEleves.length) * 100) : null;

  // ── Vue individuelle ───────────────────────────────────────────────────────
  const [viewEleve, setViewEleve] = useState(null);

  // ──────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090e] text-white p-8 pl-12 flex items-center justify-center">
        <p className="text-[#62627a]">Chargement des présences…</p>
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

      {/* ═══ HEADER ═══ */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Présences</h1>
          <p className="text-[#55556d] text-sm mt-1.5">
            Suivi journalier des présences et absences
          </p>
        </div>

        {/* Stat rapide : aujourd'hui */}
        <div className="flex items-center gap-3 bg-[#111116] border border-[#1b1b26] rounded-2xl px-4 py-3">
          <Calendar size={16} className="text-[#4ade80]" />
          <div>
            <p className="text-white text-xs font-semibold">Aujourd'hui</p>
            <p className="text-[#44445a] text-[10px]">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="w-px h-8 bg-[#1b1b26] mx-1" />
          <div>
            <p className="text-[#4ade80] text-xs font-bold">
              {records.filter((r) => r.date === TODAY).length}
            </p>
            <p className="text-[#44445a] text-[10px]">classes enreg.</p>
          </div>
        </div>
      </div>

      {/* ═══ LAYOUT DEUX COLONNES ═══ */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">

        {/* ════════════════════════════════════════
            GAUCHE : Prise de présence
        ════════════════════════════════════════ */}
        <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl overflow-hidden flex flex-col">

          {/* En-tête */}
          <div className="px-6 py-5 border-b border-[#1b1b26]">
            <h2 className="text-white font-bold text-base">Prise de présence</h2>
            <p className="text-[#44445a] text-xs mt-0.5">Sélectionnez une classe et une date pour démarrer</p>
          </div>

          {/* Sélecteurs classe + date */}
          <div className="px-6 py-4 border-b border-[#1b1b26]">
            <div className="grid grid-cols-2 gap-4">

              {/* Classe */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#44445a] block mb-2">
                  Classe
                </label>
                <div className="relative">
                  <select
                    value={prClasse}
                    onChange={(e) => { setPrClasse(e.target.value); setPrSearch(''); }}
                    className="w-full bg-[#09090e] border border-[#222233] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#4ade80] transition-colors appearance-none cursor-pointer"
                  >
                    <option value="">Choisir une classe...</option>
                    {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#44445a] pointer-events-none" />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#44445a] block mb-2">
                  Date
                </label>
                <div className="relative">
                  <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#44445a]" />
                  <input
                    type="date"
                    value={prDate}
                    max={TODAY}
                    onChange={(e) => setPrDate(e.target.value)}
                    className="w-full bg-[#09090e] border border-[#222233] rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#4ade80] transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Corps : liste ou vide */}
          {!prClasse ? (
            <div className="flex flex-col items-center justify-center py-24 flex-1">
              <div className="w-16 h-16 rounded-2xl bg-[#09090e] border border-[#1b1b26] flex items-center justify-center mb-4">
                <Users size={26} className="text-[#2d2d3f]" />
              </div>
              <p className="text-[#44445a] font-semibold text-sm">Sélectionnez une classe</p>
              <p className="text-[#2d2d3f] text-xs mt-1">La liste des élèves apparaîtra ici</p>
            </div>
          ) : (
            <>
              {/* Recherche + boutons globaux */}
              <div className="px-5 py-3 border-b border-[#1b1b26] flex items-center gap-3">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#44445a]" />
                  <input
                    type="text"
                    value={prSearch}
                    onChange={(e) => setPrSearch(e.target.value)}
                    placeholder="Filtrer par nom..."
                    className="w-full bg-[#09090e] border border-[#222233] rounded-xl pl-8 pr-8 py-2 text-xs text-white placeholder-[#44445a] focus:outline-none focus:border-[#4ade80] transition-colors"
                  />
                  {prSearch && (
                    <button onClick={() => setPrSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#44445a] hover:text-white">
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button
                  onClick={selectAll}
                  className="px-2.5 py-1.5  bg-[#12241c] border border-[#1b3d2b] text-[#f4f4f5] text-[10px] hover:bg-[#1b3d2b] transition-colors whitespace-nowrap"
                >
                  Tous 
                </button>
                <button
                  onClick={deselectAll}
                  className="px-2.5 py-1.5 bg-[#291415] border border-[#441d22] text-[#f4f4f5] text-[10px] hover:bg-[#3b1820] transition-colors whitespace-nowrap"
                >
                  Aucun 
                </button>
              </div>

              {/* Compteur */}
              <div className="px-5 py-2.5 border-b border-[#1b1b26] flex items-center justify-between">
                <span className="text-[#44445a] text-xs capitalize">{formatDateLong(prDate)}</span>
                <span className="text-xs">
                  <span className="text-[#4ade80] font-bold">{checkedIds.size}</span>
                  <span className="text-[#44445a]"> / {prEleves.length} présents</span>
                </span>
              </div>

              {/* Liste avec checkboxes */}
              <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
                {prElevesFilt.length === 0 && (
                  <div className="text-center py-10 text-[#44445a] text-sm">Aucun élève trouvé</div>
                )}
                {prElevesFilt.map((eleve) => {
                  const present = checkedIds.has(eleve.id);
                  return (
                    <div
                      key={eleve.id}
                      onClick={() => toggleId(eleve.id)}
                      className="flex items-center gap-3 px-5 py-3 border-b border-[#1b1b26] last:border-0 cursor-pointer hover:bg-[#0c0c11] transition-colors group"
                    >
                      {/* Checkbox personnalisée */}
                      <div
                        className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-150"
                        style={{
                          borderColor:     present ? '#4ade80' : '#2d2d3f',
                          backgroundColor: present ? '#12241c' : 'transparent',
                        }}
                      >
                        {present && <Check size={11} color="#4ade80" strokeWidth={3} />}
                      </div>

                      <MiniAvatar eleve={eleve} />

                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate group-hover:text-[#a0a0b0] transition-colors">
                          {eleve.nom} {eleve.postnom} {eleve.prenom}
                        </p>
                        <p className="text-[#44445a] text-[10px] mt-0.5">{eleve.option}</p>
                      </div>

                      {/* Badge présent / absent */}
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full border shrink-0 transition-all"
                        style={present
                          ? { color: '#4ade80', backgroundColor: '#12241c00', borderColor: '#1b3d2b00' }
                          : { color: '#f43f5e', backgroundColor: '#29141500', borderColor: '#441d2200' }
                        }
                      >
                        {present ? 'Présent' : 'Absent'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Footer : bouton Enregistrer */}
              <div className="p-5 border-t border-[#1b1b26] mt-auto">
                {savedMsg && (
                  <div className="flex items-center gap-2 text-[#4ade80] text-xs mb-3 bg-[#12241c] border border-[#1b3d2b] rounded-xl px-3 py-2">
                    <CheckCircle2 size={13} />
                    Présences enregistrées avec succès pour {prClasse}
                  </div>
                )}
                <button
                  onClick={saveAttendance}
                  className="w-full py-3  text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                  style={{
                    background:  'linear-gradient(135deg, #16a34a, #4ade80)',
                    color:       '#09090e',
                    boxShadow:   '0 0 24px rgba(74,222,128,0.22)',
                  }}
                >
                  <Save size={15} strokeWidth={2.5} />
                  Enregistrer les présences ({checkedIds.size}/{prEleves.length})
                </button>
              </div>
            </>
          )}
        </div>

        {/* ════════════════════════════════════════
            DROITE : Consultation
        ════════════════════════════════════════ */}
        <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl overflow-hidden flex flex-col">

          {/* En-tête */}
          <div className="px-5 py-5 border-b border-[#1b1b26]">
            <h2 className="text-white font-bold text-base">Consultation</h2>
            <p className="text-[#44445a] text-xs mt-0.5">Vérifiez les présences d'un jour donné</p>
          </div>

          {/* Contrôles */}
          <div className="px-5 py-4 border-b border-[#1b1b26] space-y-3">
            {/* Date */}
            <div className="relative">
              <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#44445a]" />
              <input
                type="date"
                value={csDate}
                onChange={(e) => setCsDate(e.target.value)}
                className="w-full bg-[#09090e] border border-[#222233] rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#4ade80] transition-colors"
              />
            </div>
            {/* Classe */}
            <div className="relative">
              <select
                value={csClasse}
                onChange={(e) => setCsClasse(e.target.value)}
                className="w-full bg-[#09090e] border border-[#222233] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#4ade80] transition-colors appearance-none cursor-pointer"
              >
                <option value="">Choisir une classe...</option>
                {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#44445a] pointer-events-none" />
            </div>
            {/* Recherche élève */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#44445a]" />
              <input
                type="text"
                value={csSearch}
                onChange={(e) => setCsSearch(e.target.value)}
                placeholder="Rechercher un élève..."
                className="w-full bg-[#09090e] border border-[#222233] rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-[#44445a] focus:outline-none focus:border-[#4ade80] transition-colors"
              />
              {csSearch && (
                <button onClick={() => setCsSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#44445a] hover:text-white">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Corps consultation */}
          {!csClasse ? (
            <div className="flex flex-col items-center justify-center py-20 flex-1">
              <div className="w-12 h-12 rounded-xl bg-[#09090e] border border-[#1b1b26] flex items-center justify-center mb-3">
                <Calendar size={20} className="text-[#2d2d3f]" />
              </div>
              <p className="text-[#44445a] text-sm">Choisissez une classe</p>
            </div>
          ) : !csRecord ? (
            <div className="flex flex-col items-center justify-center py-20 flex-1">
              <div className="w-12 h-12 rounded-xl bg-[#09090e] border border-[#1b1b26] flex items-center justify-center mb-3">
                <XCircle size={20} className="text-[#2d2d3f]" />
              </div>
              <p className="text-[#44445a] text-sm font-medium">Aucun enregistrement</p>
              <p className="text-[#2d2d3f] text-xs mt-1">
                {csClasse} · {formatDateShort(csDate)}
              </p>
            </div>
          ) : (
            <>
              {/* Cartes mini-stats */}
              <div className="grid grid-cols-3 gap-2 px-5 py-4 border-b border-[#1b1b26]">
                {[
                  { label: 'Présents', val: csPresents, color: '#d8d8d8', bg: '#12241c' },
                  { label: 'Absents',  val: csAbsents,  color: '#e2e1e1', bg: '#291415' },
                  { label: 'Taux',     val: `${csRate}%`,color: '#dcdcdb', bg: '#2a1f0a' },
                ].map(({ label, val, color, bg }) => (
                  <div
                    key={label}
                    className="rounded-xl p-3 border border-[#1b1b26]"
                    style={{ backgroundColor: bg + '55' }}
                  >
                    <p className="text-base font-bold leading-tight" style={{ color }}>{val}</p>
                    <p className="text-[#55556d] text-[10px] mt-0.5">{label}</p>
                  </div>
                ))}
              </div>


              {/* Liste élèves */}
              <div className="overflow-y-auto flex-1" style={{ maxHeight: 400 }}>
                {csEleves.map((eleve) => {
                  const present = csRecord.presents.includes(eleve.id);
                  return (
                    <div
                      key={eleve.id}
                      className="flex items-center gap-3 px-4 py-2.5 border-b border-[#1b1b26] last:border-0 hover:bg-[#0c0c11] transition-colors"
                    >
                      <MiniAvatar eleve={eleve} />

                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">
                          {eleve.nom} {eleve.prenom}
                        </p>
                        <p className="text-[#44445a] text-[10px] mt-0.5">{eleve.option}</p>
                      </div>

                      {/* Statut */}
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full border shrink-0"
                        style={present
                          ? { color: '#4ade80', backgroundColor: '#12241c00', borderColor: '#1b3d2b00' }
                          : { color: '#f43f5e', backgroundColor: '#29141500', borderColor: '#441d2200' }
                        }
                      >
                        {present ? ' Présent' : ' Absent'}
                      </span>

                      {/* Voir suivi individuel */}
                      <button
                        onClick={() => setViewEleve(eleve)}
                        title="Voir le suivi individuel"
                        className="p-1.5 rounded-lg text-[#44445a] hover:text-[#38bdf8] hover:bg-[#0c1f2e] transition-all shrink-0"
                      >
                        <Eye size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ═══ MODAL VUE INDIVIDUELLE ═══ */}
      {viewEleve && (
        <StudentViewModal
          eleve={viewEleve}
          records={records}
          onClose={() => setViewEleve(null)}
        />
      )}
    </div>
  );
}