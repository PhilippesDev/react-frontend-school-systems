// ═══════════════════════════════════════════════════════════════════════════════
//  Cours.jsx — Module pédagogique complet
//  Tab 1 : Tableau de bord  |  Tab 2 : Administration (Cours + Affectations)
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, Filter, Plus, X, Check, Pencil, Trash2,
  ChevronDown, AlertCircle, CheckCircle2, BookOpen,
  Users, School, Clock, TrendingUp, Activity,
  GraduationCap, ChevronLeft, ChevronRight,
  LayoutDashboard, Sliders, BookMarked, Link2,
} from 'lucide-react';
import { useSchoolData } from '../hooks/useSchoolData';
import { createOne, updateOne, deleteOne } from '../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

// ─────────────────────────────────────────────────────────────────────────────
//  DONNÉES — chargées depuis l'API via useSchoolData
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE  = 9;

// ─────────────────────────────────────────────────────────────────────────────
//  COULEURS & HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const ABBR_BG   = ['#132c3f','#2e163d','#1e1b4b','#3c2a16','#103024','#3b1820','#0c2018','#1a1030'];
const ABBR_TEXT = ['#38bdf8','#c084fc','#818cf8','#fbbf24','#4ade80','#f43f5e','#34d399','#a78bfa'];
const TEACHER_COLORS = ['#4ade80','#38bdf8','#818cf8','#c084fc','#fbbf24','#f97316','#f43f5e','#14b8a6'];

const getCoursBg   = (id) => ABBR_BG[(id - 1) % ABBR_BG.length];
const getCoursText = (id) => ABBR_TEXT[(id - 1) % ABBR_TEXT.length];

const getProg = (pct) => {
  if (pct === 0)    return { color:'#f43f5e', bg:'#291415', border:'#441d22', label:'Non démarré'     };
  if (pct < 30)     return { color:'#f97316', bg:'#2a1200', border:'#3d1f08', label:'Débutant'        };
  if (pct < 60)     return { color:'#fbbf24', bg:'#2a1f0a', border:'#3d2e12', label:'En cours'        };
  if (pct < 85)     return { color:'#38bdf8', bg:'#0c1f2e', border:'#1a3548', label:'Avancé'          };
  if (pct < 100)    return { color:'#818cf8', bg:'#1e1b4b', border:'#2d2567', label:'Bientôt terminé' };
  return            { color:'#4ade80', bg:'#12241c', border:'#1b3d2b', label:'Terminé'            };
};

// ─────────────────────────────────────────────────────────────────────────────
//  SHARED UI  (même patterns que Eleves.jsx)
// ─────────────────────────────────────────────────────────────────────────────

const Overlay = ({ onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ backgroundColor:'rgba(9,9,14,0.88)', backdropFilter:'blur(6px)' }}>
    <div className="absolute inset-0" onClick={onClose} />
    <div className="relative z-10 w-full flex items-center justify-center">{children}</div>
  </div>
);

const Field = ({ label, required, error, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-bold uppercase tracking-widest text-[#44445a]">
      {label}{required && <span className="text-[#f43f5e] ml-0.5">*</span>}
    </label>
    {children}
    {error && <p className="text-[#f43f5e] text-[10px] mt-0.5">{error}</p>}
  </div>
);

const TxtInput = ({ value, onChange, placeholder, type='text' }) => (
  <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    className="bg-[#09090e] border border-[#222233] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#44445a] focus:outline-none focus:border-[#4ade80] transition-colors w-full" />
);

const SelInput = ({ value, onChange, options, placeholder }) => (
  <div className="relative">
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full bg-[#09090e] border border-[#222233] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#4ade80] transition-colors appearance-none cursor-pointer">
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => {
        const v = typeof o === 'string' ? o : o.value;
        const l = typeof o === 'string' ? o : o.label;
        return <option key={v} value={v}>{l}</option>;
      })}
    </select>
    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#44445a] pointer-events-none" />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
//  TOAST NOTIFICATION
// ─────────────────────────────────────────────────────────────────────────────

const Toast = ({ toast }) => {
  if (!toast) return null;
  const isErr = toast.type === 'error';
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl animate-[slideUp_0.3s_ease]"
      style={{
        backgroundColor: isErr ? '#1e0a0b' : '#0d1f15',
        borderColor:     isErr ? '#441d22' : '#1b3d2b',
      }}>
      {isErr
        ? <AlertCircle size={16} className="text-[#f43f5e] shrink-0" />
        : <CheckCircle2 size={16} className="text-[#4ade80] shrink-0" />}
      <span className="text-sm font-medium text-white">{toast.msg}</span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  PROGRESS BAND — barre large (style bande, avec texte intégré)
// ─────────────────────────────────────────────────────────────────────────────

const ProgressBand = ({ realized, planned }) => {
  const pct = planned > 0 ? Math.min(100, Math.round((realized / planned) * 100)) : 0;
  const { color, bg, border, label } = getProg(pct);
  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-widest font-bold text-[#44445a]">Avancement des heures</span>
        <span className="text-xs font-bold" style={{ color }}>{realized}h / {planned}h</span>
      </div>

      {/* ── LA BANDE LARGE ── */}
      <div className="relative overflow-hidden rounded-xl" style={{ height: 26 }}>
        <div className="absolute inset-0 rounded-xl bg-[#1a1a26]" />
        <div className="absolute inset-y-0 left-0 rounded-xl transition-all duration-700"
          style={{ width:`${pct}%`, backgroundColor:color, opacity:0.75 }} />
        {/* Shimmer line */}
        {pct > 0 && pct < 100 && (
          <div className="absolute inset-y-0 pointer-events-none rounded-r-full"
            style={{ left:`${pct}%`, width:2, backgroundColor:'rgba(255,255,255,0.25)', transform:'translateX(-1px)' }} />
        )}
        <div className="absolute inset-0 flex items-center justify-between px-4">
          <span className="text-[11px] font-bold"
            style={{ color: pct > 40 ? 'rgba(255,255,255,0.9)' : color }}>
            {pct}% réalisé
          </span>
          {planned - realized > 0 && (
            <span className="text-[10px] font-medium" style={{ color:'rgba(255,255,255,0.35)' }}>
              {planned - realized}h restantes
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-1">
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
          style={{ color, backgroundColor:bg, borderColor:border }}>{label}</span>
        {pct >= 100 && <CheckCircle2 size={10} style={{ color:'#4ade80' }} />}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  MODAL : SUPPRESSION (générique)
// ─────────────────────────────────────────────────────────────────────────────

const DeleteModal = ({ title, subtitle, itemLabel, itemSub, onClose, onConfirm }) => (
  <Overlay onClose={onClose}>
    <div className="bg-[#111116] border border-[#441d22] rounded-2xl w-full max-w-sm">
      <div className="p-7 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#291415] flex items-center justify-center mx-auto mb-5">
          <Trash2 size={24} className="text-[#f43f5e]" />
        </div>
        <h3 className="text-white font-bold text-lg mb-1">{title}</h3>
        <p className="text-[#62627a] text-sm mb-5">{subtitle}</p>
        <div className="bg-[#09090e] border border-[#222233] rounded-xl p-3.5 mb-4 text-left">
          <p className="text-white font-semibold text-sm">{itemLabel}</p>
          {itemSub && <p className="text-[#55556d] text-xs mt-0.5">{itemSub}</p>}
        </div>
        <div className="bg-[#1e0a0b] border border-[#441d22] rounded-xl px-4 py-2.5 mb-6 flex items-center gap-2">
          <AlertCircle size={14} className="text-[#f43f5e] shrink-0" />
          <p className="text-[#f43f5e] text-xs text-left">Cette action est irréversible.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#222233] text-[#a0a0b0] hover:bg-[#1a1a26] hover:text-white transition-colors text-sm font-medium">Annuler</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-[#f43f5e] text-white hover:bg-[#e11d48] transition-colors text-sm font-bold">Oui, supprimer</button>
        </div>
      </div>
    </div>
  </Overlay>
);

// ─────────────────────────────────────────────────────────────────────────────
//  DASHBOARD PÉDAGOGIQUE
// ─────────────────────────────────────────────────────────────────────────────

const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#161620] border border-[#2d2d3f] rounded-xl px-4 py-3">
      <p className="text-xs font-bold text-white mb-2">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="text-[11px] font-semibold" style={{ color:p.fill }}>
          {p.name} : {p.value}h
        </p>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-[#161620] border rounded-xl px-3 py-2.5" style={{ borderColor:`${d.payload.color}40` }}>
      <p className="text-xs font-bold mb-0.5" style={{ color:d.payload.color }}>{d.name}</p>
      <p className="text-white text-sm font-semibold">{d.value} affectation{d.value > 1 ? 's':''}</p>
    </div>
  );
};

const DashboardTab = ({ cours, affectations }) => {
  const coursById = useMemo(() => Object.fromEntries(cours.map(c => [c.id, c])), [cours]);

  // KPI stats
  const totalCours   = cours.length;
  const totalEnseig  = [...new Set(affectations.map(a => a.enseignant))].length;
  const totalClasses = [...new Set(affectations.map(a => a.classe))].length;
  const totalHPrev   = affectations.reduce((s, a) => s + a.heuresPrevues, 0);
  const totalHReal   = affectations.reduce((s, a) => s + a.heuresRealisees, 0);
  const globalTaux   = totalHPrev > 0 ? Math.round((totalHReal / totalHPrev) * 100) : 0;

  const kpis = [
    { label:'Cours au programme', value:totalCours,   sub:`${totalClasses} classes couvertes`,  icon:BookOpen,      iconBg:'#1e1b4b', iconCol:'#818cf8' },
    { label:'Enseignants actifs',  value:totalEnseig,  sub:`${affectations.filter(a=>a.actif).length} affectations actives`, icon:GraduationCap, iconBg:'#0c1f2e', iconCol:'#38bdf8' },
    { label:'Heures prévues',      value:`${totalHPrev}h`, sub:`${totalHReal}h réalisées`,      icon:Clock,         iconBg:'#3c2a16', iconCol:'#fbbf24' },
    { label:'Taux global',         value:`${globalTaux}%`, sub:'Avancement des programmes',     icon:TrendingUp,    iconBg:'#12241c', iconCol:'#4ade80' },
  ];

  // BarChart data — heures par classe
  const classeData = useMemo(() => {
    const classes = [...new Set(affectations.filter(a=>a.actif).map(a => a.classe))].sort();
    return classes.map(cl => {
      const afs = affectations.filter(a => a.classe === cl && a.actif);
      const abbr = cl.replace('ème ','').replace('ère ','').replace(' ','');
      return {
        name: abbr,
        full: cl,
        prévues:   afs.reduce((s,a) => s + a.heuresPrevues,    0),
        réalisées: afs.reduce((s,a) => s + a.heuresRealisees,  0),
      };
    });
  }, [affectations]);

  // PieChart data — affectations par enseignant
  const teacherData = useMemo(() => {
    const counts = {};
    affectations.filter(a=>a.actif).forEach(a => { counts[a.enseignant] = (counts[a.enseignant]||0)+1; });
    return Object.entries(counts).map(([name, value], i) => ({
      name: name.replace('Prof. ',''),
      value,
      color: TEACHER_COLORS[i % TEACHER_COLORS.length],
    }));
  }, [affectations]);

  // Top/Bottom courses by progress
  const progList = useMemo(() => affectations
    .filter(a => a.actif && a.annee === '2025-2026')
    .map(a => ({
      ...a,
      cours: coursById[a.coursId],
      pct: a.heuresPrevues > 0 ? Math.round((a.heuresRealisees/a.heuresPrevues)*100) : 0,
    }))
    .sort((a,b) => b.pct - a.pct)
  , [affectations, coursById]);

  return (
    <div className="space-y-6">

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-5 hover:border-[#2d2d3f] transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor:k.iconBg }}>
                  <Icon size={20} style={{ color:k.iconCol }} />
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight text-white">{k.value}</p>
                  <p className="text-xs text-[#62627a] font-medium mt-0.5">{k.label}</p>
                </div>
              </div>
              <div className="border-t border-dashed border-[#222233] my-4" />
              <p className="text-[11px] text-[#44445a]">{k.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* BarChart : Heures par classe */}
        <div className="lg:col-span-2 bg-[#111116] border border-[#1b1b26] rounded-2xl p-6 flex flex-col">
          <div className="mb-5">
            <h3 className="text-white font-bold text-sm tracking-tight">Heures par classe</h3>
            <p className="text-[#44445a] text-xs mt-0.5">Prévues vs réalisées · Année 2025-2026</p>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={classeData} barSize={14} barGap={3} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                <CartesianGrid vertical={false} stroke="#1b1b26" strokeDasharray="0" />
                <XAxis dataKey="name" tick={{ fill:'#44445a', fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#44445a', fontSize:11 }} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
                <Tooltip content={<BarTooltip />} cursor={{ fill:'rgba(255,255,255,0.03)', radius:[6,6,0,0] }} />
                <Bar dataKey="prévues"   fill="#1b2d3f" radius={[6,6,0,0]} name="Prévues" />
                <Bar dataKey="réalisées" fill="#4ade80" radius={[6,6,0,0]} name="Réalisées" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-5 mt-4 pt-4 border-t border-[#1b1b26]">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#1b2d3f] border border-[#1a3548]"/><span className="text-[11px] text-[#55556d]">Prévues</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#4ade80]"/><span className="text-[11px] text-[#55556d]">Réalisées</span></div>
          </div>
        </div>

        {/* PieChart : Répartition des enseignants */}
        <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-6 flex flex-col">
          <div className="mb-2">
            <h3 className="text-white font-bold text-sm tracking-tight">Charge enseignants</h3>
            <p className="text-[#44445a] text-xs mt-0.5">Affectations actives par prof</p>
          </div>
          <div className="flex items-center justify-center py-2">
            <ResponsiveContainer width="100%" height={175}>
              <PieChart>
                <Pie data={teacherData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value" strokeWidth={0} startAngle={90} endAngle={-270}>
                  {teacherData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-auto space-y-1.5 pt-3 border-t border-[#1b1b26]">
            {teacherData.map(t => (
              <div key={t.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor:t.color }} />
                  <span className="text-[11px] text-[#a0a0b0] truncate max-w-[120px]">{t.name}</span>
                </div>
                <span className="text-[11px] font-bold text-white">{t.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Aperçu avancement programmes ── */}
      <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-white font-bold text-sm tracking-tight">Avancement par cours · 2025-2026</h3>
            <p className="text-[#44445a] text-xs mt-0.5">Classement par taux de progression</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#1b1b26] bg-[#09090e]">
            <Activity size={12} className="text-[#4ade80]" />
            <span className="text-xs font-bold text-white">{globalTaux}%</span>
            <span className="text-[10px] text-[#44445a]">global</span>
          </div>
        </div>

        <div className="space-y-3">
          {progList.map(af => {
            const { color, bg, border, label } = getProg(af.pct);
            const abbrBg   = getCoursBg(af.coursId);
            const abbrText = getCoursText(af.coursId);
            return (
              <div key={af.id} className="flex items-center gap-4">

                {/* Info */}
                <div className="w-24 shrink-0">
                  <p className="text-white text-xs font-semibold truncate">{af.cours?.designation || '—'}</p>
                  <p className="text-[#44445a] text-[10px] mt-0.5 truncate">{af.classe}</p>
                </div>
                {/* Progress band */}
                <div className="flex-1 relative overflow-hidden rounded-lg" style={{ height:22 }}>
                  <div className="absolute inset-0 rounded-lg bg-[#1a1a26]" />
                  <div className="absolute inset-y-0 left-0 rounded-lg transition-all duration-700"
                    style={{ width:`${af.pct}%`, backgroundColor:color, opacity:0.7 }} />
                  <div className="absolute inset-0 flex items-center justify-between px-3">
                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.9)'}}>
                      {af.heuresRealisees}h / {af.heuresPrevues}h
                    </span>
                    <span className="text-[10px] font-bold" style={{ color }}>
                      {af.pct}%
                    </span>
                  </div>
                </div>
                {/* Label */}
                <div className="w-28 shrink-0">
                  <span className="text-[9px] px-2 py-0.5 rounded-full border whitespace-nowrap"
                    style={{ color, backgroundColor:bg, borderColor:border }}>{label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  MODAL : COURS (Ajouter / Modifier)
// ─────────────────────────────────────────────────────────────────────────────

const CoursModal = ({ item, onClose, onSave }) => {
  const isEdit = !!item;
  const [form, setForm] = useState(isEdit ? { designation:item.designation, abbreviation:item.abbreviation } : { designation:'', abbreviation:'' });
  const [errors, setErrors] = useState({});
  const s = k => v => setForm(f => ({ ...f, [k]:v }));

  const save = () => {
    const e = {};
    if (!form.designation.trim())  e.designation  = 'Obligatoire';
    if (!form.abbreviation.trim()) e.abbreviation = 'Obligatoire (max 6 car.)';
    setErrors(e);
    if (Object.keys(e).length) return;
    onSave({ id:isEdit?item.id:Date.now(), designation:form.designation.trim(), abbreviation:form.abbreviation.trim().toUpperCase() });
    onClose();
  };

  const accent = isEdit ? '#818cf8' : '#4ade80';
  const bg     = isEdit ? '#1e1b4b' : '#12241c';
  const btnBg  = isEdit ? '#4f46e5' : '#16a34a';
  const btnTxt = isEdit ? '#fff'    : '#09090e';

  return (
    <Overlay onClose={onClose}>
      <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-6 border-b border-[#1b1b26]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor:bg }}>
              {isEdit ? <Pencil size={17} style={{ color:accent }} /> : <Plus size={17} style={{ color:accent }} />}
            </div>
            <div>
              <h2 className="text-white font-bold text-base">{isEdit ? 'Modifier le cours' : 'Nouveau cours'}</h2>
              <p className="text-[#44445a] text-xs mt-0.5">{isEdit ? item.designation : 'Définir désignation et abréviation'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#1a1a26] text-[#55556d] hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="Désignation" required error={errors.designation}>
            <TxtInput value={form.designation} onChange={s('designation')} placeholder="Ex : Mathématiques" />
          </Field>
          <Field label="Abréviation" required error={errors.abbreviation}>
            <TxtInput value={form.abbreviation} onChange={s('abbreviation')} placeholder="Ex : MATH" />
          </Field>
          {/* Preview badge */}
          {form.abbreviation && (
            <div className="flex items-center gap-3 p-3 bg-[#09090e] rounded-xl border border-[#1b1b26]">
              <div className="w-12 h-10 rounded-xl flex items-center justify-center text-sm font-black"
                style={{ backgroundColor:ABBR_BG[0], color:ABBR_TEXT[0] }}>
                {form.abbreviation.slice(0,6).toUpperCase()}
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{form.designation || '—'}</p>
                <p className="text-[#44445a] text-xs">Aperçu du cours</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#222233] text-[#a0a0b0] hover:bg-[#1a1a26] hover:text-white transition-colors text-sm font-medium">Annuler</button>
          <button onClick={save} className="flex-1 py-2.5  text-sm  flex items-center justify-center gap-2 transition-all" style={{ backgroundColor:btnBg, color:btnTxt }}>
            <Check size={15} />{isEdit ? 'Sauvegarder' : 'Créer le cours'}
          </button>
        </div>
      </div>
    </Overlay>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION : COURS (table + recherche + CRUD)
// ─────────────────────────────────────────────────────────────────────────────

const CoursSection = ({ cours, affectations, onAdd, onEdit, onDelete }) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return cours.filter(c =>
      c.designation.toLowerCase().includes(q) || c.abbreviation.toLowerCase().includes(q)
    );
  }, [cours, search]);

  const affectCount = (id) => affectations.filter(a => a.coursId === id).length;
  const COL = '52px 1fr 100px 140px 120px';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="relative flex items-center bg-[#111116] border border-[#222233] rounded-xl px-3.5 py-2.5 focus-within:border-[#4ade80] transition-colors flex-1 max-w-sm group">
          <Search size={15} className="text-[#55556d] group-focus-within:text-[#4ade80] shrink-0 transition-colors" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un cours..."
            className="bg-transparent border-none outline-none pl-2.5 text-sm text-white placeholder-[#55556d] w-full" />
          {search && <button onClick={() => setSearch('')} className="text-[#55556d] hover:text-white transition-colors"><X size={13} /></button>}
        </div>
        <button onClick={onAdd}
          className="flex items-center gap-2.5 px-5 py-3  text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background:'#4ade80', color:'#09090e' }}>
          <Plus size={16} strokeWidth={2.5} />Nouveau cours
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-[#1b1b26]" style={{ display:'grid', gridTemplateColumns:COL, gap:12, alignItems:'center' }}>
          {['#','Désignation','Abréviation','Affectations','Actions'].map(h => (
            <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-[#44445a]">{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-[#09090e] border border-[#1b1b26] flex items-center justify-center mb-4">
              <BookOpen size={22} className="text-[#2d2d3f]" />
            </div>
            <p className="text-[#44445a] font-semibold text-sm">Aucun cours trouvé</p>
            <p className="text-[#2d2d3f] text-xs mt-1">Modifiez la recherche ou ajoutez un nouveau cours</p>
          </div>
        ) : (
          filtered.map(c => {
            const cnt = affectCount(c.id);
            return (
              <div key={c.id} className="border-b border-[#1b1b26] last:border-0 hover:bg-[#0c0c11] transition-colors"
                style={{ display:'grid', gridTemplateColumns:COL, gap:12, alignItems:'center', padding:'14px 20px' }}>
                <span className="text-[#2d2d3f] text-xs font-mono">{String(c.id).padStart(2,'0')}</span>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-white font-semibold text-sm truncate">{c.designation}</span>
                </div>
                <span className="text-[#a0a0b0] text-xs font-mono font-semibold">{c.abbreviation}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#4ade80]">{cnt}</span>
                  <span className="text-[#44445a] text-[10px]">affectation{cnt>1?'s':''}</span>
                </div>
                <div className="flex items-center gap-1">
                  {[
                    { icon:Pencil, fn:()=>onEdit(c), colH:'#818cf8', bgH:'#1e1b4b', title:'Modifier'  },
                    { icon:Trash2, fn:()=>onDelete(c), colH:'#f43f5e', bgH:'#291415', title:'Supprimer' },
                  ].map(({ icon:Icon, fn, colH, bgH, title }) => (
                    <button key={title} onClick={fn} title={title}
                      className="p-1.5 rounded-lg text-[#44445a] transition-all duration-150"
                      onMouseEnter={e => { e.currentTarget.style.color=colH; e.currentTarget.style.backgroundColor=bgH; }}
                      onMouseLeave={e => { e.currentTarget.style.color=''; e.currentTarget.style.backgroundColor=''; }}>
                      <Icon size={14} />
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#1b1b26]">
          <span className="text-[#44445a] text-xs">{filtered.length} cours</span>
          <span className="text-[#44445a] text-xs">{affectations.length} affectations au total</span>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  MODAL : AFFECTATION (Ajouter / Modifier)
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_AFFECT = { coursId:'', classe:'', enseignant:'', annee:'2025-2026', heuresPrevues:'', heuresRealisees:'0', maxPoints:'100', actif:true };

const AffectModal = ({ item, cours, onClose, onSave }) => {
  const isEdit = !!item;
  const [form, setForm] = useState(isEdit ? {
    coursId:        String(item.coursId),
    classe:         item.classe,
    enseignant:     item.enseignant,
    annee:          item.annee,
    heuresPrevues:  String(item.heuresPrevues),
    heuresRealisees:String(item.heuresRealisees),
    maxPoints:      String(item.maxPoints),
    actif:          item.actif,
  } : { ...EMPTY_AFFECT });
  const [errors, setErrors] = useState({});
  const s = k => v => setForm(f => ({ ...f, [k]:v }));

  const validate = () => {
    const e = {};
    if (!form.coursId)              e.coursId        = 'Obligatoire';
    if (!form.classe)               e.classe         = 'Obligatoire';
    if (!form.enseignant)           e.enseignant     = 'Obligatoire';
    if (!form.annee)                e.annee          = 'Obligatoire';
    if (!form.heuresPrevues || isNaN(Number(form.heuresPrevues)) || Number(form.heuresPrevues) <= 0) e.heuresPrevues = 'Nombre valide requis';
    if (form.heuresRealisees === '' || isNaN(Number(form.heuresRealisees)) || Number(form.heuresRealisees) < 0) e.heuresRealisees = 'Nombre ≥ 0';
    if (Number(form.heuresRealisees) > Number(form.heuresPrevues)) e.heuresRealisees = 'Ne peut pas dépasser les heures prévues';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    onSave({
      id:              isEdit ? item.id : Date.now(),
      coursId:         Number(form.coursId),
      classe:          form.classe,
      enseignant:      form.enseignant,
      annee:           form.annee,
      heuresPrevues:   Number(form.heuresPrevues),
      heuresRealisees: Number(form.heuresRealisees),
      maxPoints:       Number(form.maxPoints) || 100,
      actif:           form.actif,
    });
    onClose();
  };

  const accent = isEdit ? '#818cf8' : '#4ade80';
  const acBg   = isEdit ? '#1e1b4b' : '#12241c';
  const btnBg  = isEdit ? '#4f46e5' : '#16a34a';
  const btnTxt = isEdit ? '#fff'    : '#09090e';
  const pct    = form.heuresPrevues && form.heuresRealisees ? Math.round((Number(form.heuresRealisees)/Number(form.heuresPrevues))*100) : 0;
  const prog   = getProg(Math.min(100, Math.max(0, pct)));

  return (
    <Overlay onClose={onClose}>
      <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#1b1b26]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor:acBg }}>
              <Link2 size={17} style={{ color:accent }} />
            </div>
            <div>
              <h2 className="text-white font-bold text-base">{isEdit ? "Modifier l'affectation" : 'Nouvelle affectation'}</h2>
              <p className="text-[#44445a] text-xs mt-0.5">{isEdit ? `Cours · ${item.classe}` : 'Associer un cours à une classe'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#1a1a26] text-[#55556d] hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Row 1 */}
          <Field label="Cours" required error={errors.coursId}>
            <SelInput value={form.coursId} onChange={s('coursId')} placeholder="Sélectionner un cours..."
              options={cours.map(c => ({ value:String(c.id), label:`[${c.abbreviation}] ${c.designation}` }))} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Classe" required error={errors.classe}>
              <SelInput value={form.classe} onChange={s('classe')} options={CLASSES} placeholder="Choisir..." />
            </Field>
            <Field label="Année scolaire" required error={errors.annee}>
              <SelInput value={form.annee} onChange={s('annee')} options={ANNEES} placeholder="Choisir..." />
            </Field>
          </div>
          <Field label="Enseignant responsable" required error={errors.enseignant}>
            <SelInput value={form.enseignant} onChange={s('enseignant')} options={ENSEIGNANTS} placeholder="Choisir un enseignant..." />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Heures prévues" required error={errors.heuresPrevues}>
              <TxtInput type="number" value={form.heuresPrevues} onChange={s('heuresPrevues')} placeholder="120" />
            </Field>
            {/* Enregistrer la progression en heures pour la modification \+ heures\*/}
            <Field label="Heures réalisées" required error={errors.heuresRealisees}>
              <TxtInput type="number" value={form.heuresRealisees} onChange={s('heuresRealisees')} placeholder="0" />
            </Field>
            {/* Enregistrer le maxima*/}
            <Field label="Max points" error={errors.maxPoints}>
              <TxtInput type="number" value={form.maxPoints} onChange={s('maxPoints')} placeholder="100" />
            </Field>


          </div>

        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#222233] text-[#a0a0b0] hover:bg-[#1a1a26] hover:text-white transition-colors text-sm font-medium">Annuler</button>
          <button onClick={save} className="flex-1 py-2.5 text-sm  flex items-center justify-center gap-2"
            style={{ backgroundColor:btnBg, color:btnTxt }}>
            <Check size={15} />{isEdit ? 'Sauvegarder' : 'Affecter le cours'}
          </button>
        </div>
      </div>
    </Overlay>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION : AFFECTATIONS (filtres + cards avec barres de progression larges)
// ─────────────────────────────────────────────────────────────────────────────

const AffectationsSection = ({ affectations, cours, onAdd, onEdit, onDelete }) => {
  const [search,     setSearch]     = useState('');
  const [fClasse,    setFClasse]    = useState('');
  const [fEnseignant,setFEnseignant]= useState('');
  const [fAnnee,     setFAnnee]     = useState('2025-2026');
  const [fStatut,    setFStatut]    = useState('');
  const [showFilters,setShowFilters]= useState(false);
  const [page,       setPage]       = useState(0);

  const coursById = useMemo(() => Object.fromEntries(cours.map(c => [c.id, c])), [cours]);

  const filtered = useMemo(() => {
    let list = [...affectations];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a => {
        const c = coursById[a.coursId];
        return (c?.designation.toLowerCase().includes(q) || c?.abbreviation.toLowerCase().includes(q) ||
          a.classe.toLowerCase().includes(q) || a.enseignant.toLowerCase().includes(q));
      });
    }
    if (fClasse)     list = list.filter(a => a.classe === fClasse);
    if (fEnseignant) list = list.filter(a => a.enseignant === fEnseignant);
    if (fAnnee)      list = list.filter(a => a.annee === fAnnee);
    if (fStatut !== '') list = list.filter(a => a.actif === (fStatut === 'actif'));
    return list;
  }, [affectations, search, fClasse, fEnseignant, fAnnee, fStatut, coursById]);

  const activeFilters = [fClasse, fEnseignant, fAnnee, fStatut].filter(Boolean).length;
  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const resetFilters = () => { setFClasse(''); setFEnseignant(''); setFAnnee(''); setFStatut(''); setPage(0); };

  return (
    <div>
      {/* ── Barre de contrôle ── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex items-center bg-[#111116] border border-[#222233] rounded-xl px-3.5 py-2.5 focus-within:border-[#4ade80] transition-colors flex-1 min-w-[220px] max-w-sm group">
          <Search size={15} className="text-[#55556d] group-focus-within:text-[#4ade80] shrink-0 transition-colors" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Cours, classe, enseignant..."
            className="bg-transparent border-none outline-none pl-2.5 text-sm text-white placeholder-[#55556d] w-full" />
          {search && <button onClick={() => setSearch('')} className="text-[#55556d] hover:text-white"><X size={13} /></button>}
        </div>

        {/* Filters toggle */}
        <button onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors
            ${showFilters || activeFilters > 0 ? 'bg-[#1b2e1f] border-[#1b3d2b] text-[#4ade80]' : 'bg-[#111116] border-[#222233] text-[#a0a0b0] hover:text-white hover:bg-[#1a1a26]'}`}>
          <Filter size={14} />Filtres
          {activeFilters > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#4ade80] text-[#09090e] text-[10px] font-bold flex items-center justify-center">{activeFilters}</span>
          )}
        </button>

        <button onClick={onAdd}
          className="flex items-center gap-2.5 px-5 py-3  text-sm  transition-all hover:scale-[1.02] active:scale-[0.98] ml-auto"
          style={{ background:'#4ade80', color:'#09090e' }}>
          <Plus size={16} strokeWidth={2.5} />Nouvelle affectation
        </button>
      </div>

      {/* ── Panneau filtres ── */}
      {showFilters && (
        <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-[#55556d] uppercase tracking-widest">Filtrer par</span>
            {activeFilters > 0 && (
              <button onClick={resetFilters} className="flex items-center gap-1 text-xs text-[#f43f5e] hover:underline">
                <X size={11} />Réinitialiser
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { lbl:'Classe',        val:fClasse,     set:v=>{setFClasse(v);setPage(0)},     opts:CLASSES,   ph:'Toutes' },
              { lbl:'Enseignant',    val:fEnseignant, set:v=>{setFEnseignant(v);setPage(0)}, opts:ENSEIGNANTS, ph:'Tous' },
              { lbl:'Année scolaire',val:fAnnee,      set:v=>{setFAnnee(v);setPage(0)},      opts:ANNEES,    ph:'Toutes' },
            ].map(f => (
              <div key={f.lbl}>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#44445a] block mb-1.5">{f.lbl}</label>
                <SelInput value={f.val} onChange={f.set} options={f.opts} placeholder={f.ph} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Cards Grid ── */}
      {pageData.length === 0 ? (
        <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl flex flex-col items-center justify-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-[#09090e] border border-[#1b1b26] flex items-center justify-center mb-4">
            <Link2 size={22} className="text-[#2d2d3f]" />
          </div>
          <p className="text-[#44445a] font-semibold text-sm">Aucune affectation trouvée</p>
          <p className="text-[#2d2d3f] text-xs mt-1">Modifiez les filtres ou créez une nouvelle affectation</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pageData.map(af => {
            const c   = coursById[af.coursId];
            const pct = af.heuresPrevues > 0 ? Math.min(100, Math.round((af.heuresRealisees / af.heuresPrevues) * 100)) : 0;
            const { color, bg, border, label } = getProg(pct);
            const abBg  = getCoursBg(af.coursId);
            const abTxt = getCoursText(af.coursId);

            return (
              <div key={af.id}
                className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-5 hover:border-[#2d2d3f] transition-all duration-300 flex flex-col gap-0">
                {/* Card top */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="text-white font-bold text-sm leading-tight truncate">{c?.designation || '—'}</p>
                      <p className="text-[#55556d] text-xs mt-1 leading-relaxed">
                        {af.classe} · {af.enseignant}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {[
                      { icon:Pencil, fn:()=>onEdit(af),   colH:'#818cf8', bgH:'#1e1b4b', title:'Modifier'  },
                      { icon:Trash2, fn:()=>onDelete(af), colH:'#f43f5e', bgH:'#291415', title:'Supprimer' },
                    ].map(({ icon:Icon, fn, colH, bgH, title }) => (
                      <button key={title} onClick={fn} title={title}
                        className="p-1.5 rounded-lg text-[#44445a] transition-all"
                        onMouseEnter={e => { e.currentTarget.style.color=colH; e.currentTarget.style.backgroundColor=bgH; }}
                        onMouseLeave={e => { e.currentTarget.style.color=''; e.currentTarget.style.backgroundColor=''; }}>
                        <Icon size={13} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* ══ BANDE DE PROGRESSION LARGE ══ */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] uppercase tracking-widest text-[#44445a]">Avancement des heures</span>
                    <span className="text-xs font-bold" style={{ color }}>{af.heuresRealisees}h / {af.heuresPrevues}h</span>
                  </div>

                  {/* THE WIDE BAND */}
                  <div className="relative overflow-hidden " style={{ height:5 }}>
                    <div className="absolute inset-0 rounded-xl bg-[#1a1a26]" />
                    <div className="absolute inset-y-0 left-0 transition-all duration-700"
                      style={{ width:`${pct}%`, backgroundColor:color, opacity:0.72 }} />
  
                    <div className="absolute inset-0 flex items-center justify-between px-4">
  
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    {pct >= 100 && <CheckCircle2 size={11} style={{ color:'#4ade80' }} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-5 px-1">
          <span className="text-[#44445a] text-xs">
            {filtered.length} affectation{filtered.length > 1 ? 's' : ''}
            {activeFilters > 0 && ` · ${activeFilters} filtre${activeFilters > 1 ? 's' : ''} actif${activeFilters > 1 ? 's' : ''}`}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="p-2 rounded-xl border border-[#222233] text-[#a0a0b0] hover:text-white hover:bg-[#1a1a26] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-[#62627a] font-medium px-2">
              {page + 1} / {pages}
            </span>
            <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}
              className="p-2 rounded-xl border border-[#222233] text-[#a0a0b0] hover:text-white hover:bg-[#1a1a26] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function Cours() {
  const {
    cours,
    coursClasses: affectations,
    classes,
    enseignants,
    annees,
    loading,
    error,
    reload,
    anneeId,
  } = useSchoolData({
    keys: ['cours', 'coursConcernerClasse', 'classe', 'enseignant', 'anneeScolaire'],
  });

  const CLASSES = useMemo(() => classes.map((c) => c.nom), [classes]);
  const ENSEIGNANTS = useMemo(
    () => enseignants.map((e) => `Prof. ${e.nom} ${e.prenom?.[0] ?? ''}.`.trim()),
    [enseignants],
  );
  const ANNEES = useMemo(() => annees.map((a) => a.designation), [annees]);

  const [mainTab,    setMainTab]    = useState('dashboard');
  const [adminTab,   setAdminTab]   = useState('cours');       // 'cours' | 'affectations'
  const [toast,      setToast]      = useState(null);

  // ── Modaux cours ──
  const [addCours,   setAddCours]   = useState(false);
  const [editCours,  setEditCours]  = useState(null);
  const [delCours,   setDelCours]   = useState(null);

  // ── Modaux affectations ──
  const [addAffect,  setAddAffect]  = useState(false);
  const [editAffect, setEditAffect] = useState(null);
  const [delAffect,  setDelAffect]  = useState(null);

  // Toast helper
  const notify = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  // ── CRUD Cours ──
  const saveCours = async (data) => {
    try {
      const body = { designation: data.designation, abreviation: data.abbreviation ?? data.abreviation };
      if (data.id && cours.some((c) => c.id === data.id)) {
        await updateOne('cours', data.id, body);
      } else {
        await createOne('cours', body);
      }
      await reload();
      notify(data.id === editCours?.id ? `Cours "${data.designation}" mis à jour` : `Cours "${data.designation}" créé`);
    } catch (err) {
      notify(err.message ?? 'Erreur', 'error');
    }
  };
  const deleteCours = async () => {
    const affected = affectations.filter((a) => a.coursId === delCours.id).length;
    if (affected > 0) { notify(`Impossible : ${affected} affectation(s) liée(s)`, 'error'); setDelCours(null); return; }
    try {
      await deleteOne('cours', delCours.id);
      await reload();
      notify(`Cours "${delCours.designation}" supprimé`);
    } catch (err) {
      notify(err.message ?? 'Erreur', 'error');
    }
    setDelCours(null);
  };

  const saveAffect = async (data) => {
    try {
      const cls = classes.find((c) => c.nom === data.classe);
      const ens = enseignants.find((e) => `Prof. ${e.nom} ${e.prenom?.[0] ?? ''}.`.trim() === data.enseignant);
      const annee = annees.find((a) => a.designation === data.annee);
      const body = {
        max: data.maxPoints ?? data.max ?? 100,
        nombreHeures: data.heuresPrevues ?? data.nombreHeures ?? 0,
        coursId: data.coursId,
        classeId: cls?.id ?? data.classeId,
        enseignantId: ens?.id ?? data.enseignantId,
        anneeScolaireId: annee?.id ?? anneeId,
      };
      if (data.id && affectations.some((a) => a.id === data.id)) {
        await updateOne('coursConcernerClasse', data.id, body);
      } else {
        await createOne('coursConcernerClasse', body);
      }
      await reload();
      notify(editAffect ? 'Affectation mise à jour' : 'Affectation créée');
    } catch (err) {
      notify(err.message ?? 'Erreur', 'error');
    }
  };
  const deleteAffect = async () => {
    try {
      await deleteOne('coursConcernerClasse', delAffect.id);
      await reload();
      notify('Affectation supprimée');
    } catch (err) {
      notify(err.message ?? 'Erreur', 'error');
    }
    setDelAffect(null);
  };

  // ── Tabs config ──
  const MAIN_TABS = [
    { id:'dashboard', label:'Tableau de bord', icon:LayoutDashboard },
    { id:'admin',     label:'Administration',   icon:Sliders         },
  ];
  const ADMIN_TABS = [
    { id:'cours',         label:'Cours',        icon:BookMarked },
    { id:'affectations',  label:'Affectations', icon:Link2      },
  ];

  return (
    <div className="min-h-screen bg-[#09090e] text-white p-8 pl-12">
      {loading && <p className="text-[#62627a] text-center py-20">Chargement…</p>}
      {error && (
        <div className="text-center py-20">
          <p className="text-[#f43f5e] mb-4">{error.message}</p>
          <button onClick={reload} className="px-4 py-2 rounded-xl bg-[#1b2e1f] text-[#4ade80] text-sm">Réessayer</button>
        </div>
      )}
      {!loading && !error && (
      <>

      {/* ══ PAGE HEADER ══ */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Gestion des Cours</h1>
          <p className="text-[#55556d] text-sm mt-1.5">
            <span className="text-white font-semibold">{cours.length}</span> cours ·{' '}
            <span className="text-white font-semibold">{affectations.filter(a=>a.actif).length}</span> affectations actives
          </p>
        </div>
        {/* Quick stats pills */}
        <div className="flex items-center gap-3">
          {[
            { val: [...new Set(affectations.map(a=>a.enseignant))].length, lbl:'enseignants', col:'#38bdf8' },
            { val: [...new Set(affectations.map(a=>a.classe))].length,    lbl:'classes',      col:'#818cf8' },
          ].map(s => (
            <div key={s.lbl} className="flex items-center gap-2 px-3.5 py-2 bg-[#111116] border border-[#1b1b26] rounded-xl">
              <span className="text-base font-black" style={{ color:s.col }}>{s.val}</span>
              <span className="text-xs text-[#55556d]">{s.lbl}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══ NAVIGATION PRINCIPALE (Tabs avec underline) ══ */}
      <div className="flex border-b border-[#1b1b26] mb-8 gap-1">
        {MAIN_TABS.map(t => {
          const Icon = t.icon;
          const active = mainTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setMainTab(t.id)}
              className="flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-all duration-200"
              style={{
                borderColor:  active ? '#4ade80' : 'transparent',
                color:        active ? '#ffffff' : '#55556d',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#a0a0b0'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#55556d'; }}
            >
              <Icon size={15} style={{ color: active ? '#4ade80' : 'inherit' }} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ══ CONTENU PRINCIPAL ══ */}

      {/* ── Tab 1 : Tableau de bord ── */}
      {mainTab === 'dashboard' && (
        <DashboardTab cours={cours} affectations={affectations} />
      )}

      {/* ── Tab 2 : Administration ── */}
      {mainTab === 'admin' && (
        <div>
          {/* Navigation secondaire (toggle pill style) */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex bg-[#09090e] border border-[#1b1b26] rounded-xl p-1 gap-0.5">
              {ADMIN_TABS.map(t => {
                const Icon = t.icon;
                const active = adminTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setAdminTab(t.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200
                      ${active ? 'bg-[#1b2e1f] text-[#4ade80]' : 'text-[#44445a] hover:text-[#a0a0b0]'}`}
                  >
                    <Icon size={13} />
                    {t.label}
                    {/* Count badge */}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-[#12241c] text-[#4ade80]' : 'bg-[#1b1b26] text-[#44445a]'}`}>
                      {t.id === 'cours' ? cours.length : affectations.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Context info */}
            <p className="text-[#44445a] text-xs">
              {adminTab === 'cours'
                ? 'Gérer les matières enseignées dans l\'établissement'
                : 'Associer les cours aux classes avec enseignants et volumes horaires'}
            </p>
          </div>

          {/* Separator */}
          <div className="border-t border-[#1b1b26] mb-6" />

          {/* Content */}
          {adminTab === 'cours' && (
            <CoursSection
              cours={cours}
              affectations={affectations}
              onAdd={() => setAddCours(true)}
              onEdit={c => setEditCours(c)}
              onDelete={c => setDelCours(c)}
            />
          )}
          {adminTab === 'affectations' && (
            <AffectationsSection
              affectations={affectations}
              cours={cours}
              onAdd={() => setAddAffect(true)}
              onEdit={a => setEditAffect(a)}
              onDelete={a => setDelAffect(a)}
            />
          )}
        </div>
      )}

      {/* ══ MODAUX ══ */}

      {/* Cours */}
      {addCours   && <CoursModal item={null}      onClose={()=>setAddCours(false)}  onSave={saveCours} />}
      {editCours  && <CoursModal item={editCours} onClose={()=>setEditCours(null)}  onSave={saveCours} />}
      {delCours   && (
        <DeleteModal
          title="Supprimer ce cours ?"
          subtitle="Cette action supprimera le cours définitivement."
          itemLabel={`[${delCours.abbreviation}] ${delCours.designation}`}
          itemSub={`${affectations.filter(a=>a.coursId===delCours.id).length} affectations associées`}
          onClose={() => setDelCours(null)}
          onConfirm={deleteCours}
        />
      )}

      {/* Affectations */}
      {addAffect  && <AffectModal item={null}       cours={cours} onClose={()=>setAddAffect(false)}  onSave={saveAffect} />}
      {editAffect && <AffectModal item={editAffect} cours={cours} onClose={()=>setEditAffect(null)}  onSave={saveAffect} />}
      {delAffect  && (
        <DeleteModal
          title="Supprimer cette affectation ?"
          subtitle="Le cours ne sera plus assigné à cette classe."
          itemLabel={`${affectations.find(a=>a.id===delAffect.id) ? (() => { const c = cours.find(c=>c.id===delAffect.coursId); return `[${c?.abbreviation}] ${c?.designation}`; })() : '—'}`}
          itemSub={`${delAffect.classe} · ${delAffect.enseignant} · ${delAffect.annee}`}
          onClose={() => setDelAffect(null)}
          onConfirm={deleteAffect}
        />
      )}

      {/* Toast */}
      <Toast toast={toast} />
      </>
      )}
    </div>
  );
}