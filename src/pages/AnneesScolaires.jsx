import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  X,
  Users,
  Save,
  AlertCircle,
  ChevronRight,
  CalendarDays,
  Clock,
  Flag,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Play,
  Pause,
  Calendar,
  Filter
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
function FormInput({ label, type = 'text', value, onChange, placeholder, required = false, icon: Icon }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-[#a0a0b0] uppercase tracking-wider">
        {label} {required && <span className="text-[#f43f5e]">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#55556d]">
            <Icon size={16} />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`w-full bg-[#09090e] border border-[#222233] rounded-xl text-sm text-white placeholder-[#44445a] outline-none focus:border-[#4ade80] transition-colors ${Icon ? 'pl-10' : 'pl-3.5'} pr-3.5 py-2.5`}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function AnneesScolaires() {
  const { annees: years, eleves: elevesList, inscriptions, loading, error, reload } = useSchoolData({
    keys: ['anneeScolaire', 'eleve', 'inscription', 'classe', 'option'],
  });

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Modals
  const [modalAdd, setModalAdd] = useState(false);
  const [modalEdit, setModalEdit] = useState(null);
  const [modalDelete, setModalDelete] = useState(null);

  // Données élèves
  const eleves = elevesList || [];

  // Horloge temps réel
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Stats par année ───────────────────────────────────────────────────────
  const statsParAnnee = useMemo(() => {
    const stats = {};
    years.forEach((y) => {
      const insAnnee = inscriptions.filter((i) => i.anneeScolaireId === y.id);
      const eleveIds = new Set(insAnnee.map((i) => i.eleveId));
      const elevesAnnee = eleves.filter((e) => eleveIds.has(e.id));
      const total = elevesAnnee.length;
      const garcons = elevesAnnee.filter((e) => e.sexe === 'M').length;
      const filles = elevesAnnee.filter((e) => e.sexe === 'F').length;
      stats[y.id] = { total, garcons, filles };
    });
    return stats;
  }, [years, eleves, inscriptions]);

  // ── Calculs timeline ──────────────────────────────────────────────────────
  const today = new Date();

  const timelineData = useMemo(() => {
    if (years.length === 0) return null;

    // Trouver la plage globale
    const allStarts = years.map((y) => new Date(y.startDate).getTime());
    const allEnds = years.map((y) => new Date(y.endDate).getTime());
    const minTime = Math.min(...allStarts);
    const maxTime = Math.max(...allEnds);
    const totalDuration = maxTime - minTime;

    // Année en cours
    const currentYear = years.find((y) => {
      const s = new Date(y.startDate).getTime();
      const e = new Date(y.endDate).getTime();
      const now = today.getTime();
      return now >= s && now <= e;
    });

    // Calcul positions et progressions
    return years.map((y) => {
      const s = new Date(y.startDate).getTime();
      const e = new Date(y.endDate).getTime();
      const leftPct = ((s - minTime) / totalDuration) * 100;
      const widthPct = ((e - s) / totalDuration) * 100;
      const isCurrent = currentYear?.id === y.id;
      const progress = isCurrent
        ? Math.min(100, Math.max(0, ((today.getTime() - s) / (e - s)) * 100))
        : today.getTime() > e ? 100 : 0;
      const isPast = today.getTime() > e;
      const isFuture = today.getTime() < s;

      return { ...y, leftPct, widthPct, isCurrent, progress, isPast, isFuture };
    });
  }, [years, today]);

  // ── Filtres ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let data = [...years];
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((y) =>
        y.label.toLowerCase().includes(q) ||
        y.startDate.includes(q) ||
        y.endDate.includes(q)
      );
    }
    return data;
  }, [years, search]);

  // ── Formulaires ───────────────────────────────────────────────────────────
  const [formAdd, setFormAdd] = useState({
    label: '', startDate: '', endDate: '', color: '#4ade80'
  });
  const [formEdit, setFormEdit] = useState({});

  const handleAddChange = (field, value) => setFormAdd((f) => ({ ...f, [field]: value }));
  const handleEditChange = (field, value) => setFormEdit((f) => ({ ...f, [field]: value }));

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await createOne('anneeScolaire', {
        designation: formAdd.label,
        dateDebut: formAdd.startDate,
        dateFin: formAdd.endDate,
        estActive: false,
      });
      await reload();
      setModalAdd(false);
      setFormAdd({ label: '', startDate: '', endDate: '', color: '#4ade80' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateOne('anneeScolaire', modalEdit.id, {
        designation: formEdit.label ?? formEdit.designation,
        dateDebut: formEdit.startDate ?? formEdit.dateDebut,
        dateFin: formEdit.endDate ?? formEdit.dateFin,
        estActive: formEdit.estActive ?? false,
      });
      await reload();
      setModalEdit(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteOne('anneeScolaire', modalDelete.id);
      await reload();
    } catch (err) {
      console.error(err);
    }
    setModalDelete(null);
  };

  const openEdit = (year) => {
    setFormEdit({ ...year });
    setModalEdit(year);
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const fmtDateShort = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

  // ── Rendu ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090e] text-white p-8 pl-12 flex items-center justify-center">
        <p className="text-[#62627a]">Chargement des années scolaires…</p>
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
          HEADER — Titre + Horloge du jour (coin supérieur droit)
      ════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-sans">
            Années scolaires
          </h1>
          <p className="text-[#62627a] text-sm mt-1">
            <span className="text-white font-semibold">{years.length}</span> années enregistrées ·{' '}
            <span className="text-white font-semibold">{eleves.length}</span> élèves au total
          </p>
        </div>

        {/* Horloge du jour — coin supérieur droit */}
        <div className="flex items-center gap-5">
          <div className="flex flex-col items-end">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-bold text-white tracking-tight leading-none">
                {currentTime.getDate()}
              </span>
            </div>
            <span className="text-xs font-semibold text-[#62627a] uppercase tracking-widest mt-1">
              {currentTime.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </span>
            <span className="text-[10px] text-[#44445a] font-mono mt-0.5">
              {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-[#111116] border border-[#222233] flex items-center justify-center">
            <CalendarDays size={24} className="text-[#4ade80]" />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          BARRE D'OUTILS — Recherche + Bouton Ajouter
      ════════════════════════════════════════════════════════════════════ */}
      <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-5 mb-6">
        <div className="flex flex-col xl:flex-row xl:items-center gap-4">
          {/* Recherche */}
          <div className="relative flex items-center bg-[#09090e] border border-[#222233] rounded-xl px-3.5 py-2.5 group focus-within:border-[#4ade80] transition-colors flex-1 max-w-md">
            <Search size={18} className="text-[#55556d] group-focus-within:text-[#4ade80] transition-colors" />
            <input
              type="text"
              placeholder="Rechercher une année scolaire..."
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

          <button
            onClick={() => setModalAdd(true)}
                   className="flex items-center gap-2.5 px-6 py-3.5 text-sm  transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background:  '#4ade80',
                color:       '#09090e'
      
              }}
          >
            <Plus size={18} />
            <span>Ajouter une année</span>
          </button>
        </div>
      </div>

 {/* ═══════════════════════════════════════════════════════════════════
    DIAGRAMME DE GANTT — v2  (remplace l'ancien bloc entier)
    Dépendances identiques : Play, CheckCircle2, Pause, Flag, fmtDateShort,
    openEdit, timelineData, years, today
═══════════════════════════════════════════════════════════════════ */}
<div className="bg-[#0c0c13] border border-[#181824] rounded-2xl overflow-hidden mb-6">

  {/* ── En-tête ───────────────────────────────────────────────────── */}
  <div className="flex items-center justify-between px-7 py-5 border-b border-[#141420]">
    <div>
      <h2 className="text-white font-semibold text-[15px] tracking-tight">
        Timeline des années scolaires
      </h2>
      <p className="text-[#36364e] text-xs mt-0.5">
        Vue chronologique des périodes académiques
      </p>
    </div>

    <div className="flex items-center gap-5">
      {[
        { bg: '#4ade80',                       label: 'En cours' },
        { bg: '#55556d',                       label: 'Terminée' },
        { bg: '#1e1e2c', ring: true,           label: 'À venir'  },
      ].map(({ bg, ring, label }) => (
        <span key={label} className="flex items-center gap-2 text-[11px] text-[#44445e]">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{
              backgroundColor: bg,
              ...(ring && { boxShadow: '0 0 0 1px #3a3a52' }),
            }}
          />
          {label}
        </span>
      ))}
    </div>
  </div>

  {/* ── Corps Gantt ───────────────────────────────────────────────── */}
  {timelineData && (() => {
    /* ── Constantes de layout ── */
    const ROW_H   = 88;            // hauteur par ligne (px)
    const BAR_H   = 54;            // hauteur de barre  (px)
    const BAR_OFF = (ROW_H - BAR_H) / 2;  // offset vertical barre
    const H_DATE  = 30;            // hauteur du header dates (px)
    const LBL_W   = 160;           // largeur colonne labels  (px)

    /* ── Bornes temporelles ── */
    const ts        = (d) => new Date(d).getTime();
    const minTime   = Math.min(...years.map((y) => ts(y.startDate)));
    const maxTime   = Math.max(...years.map((y) => ts(y.endDate)));
    const totalMs   = maxTime - minTime;
    const spanDays  = totalMs / 86_400_000;

    /* ── Ticks adaptatifs selon la durée totale ── */
    const tickCount =
      spanDays <  120 ?  4 :
      spanDays <  365 ?  6 :
      spanDays <  730 ?  8 : 10;

    const ticks = Array.from({ length: tickCount + 1 }, (_, i) => ({
      pct:   (i / tickCount) * 100,
      label: new Date(minTime + (totalMs * i) / tickCount)
               .toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
    }));

    /* ── Ligne Aujourd'hui ── */
    const now      = today.getTime();
    const todayPct =
      now >= minTime && now <= maxTime
        ? ((now - minTime) / totalMs) * 100
        : null;

    return (
      <div className="flex">

        {/* ══════════════════════════════════
            COLONNE LABELS (gauche, fixe)
        ══════════════════════════════════ */}
        <div
          className="shrink-0 border-r border-[#111120]"
          style={{ width: LBL_W, paddingTop: H_DATE }}
        >
          {timelineData.map((y) => (
            <div
              key={y.id}
              className="flex flex-col justify-center px-5 border-b border-[#111120] last:border-b-0"
              style={{ height: ROW_H }}
            >
              {/* Nom de l'année */}
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="shrink-0 rounded-full"
                  style={{
                    width: 7, height: 7,
                    backgroundColor: y.color,
                    opacity:   y.isCurrent ? 1 : y.isPast ? 0.5 : 0.2,
                    boxShadow: y.isCurrent ? `0 0 8px ${y.color}90` : 'none',
                  }}
                />
                <span className="text-[13px] font-semibold text-white truncate leading-tight">
                  {y.label}
                </span>
              </div>

              {/* Sous-titre statut */}
              <p
                className="text-[11px] leading-tight mt-1 truncate"
                style={{
                  paddingLeft: 15,
                  color: y.isCurrent ? `${y.color}99` : '#2e2e44',
                }}
              >
                {y.isCurrent
                  ? `${Math.round(y.progress)} % accompli`
                  : y.isPast ? 'Terminée'
                  : 'À venir'}
              </p>
            </div>
          ))}
        </div>

        {/* ══════════════════════════════════
            ZONE TIMELINE (droite, flexible)
        ══════════════════════════════════ */}
        <div className="relative flex-1 min-w-0">

          {/* ── Header dates ── */}
          <div
            className="relative border-b border-[#111120]"
            style={{ height: H_DATE }}
          >
            {ticks.map((tick, i) => (
              <span
                key={i}
                className="absolute bottom-2 text-[10px] font-mono text-[#2e2e46] whitespace-nowrap select-none"
                style={{
                  left:         i === tickCount ? undefined : `${tick.pct}%`,
                  right:        i === tickCount ? 0         : undefined,
                  transform:    (i === 0 || i === tickCount) ? 'none' : 'translateX(-50%)',
                  paddingLeft:  i === 0         ? 4 : undefined,
                  paddingRight: i === tickCount ? 4 : undefined,
                }}
              >
                {tick.label}
              </span>
            ))}
          </div>

          {/* ── Zone barres ── */}
          <div
            className="relative"
            style={{ height: years.length * ROW_H }}
          >
            {/* Grille verticale */}
            {ticks.map((tick, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{
                  left:            `${tick.pct}%`,
                  width:           1,
                  backgroundColor: (i === 0 || i === tickCount) ? '#20202e' : '#101020',
                }}
              />
            ))}

            {/* Séparateurs horizontaux entre lignes */}
            {timelineData.map((_, idx) =>
              idx > 0 ? (
                <div
                  key={`sep-${idx}`}
                  className="absolute left-0 right-0 pointer-events-none"
                  style={{ top: idx * ROW_H, height: 1, backgroundColor: '#0e0e18' }}
                />
              ) : null
            )}

            {/* ════════════════════
                BARRES GANTT
            ════════════════════ */}
            {timelineData.map((y, idx) => (
              <div
                key={y.id}
                className="absolute"
                style={{
                  top:    idx * ROW_H + BAR_OFF,
                  left:   `${y.leftPct}%`,
                  width:  `${y.widthPct}%`,
                  height: BAR_H,
                }}
              >
                {/* mx-1 → petit gap de 4 px de chaque côté par rapport à la grille */}
                <div
                  className="relative h-full mx-1 rounded-xl overflow-hidden cursor-pointer
                             transition-all duration-200 hover:brightness-110 active:scale-y-[.97]"
                  style={{
                    backgroundColor: `${y.color}0c`,
                    border: `1.5px solid ${y.color}${
                      y.isCurrent ? '52' : y.isPast ? '28' : '18'
                    }`,
                  }}
                  onClick={() => openEdit(y)}
                >
                  {/* Fond de progression (dégradé vers la droite) */}
                  <div
                    className="absolute inset-y-0 left-0 transition-all duration-700"
                    style={{
                      width: `${y.progress}%`,
                      background: `linear-gradient(90deg,
                        ${y.color}${y.isCurrent ? '3c' : y.isPast ? '28' : '10'} 0%,
                        transparent 100%)`,
                    }}
                  />

                  {/* Trait d'accentuation gauche */}
                  <div
                    className="absolute top-2.5 bottom-2.5 left-0"
                    style={{
                      width:           3,
                      backgroundColor: y.color,
                      opacity:         y.isCurrent ? 0.92 : y.isPast ? 0.42 : 0.18,
                      borderRadius:    '0 3px 3px 0',
                    }}
                  />

                  {/* Contenu : dates + badge */}
                  <div className="relative z-10 flex items-center justify-between h-full pl-5 pr-3 gap-2 min-w-0">

                    {/* Plage de dates */}
                    <span
                      className="text-[11px] tracking-wide truncate"
                      style={{
                        color: '#ffffff',
                      }}
                    >
                      {fmtDateShort(y.startDate)} → {fmtDateShort(y.endDate)}
                    </span>

                    {/* Badge statut / progression */}
                    {y.isCurrent ? (
                      <div
                        className="flex items-center gap-1.5 px-2.5 rounded-full text-[11px] font-bold shrink-0"
                        style={{
                          paddingTop: 5, paddingBottom: 5,
                          backgroundColor: `${y.color}20`,
                          color:           '#ffffff',
                          border:          `1px solid ${y.color}42`,
                        }}
                      >
                        <Flag size={9} />
                        {Math.round(y.progress)} %
                      </div>
                    ) : y.isPast ? (
                      <div
                        className="flex items-center gap-1.5 px-2.5 rounded-full text-[11px] shrink-0"
                        style={{
                          paddingTop: 5, paddingBottom: 5,
                          backgroundColor: `${y.color}13`,
                          color:           '#ffffff',
                        }}
                      >
                        <CheckCircle2 size={10} />
                        100 %
                      </div>
                    ) : (
                      <span
                        className="text-[10px] px-2.5 rounded-full shrink-0"
                        style={{
                          paddingTop: 4, paddingBottom: 4,
                          backgroundColor: '#14141e',
                          color:           '#32324a',
                        }}
                      >
                        À venir
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Indicateur "Aujourd'hui" (traverse header + barres) ── */}
          {todayPct !== null && (
            <div
              className="absolute top-0 bottom-0 z-20 pointer-events-none"
              style={{ left: `${todayPct}%` }}
            >
              {/* Trait vertical */}
              <div
                className="absolute inset-y-0"
                style={{
                  left:       0,
                  width:      1.5,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.35) 100%)',
                }}
              />
              {/* Label dans le header dates */}
              <div
                className="absolute px-2 rounded-full text-[10px] font-bold bg-white text-[#09090e] whitespace-nowrap"
                style={{
                  top:       6,
                  left:      '50%',
                  transform: 'translateX(-50%)',
                  paddingTop: 2, paddingBottom: 2,
                  boxShadow: '0 1px 8px rgba(0,0,0,0.5)',
                }}
              >
                Aujourd'hui
              </div>
            </div>
          )}

        </div>{/* fin zone timeline */}
      </div>
    );
  })()}

</div>
      {/* ════════════════════════════════════════════════════════════════════
          TABLEAU DES ANNÉES SCOLAIRES
      ════════════════════════════════════════════════════════════════════ */}
      <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#1b1b26]">
                <th className="px-5 py-4 text-[11px] font-bold text-[#62627a] uppercase tracking-wider">Année</th>
                <th className="px-5 py-4 text-[11px] font-bold text-[#62627a] uppercase tracking-wider">Période</th>
                <th className="px-5 py-4 text-[11px] font-bold text-[#62627a] uppercase tracking-wider">Progression</th>
                <th className="px-5 py-4 text-[11px] font-bold text-[#62627a] uppercase tracking-wider">Élèves inscrits</th>
                <th className="px-5 py-4 text-[11px] font-bold text-[#62627a] uppercase tracking-wider">Statut</th>
                <th className="px-5 py-4 text-[11px] font-bold text-[#62627a] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b1b26]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-[#62627a]">
                    <CalendarDays size={32} className="mx-auto mb-3 text-[#44445a]" />
                    <p className="text-sm">Aucune année scolaire ne correspond à vos critères.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((year) => {
                  const s = new Date(year.startDate).getTime();
                  const e = new Date(year.endDate).getTime();
                  const now = today.getTime();
                  const isCurrent = now >= s && now <= e;
                  const isPast = now > e;
                  const progress = isCurrent
                    ? Math.min(100, Math.max(0, ((now - s) / (e - s)) * 100))
                    : isPast ? 100 : 0;
                  const stats = statsParAnnee[year.id] || { total: 0, garcons: 0, filles: 0 };

                  return (
                    <tr key={year.id} className="group hover:bg-[#16161c] transition-colors">
                      {/* Année */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-white">{year.label}</span>
                        </div>
                      </td>

                      {/* Période */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-[#a0a0b0]">{fmtDate(year.startDate)}</span>
                          <span className="text-xs text-[#62627a]">{fmtDate(year.endDate)}</span>
                        </div>
                      </td>

                      {/* Progression */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1.5 min-w-[140px]">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[#62627a]">
                              {isCurrent ? 'En cours' : isPast ? 'Terminée' : 'À venir'}
                            </span>
                            <span className="font-bold" style={{ color: year.color }}>{Math.round(progress)}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-[#1b1b26] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${progress}%`, backgroundColor: year.color }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Élèves */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-[#55556d]" />
                          <span className="text-sm font-bold text-white">{stats.total}</span>
                          <span className="text-xs text-[#62627a]">élève{stats.total > 1 ? 's' : ''}</span>
                        </div>
                        {stats.total > 0 && (
                          <div className="flex items-center gap-2 mt-1 text-[10px]">
                            <span className="text-[#22c55e]">♂ {stats.garcons}</span>
                            <span className="text-[#f9a8d4]">♀ {stats.filles}</span>
                          </div>
                        )}
                      </td>

                      {/* Statut */}
                      <td className="px-5 py-4">
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#12241c] text-[#4ade80] border border-[#1b3d2b]">
                            <Play size={10} /> En cours
                          </span>
                        ) : isPast ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#1a1a26] text-[#62627a] border border-[#2d2d3f]">
                            <CheckCircle2 size={10} /> Terminée
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#132c3f] text-[#38bdf8] border border-[#1b3d5c]">
                            <Pause size={10} /> À venir
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(year)}
                            className="p-2 rounded-lg bg-[#1e1b4b]/40 border border-[#2e2b6b]/30 text-[#818cf8] hover:bg-[#1e1b4b] hover:text-white transition-all"
                            title="Modifier"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => setModalDelete(year)}
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

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1b1b26] flex items-center justify-between">
          <span className="text-xs text-[#62627a]">
            Affichage de <span className="text-white font-semibold">{filtered.length}</span> sur <span className="text-white font-semibold">{years.length}</span> années
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#44445a]">
              En cours : <span className="text-[#4ade80] font-bold">{years.filter((y) => { const s = new Date(y.startDate).getTime(); const e = new Date(y.endDate).getTime(); const n = today.getTime(); return n >= s && n <= e; }).length}</span>
            </span>
            <span className="text-[11px] text-[#44445a]">
              Terminées : <span className="text-[#62627a] font-bold">{years.filter((y) => new Date(y.endDate).getTime() < today.getTime()).length}</span>
            </span>
            <span className="text-[11px] text-[#44445a]">
              À venir : <span className="text-[#38bdf8] font-bold">{years.filter((y) => new Date(y.startDate).getTime() > today.getTime()).length}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          MODAL — AJOUTER UNE ANNÉE
      ════════════════════════════════════════════════════════════════════ */}
      <Modal isOpen={modalAdd} onClose={() => setModalAdd(false)} title="Ajouter une année scolaire" maxWidth="max-w-lg">
        <form onSubmit={handleAddSubmit} className="space-y-5">
          <FormInput label="Désignation" value={formAdd.label} onChange={(e) => handleAddChange('label', e.target.value)} placeholder="Ex: 2026-2027" required icon={CalendarDays} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput label="Date de début" type="date" value={formAdd.startDate} onChange={(e) => handleAddChange('startDate', e.target.value)} required icon={Calendar} />
            <FormInput label="Date de fin" type="date" value={formAdd.endDate} onChange={(e) => handleAddChange('endDate', e.target.value)} required icon={Calendar} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#a0a0b0] uppercase tracking-wider">Couleur</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={formAdd.color}
                onChange={(e) => handleAddChange('color', e.target.value)}
                className="w-10 h-10 rounded-lg bg-transparent border border-[#222233] cursor-pointer"
              />
              <span className="text-xs text-[#62627a] font-mono">{formAdd.color}</span>
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
          MODAL — MODIFIER UNE ANNÉE
      ════════════════════════════════════════════════════════════════════ */}
      <Modal isOpen={!!modalEdit} onClose={() => setModalEdit(null)} title="Modifier l'année scolaire" maxWidth="max-w-lg">
        {modalEdit && (
          <form onSubmit={handleEditSubmit} className="space-y-5">
            <FormInput label="Désignation" value={formEdit.label || ''} onChange={(e) => handleEditChange('label', e.target.value)} required icon={CalendarDays} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput label="Date de début" type="date" value={formEdit.startDate || ''} onChange={(e) => handleEditChange('startDate', e.target.value)} required icon={Calendar} />
              <FormInput label="Date de fin" type="date" value={formEdit.endDate || ''} onChange={(e) => handleEditChange('endDate', e.target.value)} required icon={Calendar} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#a0a0b0] uppercase tracking-wider">Couleur</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formEdit.color || '#4ade80'}
                  onChange={(e) => handleEditChange('color', e.target.value)}
                  className="w-10 h-10 rounded-lg bg-transparent border border-[#222233] cursor-pointer"
                />
                <span className="text-xs text-[#62627a] font-mono">{formEdit.color}</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1b1b26]">
              <button type="button" onClick={() => setModalEdit(null)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#a0a0b0] hover:text-white hover:bg-[#1a1a26] transition-colors">
                Annuler
              </button>
              <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-[#4ade80] text-[#09090e] border border-[#2e2b6b] transition-all">
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
                  Vous êtes sur le point de supprimer l'année scolaire :
                </p>
                <p className="text-lg font-bold text-white mt-1">{modalDelete.label}</p>
                <p className="text-xs text-[#62627a] mt-0.5">{fmtDate(modalDelete.startDate)} – {fmtDate(modalDelete.endDate)}</p>
              </div>
            </div>
            <div className="bg-[#3b1820]/30 border border-[#441d22]/40 rounded-xl p-4">
              <p className="text-xs text-[#f43f5e] font-medium">
                Cette action est irréversible. Les élèves et données associées à cette année ne seront pas supprimés, mais l'année scolaire ne sera plus référencée.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setModalDelete(null)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#a0a0b0] hover:text-white hover:bg-[#1a1a26] transition-colors">
                Annuler
              </button>
              <button onClick={handleDelete} className="flex items-center gap-2 px-6 py-2.5  text-sm  bg-[#3b1820] text-[#f43f5e] border border-[#441d22] hover:bg-[#4a2028] hover:text-white transition-all">
                <Trash2 size={16} />
                Supprimer définitivement
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
