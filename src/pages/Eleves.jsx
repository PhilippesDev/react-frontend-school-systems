// ═══════════════════════════════════════════════════════════════════════════════
//  Eleves.jsx — Gestion complète des élèves
//  Composants : table, filtres, tri, export, 5 modaux (voir / modifier /
//               inscrire / réinscrire / supprimer)
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import {
  Search, Filter, Download, ChevronDown, X,
  Eye, Pencil, Trash2, RotateCcw, UserPlus,
  User, GraduationCap, Users, Phone, MapPin,
  ArrowUpDown, CheckCircle2, AlertCircle,
  FileText, FileSpreadsheet, Printer, Check, Upload,
} from 'lucide-react';
import { useSchoolData } from '../hooks/useSchoolData';
import { createOne, updateOne, deleteOne } from '../lib/api';
import { computePaymentProgress, getPaymentInfo } from '../lib/schoolJoins';

// ─────────────────────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────


const SORT_OPTIONS = [
  { value: 'nom_asc',   label: 'Nom (A  Z)' },
  { value: 'nom_desc',  label: 'Nom (Z  A)' },
  { value: 'age_asc',   label: 'Âge croissant' },
  { value: 'age_desc',  label: 'Âge décroissant' },
  { value: 'classe',    label: 'Par classe' },
  { value: 'option',    label: 'Par option' },
  { value: 'date_desc', label: 'Plus récents' },
  { value: 'date_asc',  label: 'Plus anciens' },
];

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fullName = (e) => `${e.nom} ${e.postnom} ${e.prenom}`;

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const getAge = (dateNaissance) => {
  const today = new Date();
  const birth = new Date(dateNaissance);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const getDateInscription = (eleve) => eleve.dateInscription ?? '—';

// Avatar fallback
const getInitials = (e) => `${e.nom[0]}${e.prenom[0]}`.toUpperCase();
const AVT_BG   = ['#132c3f','#2e163d','#1e1b4b','#3c2a16','#103024','#3b1820'];
const AVT_TEXT = ['#38bdf8','#c084fc','#818cf8','#fbbf24','#4ade80','#f43f5e'];
const avBg   = (id) => AVT_BG  [(id - 1) % AVT_BG.length];
const avText = (id) => AVT_TEXT[(id - 1) % AVT_TEXT.length];

// ─────────────────────────────────────────────────────────────────────────────
//  SHARED UI — Overlay, Avatar, FormField, TextInput, SelectInput
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
  const cls = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-xl',
  }[size];

  if (!err && eleve.photo) {
    return (
      <img
        src={eleve.photo}
        alt={fullName(eleve)}
        onError={() => setErr(true)}
        className={`${cls} rounded-full object-cover ring-2 ring-[#222233] shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${cls} rounded-full flex items-center justify-center font-bold ring-2 ring-[#222233] shrink-0`}
      style={{ backgroundColor: avBg(eleve.id), color: avText(eleve.id) }}
    >
      {getInitials(eleve)}
    </div>
  );
};

const FormField = ({ label, required, children, error }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-bold uppercase tracking-widest text-[#44445a]">
      {label}{required && <span className="text-[#f43f5e] ml-0.5">*</span>}
    </label>
    {children}
    {error && <p className="text-[#f43f5e] text-[10px]">{error}</p>}
  </div>
);

const TextInput = ({ value, onChange, placeholder, type = 'text' }) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="bg-[#09090e] border border-[#222233] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#44445a] focus:outline-none focus:border-[#4ade80] transition-colors w-full"
  />
);

const SelectInput = ({ value, onChange, options, placeholder }) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#09090e] border border-[#222233] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#4ade80] transition-colors appearance-none cursor-pointer"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const val = typeof o === 'string' ? o : o.value;
        const lbl = typeof o === 'string' ? o : o.label;
        return <option key={val} value={val}>{lbl}</option>;
      })}
    </select>
    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#44445a] pointer-events-none" />
  </div>
);

// Section dans les modaux détail
const ModalSection = ({ title, icon: Icon, children }) => (
  <div>
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-lg bg-[#1b1b26] flex items-center justify-center shrink-0">
        <Icon size={12} className="text-[#4ade80]" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-[#44445a]">{title}</span>
    </div>
    <div className="bg-[#09090e] rounded-xl px-4">{children}</div>
  </div>
);

const InfoRow = ({ label, value, accent }) => (
  <div className="flex items-start justify-between py-2.5 border-b border-[#1b1b26] last:border-0 gap-4">
    <span className="text-[#55556d] text-xs font-medium w-36 shrink-0">{label}</span>
    <span className="text-sm font-medium text-right" style={{ color: accent || '#ffffff' }}>
      {value || '—'}
    </span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
//  MODAL : VOIR DÉTAILS
// ─────────────────────────────────────────────────────────────────────────────

const ViewModal = ({ eleve, onClose, paymentInfo }) => {
  if (!eleve) return null;
  const pmt = paymentInfo ?? getPaymentInfo(0);

  return (
    <Overlay onClose={onClose}>
      <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto ">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#1b1b26]">
          <div className="flex items-center gap-4">
            <Avatar eleve={eleve} size="lg" />
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">{fullName(eleve)}</h2>
              <p className="text-[#62627a] text-sm mt-0.5">{eleve.classe} · {eleve.option}</p>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                  style={{ color: pmt.color, backgroundColor: pmt.bg, borderColor: pmt.border }}
                >
                  {pmt.label}
                </span>
                <span className="text-[#44445a] text-[10px]">{pmt.progress}% des frais payés</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[#1a1a26] text-[#55556d] hover:text-white transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <ModalSection title="Identité" icon={User}>
            <InfoRow label="Nom de famille" value={eleve.nom} />
            <InfoRow label="Postnom" value={eleve.postnom} />
            <InfoRow label="Prénom" value={eleve.prenom} />
            <InfoRow label="Sexe" value={eleve.sexe === 'M' ? 'Masculin' : ' Féminin'} />
            <InfoRow label="Date de naissance" value={formatDate(eleve.dateNaissance)} />
            <InfoRow label="Lieu de naissance" value={eleve.lieuNaissance} />
            <InfoRow label="Âge actuel" value={`${getAge(eleve.dateNaissance)} ans`} accent="#38bdf8" />
          </ModalSection>

          <ModalSection title="Parents & Tuteurs" icon={Users}>
            <InfoRow label="Père" value={eleve.nomsPere} />
            <InfoRow label="Tél. père" value={eleve.numPere} accent="#38bdf8" />
            <InfoRow label="Mère" value={eleve.nomsMere} />
            <InfoRow label="Tél. mère" value={eleve.numMere} accent="#38bdf8" />
          </ModalSection>

          <ModalSection title="Scolarité" icon={GraduationCap}>
            <InfoRow label="Classe" value={eleve.classe} accent="#4ade80" />
            <InfoRow label="Option" value={eleve.option} />
            <InfoRow label="Date d'inscription" value={formatDate(getDateInscription(eleve))} />
          </ModalSection>

          <ModalSection title="Situation de paiement" icon={CheckCircle2}>
            <div className="py-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[#55556d] text-xs">Statut actuel</span>
                <span
                  className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border"
                  style={{ color: pmt.color, backgroundColor: pmt.bg, borderColor: pmt.border }}
                >
                  {pmt.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#55556d] text-xs">Progression</span>
                <span className="text-white font-bold text-sm">{pmt.progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-[#1b1b26] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pmt.progress}%`, backgroundColor: pmt.color }}
                />
              </div>
            </div>
          </ModalSection>
        </div>
      </div>
    </Overlay>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  MODAL : CONFIRMATION SUPPRESSION
// ─────────────────────────────────────────────────────────────────────────────

const DeleteModal = ({ eleve, onClose, onConfirm }) => {
  if (!eleve) return null;
  return (
    <Overlay onClose={onClose}>
      <div className="bg-[#111116] border border-[#441d22] rounded-2xl w-full max-w-md">
        <div className="p-7 text-center">

          <div className="w-14 h-14 rounded-2xl bg-[#291415] flex items-center justify-center mx-auto mb-5">
            <Trash2 size={24} className="text-[#f43f5e]" />
          </div>

          <h3 className="text-white font-bold text-lg mb-1">Supprimer cet élève ?</h3>
          <p className="text-[#62627a] text-sm mb-5">
            Cette action est définitive et supprimera toutes les données associées.
          </p>

          {/* Carte élève */}
          <div className="bg-[#09090e] border border-[#222233] rounded-xl p-3.5 flex items-center gap-3 mb-5 text-left">
            <Avatar eleve={eleve} size="md" />
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{fullName(eleve)}</p>
              <p className="text-[#55556d] text-xs mt-0.5">{eleve.classe} · {eleve.option}</p>
            </div>
          </div>

          <div className="bg-[#1e0a0b] border border-[#441d22] rounded-xl px-4 py-2.5 mb-6 flex items-center gap-2">
            <AlertCircle size={14} className="text-[#f43f5e] shrink-0" />
            <p className="text-[#f43f5e] text-xs text-left">
              Toutes les données de paiement et de scolarité seront perdues.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#222233] text-[#a0a0b0] hover:bg-[#1a1a26] hover:text-white transition-colors text-sm font-medium"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl bg-[#f43f5e] text-white hover:bg-[#e11d48] transition-colors text-sm font-bold"
            >
              Oui, supprimer
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  MODAL : RÉINSCRIPTION
//  — Si initialEleve est null   step 1 : recherche & sélection d'un élève
//  — Si initialEleve est fourni  step 2 directement
// ─────────────────────────────────────────────────────────────────────────────

const ReInscriptionModal = ({ initialEleve, allStudents, onClose, onSave }) => {
  const [step, setStep]   = useState(initialEleve ? 2 : 1);
  const [eleve, setEleve] = useState(initialEleve || null);
  const [search, setSrc]  = useState('');
  const [form, setForm]   = useState({ classe: '', annee: '' });
  const [errors, setErrors] = useState({});

  const results = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return allStudents.filter((e) => fullName(e).toLowerCase().includes(q)).slice(0, 7);
  }, [search, allStudents]);

  const handlePick = (e) => { setEleve(e); setStep(2); };

  const handleSave = () => {
    const errs = {};
    if (!form.annee)  errs.annee  = 'Choisissez une année scolaire.';
    if (!form.classe) errs.classe = 'Choisissez une classe.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onSave({ ...eleve, classe: form.classe });
    onClose();
  };

  return (
    <Overlay onClose={onClose}>
      <div className="bg-[#111116] border border-[#1a3548] rounded-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#1b1b26]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0c1f2e] flex items-center justify-center">
              <RotateCcw size={18} className="text-[#38bdf8]" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base">Réinscription</h2>
              <p className="text-[#44445a] text-xs mt-0.5">
                {step === 1 ? 'Étape 1 — Sélectionner l\'élève' : 'Étape 2 — Classe & année scolaire'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#1a1a26] text-[#55556d] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">

          {/* ── Step 1 : Recherche élève ── */}
          {step === 1 && (
            <>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#44445a]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSrc(e.target.value)}
                  placeholder="Rechercher un élève par nom..."
                  className="w-full bg-[#09090e] border border-[#222233] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#44445a] focus:outline-none focus:border-[#38bdf8] transition-colors"
                  autoFocus
                />
              </div>

              {!search && (
                <p className="text-[#44445a] text-xs text-center py-8">
                  Tapez le nom d'un élève pour le retrouver
                </p>
              )}

              {search && results.length === 0 && (
                <p className="text-[#44445a] text-sm text-center py-6">
                  Aucun élève trouvé pour « {search} »
                </p>
              )}

              {results.map((e) => (
                <button
                  key={e.id}
                  onClick={() => handlePick(e)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#0d0d14] border border-transparent hover:border-[#1a3548] transition-all group text-left"
                >
                  <Avatar eleve={e} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm group-hover:text-[#38bdf8] transition-colors truncate">
                      {fullName(e)}
                    </p>
                    <p className="text-[#44445a] text-xs mt-0.5">{e.classe} · {e.option}</p>
                  </div>
                  <span className="text-[#1a3548] group-hover:text-[#38bdf8] transition-colors shrink-0"></span>
                </button>
              ))}
            </>
          )}

          {/* ── Step 2 : Classe & Année ── */}
          {step === 2 && (
            <>
              {/* Carte élève sélectionné */}
              {eleve && (
                <div className="bg-[#09090e] border border-[#1a3548] rounded-xl p-3 flex items-center gap-3">
                  <Avatar eleve={eleve} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{fullName(eleve)}</p>
                    <p className="text-[#55556d] text-xs">{eleve.classe} · {eleve.option}</p>
                  </div>
                  {!initialEleve && (
                    <button
                      onClick={() => { setEleve(null); setStep(1); setSrc(''); }}
                      className="text-[#44445a] hover:text-[#38bdf8] transition-colors p-1 rounded-lg"
                      title="Changer d'élève"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              )}

              <FormField label="Année scolaire" required error={errors.annee}>
                <SelectInput
                  value={form.annee}
                  onChange={(v) => setForm((f) => ({ ...f, annee: v }))}
                  options={ANNEES}
                  placeholder="Choisir une année..."
                />
              </FormField>

              <FormField label="Nouvelle classe" required error={errors.classe}>
                <SelectInput
                  value={form.classe}
                  onChange={(v) => setForm((f) => ({ ...f, classe: v }))}
                  options={CLASSES}
                  placeholder="Choisir une classe..."
                />
              </FormField>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-[#222233] text-[#a0a0b0] hover:bg-[#1a1a26] hover:text-white transition-colors text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-2.5 text-[#09090e] text-sm  transition-all flex items-center justify-center gap-2"
                  style={{ background: '#0ea5e9' }}
                >
                  <Check size={15} />
                  Confirmer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Overlay>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  MODAL : INSCRIPTION (nouveau) & MODIFICATION (existant)
//  Formulaire en 3 étapes : Identité  Parents  Scolarité
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  nom:'', postnom:'', prenom:'', sexe:'M',
  dateNaissance:'', lieuNaissance:'',
  nomsPere:'', numPere:'',
  nomsMere:'', numMere:'',
  classe:'', option:'', photo:'',
};

const STEPS = [
  { n:1, label:'Identité' },
  { n:2, label:'Parents' },
  { n:3, label:'Scolarité' },
];

const InscriptionModal = ({ eleve, onClose, onSave }) => {
  const isEdit = !!eleve;
  const [form, setForm]   = useState(isEdit ? { ...eleve } : { ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [step, setStep]   = useState(1);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const validateStep = (s) => {
    const errs = {};
    if (s === 1) {
      if (!form.nom.trim())           errs.nom           = 'Obligatoire';
      if (!form.prenom.trim())        errs.prenom        = 'Obligatoire';
      if (!form.dateNaissance)        errs.dateNaissance = 'Obligatoire';
      if (!form.lieuNaissance.trim()) errs.lieuNaissance = 'Obligatoire';
    }
    if (s === 2) {
      if (!form.nomsPere.trim()) errs.nomsPere = 'Obligatoire';
      if (!form.nomsMere.trim()) errs.nomsMere = 'Obligatoire';
    }
    if (s === 3) {
      if (!form.classe) errs.classe = 'Obligatoire';
      if (!form.option) errs.option = 'Obligatoire';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => {
    if (!validateStep(step)) return;
    setStep((s) => s + 1);
  };

  const handleSave = () => {
    if (!validateStep(3)) return;
    onSave({ ...form, id: isEdit ? form.id : Date.now() });
    onClose();
  };

  // Couleurs thématiques selon mode
  const accent   = isEdit ? '#818cf8' : '#4ade80';
  const accentBg = isEdit ? '#1e1b4b' : '#12241c';
  const gradient = isEdit ? '#4f46e5' : '#16a34a';
  const gradientText = isEdit ? '#ffffff' : '#09090e';

  return (
    <Overlay onClose={onClose}>
      <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto ">

        {/* Header */}
        <div className="p-6 border-b border-[#1b1b26]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: accentBg }}
              >
                {isEdit
                  ? <Pencil size={17} style={{ color: accent }} />
                  : <UserPlus size={17} style={{ color: accent }} />}
              </div>
              <div>
                <h2 className="text-white font-bold text-base">
                  {isEdit ? 'Modifier l\'élève' : 'Nouvelle inscription'}
                </h2>
                <p className="text-[#44445a] text-xs mt-0.5">
                  {isEdit ? `Dossier #${eleve.id}` : 'Remplissez les informations de l\'élève'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#1a1a26] text-[#55556d] hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => {
              const done    = step > s.n;
              const active  = step === s.n;
              return (
                <React.Fragment key={s.n}>
                  <button
                    onClick={() => done && setStep(s.n)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                      ${active ? 'text-white' : done ? 'cursor-pointer' : 'cursor-default'}`}
                    style={{ backgroundColor: active ? accentBg : 'transparent' }}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{
                        backgroundColor: active || done ? accent : '#222233',
                        color: active || done ? (isEdit ? '#fff' : '#09090e') : '#44445a',
                      }}
                    >
                      {done ? '✓' : s.n}
                    </span>
                    <span style={{ color: active ? accent : done ? '#a0a0b0' : '#44445a' }}>{s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className="flex-1 h-px" style={{ backgroundColor: step > s.n ? accent + '40' : '#1b1b26' }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="p-6">

          {/* ── Étape 1 : Identité ── */}
          {step === 1 && (
            <div className="space-y-4">

              {/* Photo */}
              <div className="flex items-center gap-4 p-4 bg-[#09090e] border border-[#1b1b26] rounded-2xl">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#2d2d3f] flex items-center justify-center shrink-0 overflow-hidden">
                  {form.photo
                    ? <img src={form.photo} alt="" className="w-full h-full object-cover" />
                    : <User size={22} className="text-[#2d2d3f]" />}
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Photo de profil</p>
                  <p className="text-[#44445a] text-xs mt-0.5 mb-2">Optionnel · JPG, PNG (max 2 Mo)</p>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1b1b26] border border-[#2d2d3f] rounded-lg text-xs text-[#a0a0b0] hover:text-white hover:border-[#4ade80] cursor-pointer transition-all">
                    <Upload size={11} />
                    Choisir une photo
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) set('photo')(URL.createObjectURL(f));
                    }} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField label="Nom" required error={errors.nom}>
                  <TextInput value={form.nom} onChange={set('nom')} placeholder="Kalala" />
                </FormField>
                <FormField label="Postnom">
                  <TextInput value={form.postnom} onChange={set('postnom')} placeholder="Tshimango" />
                </FormField>
                <FormField label="Prénom" required error={errors.prenom}>
                  <TextInput value={form.prenom} onChange={set('prenom')} placeholder="Jean" />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Date de naissance" required error={errors.dateNaissance}>
                  <TextInput type="date" value={form.dateNaissance} onChange={set('dateNaissance')} />
                </FormField>
                <FormField label="Lieu de naissance" required error={errors.lieuNaissance}>
                  <TextInput value={form.lieuNaissance} onChange={set('lieuNaissance')} placeholder="Kinshasa" />
                </FormField>
              </div>

              <FormField label="Sexe" required>
                <div className="flex gap-3">
                  {[
                    { val:'M', label:'Masculin',  sel:'#0c1f2e', col:'#38bdf8', brd:'#1a3548' },
                    { val:'F', label:' Féminin',   sel:'#2e163d', col:'#c084fc', brd:'#4a1e6b' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => set('sexe')(opt.val)}
                      className="flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all"
                      style={form.sexe === opt.val
                        ? { backgroundColor: opt.sel, borderColor: opt.brd, color: opt.col }
                        : { backgroundColor: '#09090e', borderColor: '#222233', color: '#44445a' }
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </FormField>
            </div>
          )}

          {/* ── Étape 2 : Parents ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Noms du père" required error={errors.nomsPere}>
                  <TextInput value={form.nomsPere} onChange={set('nomsPere')} placeholder="Nom complet" />
                </FormField>
                <FormField label="Téléphone du père">
                  <TextInput value={form.numPere} onChange={set('numPere')} placeholder="+243 812 345 601" />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Noms de la mère" required error={errors.nomsMere}>
                  <TextInput value={form.nomsMere} onChange={set('nomsMere')} placeholder="Nom complet" />
                </FormField>
                <FormField label="Téléphone de la mère">
                  <TextInput value={form.numMere} onChange={set('numMere')} placeholder="+243 812 345 602" />
                </FormField>
              </div>
            </div>
          )}

          {/* ── Étape 3 : Scolarité ── */}
          {step === 3 && (
            <div className="space-y-4">
              <FormField label="Classe" required error={errors.classe}>
                <SelectInput
                  value={form.classe}
                  onChange={set('classe')}
                  options={CLASSES}
                  placeholder="Sélectionner une classe..."
                />
              </FormField>
              <FormField label="Option" required error={errors.option}>
                <SelectInput
                  value={form.option}
                  onChange={set('option')}
                  options={OPTIONS}
                  placeholder="Sélectionner une option..."
                />
              </FormField>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <div>
            {step > 1 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="px-4 py-2 rounded-xl border border-[#222233] text-[#a0a0b0] hover:text-white hover:bg-[#1a1a26] transition-colors text-sm font-medium"
              >
                ← Retour
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#222233] text-[#a0a0b0] hover:text-white hover:bg-[#1a1a26] transition-colors text-sm font-medium"
            >
              Annuler
            </button>
            {step < 3 ? (
              <button
                onClick={nextStep}
                className="px-5 py-2 rounded-xl text-sm transition-all"
                style={{ background: gradient, color: gradientText }}
              >
                Suivant 
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="px-5 py-2 rounded-xl text-sm flex items-center gap-2 transition-all"
                style={{ background: gradient, color: gradientText }}
              >
                <Check size={15} />
                {isEdit ? 'Sauvegarder' : 'Inscrire l\'élève'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Overlay>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  EXPORT UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

const exportCSV = (rows) => {
  const h = ['ID','Nom','Postnom','Prénom','Sexe','Naissance','Lieu naissance','Classe','Option'];
  const data = rows.map((e) => [
    e.id, e.nom, e.postnom, e.prenom,
    e.sexe === 'M' ? 'Masculin' : 'Féminin',
    e.dateNaissance, e.lieuNaissance, e.classe, e.option,
  ]);
  const csv = [h, ...data].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `eleves_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
};

const exportExcel = async (rows) => {
  try {
    const XLSX = await import('xlsx');
    const data = rows.map((e) => ({
      ID: e.id, Nom: e.nom, Postnom: e.postnom, Prénom: e.prenom,
      Sexe: e.sexe === 'M' ? 'Masculin' : 'Féminin',
      'Date naissance': e.dateNaissance, 'Lieu naissance': e.lieuNaissance,
      Classe: e.classe, Option: e.option,
      Père: e.nomsPere, 'Tél père': e.numPere,
      Mère: e.nomsMere, 'Tél mère': e.numMere,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Élèves');
    XLSX.writeFile(wb, `eleves_${new Date().toISOString().slice(0,10)}.xlsx`);
  } catch {
    alert('Installez xlsx : npm install xlsx');
  }
};

const exportPDF = (rows) => {
  const html = `<html><head><title>Élèves</title><style>
    body{font-family:Arial,sans-serif;font-size:11px;margin:24px;color:#111}
    h1{font-size:17px;margin-bottom:4px} p{color:#666;margin-bottom:16px}
    table{width:100%;border-collapse:collapse}
    th{background:#0f0f14;color:#fff;padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em}
    td{padding:7px 10px;border-bottom:1px solid #eee;vertical-align:middle}
    tr:nth-child(even) td{background:#f9f9f9}
  </style></head><body>
  <h1>Liste des élèves inscrits</h1>
  <p>Exporté le ${new Date().toLocaleDateString('fr-FR')} · ${rows.length} élève(s)</p>
  <table>
    <thead><tr><th>#</th><th>Nom complet</th><th>Sexe</th><th>Date de naissance</th><th>Classe</th><th>Option</th></tr></thead>
    <tbody>${rows.map((e) => `
      <tr>
        <td>${e.id}</td>
        <td>${fullName(e)}</td>
        <td>${e.sexe === 'M' ? 'Masculin' : 'Féminin'}</td>
        <td>${formatDate(e.dateNaissance)}</td>
        <td>${e.classe}</td>
        <td>${e.option}</td>
      </tr>`).join('')}
    </tbody>
  </table></body></html>`;
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.print();
};

// ─────────────────────────────────────────────────────────────────────────────
//  COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function Eleves() {
  const {
    eleves: students,
    loading,
    error,
    reload,
    classes: classesList,
    options: optionsList,
    annees,
    anneeId,
    inscriptions,
    fraisConcerner,
    paiements,
  } = useSchoolData();

  const CLASSES = useMemo(() => classesList.map((c) => c.nom), [classesList]);
  const OPTIONS = useMemo(() => optionsList.map((o) => o.designation), [optionsList]);
  const ANNEES = useMemo(() => annees.map((a) => a.designation), [annees]);

  const paymentFor = (id) => getPaymentInfo(
    computePaymentProgress(id, inscriptions, fraisConcerner, paiements, anneeId),
  );

  // ── Filtres ──
  const [search,         setSearch]         = useState('');
  const [filterClasse,   setFilterClasse]   = useState('');
  const [filterOption,   setFilterOption]   = useState('');
  const [filterGenre,    setFilterGenre]    = useState('');
  const [filterPaiement, setFilterPaiement] = useState('');
  const [sortBy,         setSortBy]         = useState('nom_asc');
  const [showFilters,    setShowFilters]    = useState(false);
  const [showExport,     setShowExport]     = useState(false);

  // ── Modaux ──
  const [viewModal,    setViewModal]    = useState(null);
  const [editModal,    setEditModal]    = useState(null); // null | 'new' | élève
  const [deleteModal,  setDeleteModal]  = useState(null);
  const [reinscModal,  setReinscModal]  = useState(null); // null | 'global' | élève

  // ── Liste filtrée & triée ──
  const filtered = useMemo(() => {
    let list = [...students];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) =>
        fullName(e).toLowerCase().includes(q) ||
        e.classe.toLowerCase().includes(q) ||
        e.option.toLowerCase().includes(q)
      );
    }
    if (filterClasse)    list = list.filter((e) => e.classe === filterClasse);
    if (filterOption)    list = list.filter((e) => e.option === filterOption);
    if (filterGenre)     list = list.filter((e) => e.sexe   === filterGenre);
    if (filterPaiement)  list = list.filter((e) => paymentFor(e.id).label.toLowerCase() === filterPaiement);

    list.sort((a, b) => {
      switch (sortBy) {
        case 'nom_asc':   return fullName(a).localeCompare(fullName(b));
        case 'nom_desc':  return fullName(b).localeCompare(fullName(a));
        case 'age_asc':   return new Date(b.dateNaissance) - new Date(a.dateNaissance);
        case 'age_desc':  return new Date(a.dateNaissance) - new Date(b.dateNaissance);
        case 'classe':    return a.classe.localeCompare(b.classe);
        case 'option':    return a.option.localeCompare(b.option);
        case 'date_desc': return new Date(getDateInscription(b)) - new Date(getDateInscription(a));
        case 'date_asc':  return new Date(getDateInscription(a)) - new Date(getDateInscription(b));
        default:          return 0;
      }
    });

    return list;
  }, [students, search, filterClasse, filterOption, filterGenre, filterPaiement, sortBy, paymentFor]);

  // ── CRUD ──
  const handleSave = async (data) => {
    const { classe, option, ...eleveFields } = data;
    const body = {
      nom: eleveFields.nom,
      postnom: eleveFields.postnom,
      prenom: eleveFields.prenom,
      sexe: eleveFields.sexe,
      dateNaissance: eleveFields.dateNaissance,
      lieuNaissance: eleveFields.lieuNaissance,
      adresse: eleveFields.adresse ?? '',
      nomsPere: eleveFields.nomsPere,
      nomsMere: eleveFields.nomsMere,
      numPere: eleveFields.numPere ?? '',
      numMere: eleveFields.numMere ?? '',
      photo: eleveFields.photo ?? '',
    };
    try {
      if (data.id && students.some((e) => e.id === data.id)) {
        await updateOne('eleve', data.id, body);
      } else {
        const created = await createOne('eleve', body);
        const cls = classesList.find((c) => c.nom === classe);
        if (cls && anneeId) {
          await createOne('inscription', {
            dateInscription: new Date().toISOString().slice(0, 10),
            eleveId: created.id,
            classeId: cls.id,
            anneeScolaireId: anneeId,
          });
        }
      }
      await reload();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteOne('eleve', deleteModal.id);
      await reload();
    } catch (err) {
      console.error(err);
    }
    setDeleteModal(null);
  };

  const handleReinscription = async (data) => {
    const cls = classesList.find((c) => c.nom === data.classe);
    if (!cls || !anneeId) return;
    try {
      const existing = inscriptions.find(
        (i) => i.eleveId === data.id && i.anneeScolaireId === anneeId,
      );
      if (existing) {
        await updateOne('inscription', existing.id, { classeId: cls.id });
      } else {
        await createOne('inscription', {
          dateInscription: new Date().toISOString().slice(0, 10),
          eleveId: data.id,
          classeId: cls.id,
          anneeScolaireId: anneeId,
        });
      }
      await reload();
    } catch (err) {
      console.error(err);
    }
  };

  const activeFilters = [filterClasse, filterOption, filterGenre, filterPaiement].filter(Boolean).length;

  // Colonnes de la table (gridTemplateColumns)
  const COLS = '48px 1fr 70px 110px 110px 100px 160px 110px';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090e] text-white p-8 pl-12 flex items-center justify-center">
        <p className="text-[#62627a]">Chargement des élèves…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#09090e] text-white p-8 pl-12 flex flex-col items-center justify-center gap-4">
        <p className="text-[#f43f5e]">Impossible de charger les données : {error.message}</p>
        <button onClick={reload} className="px-4 py-2 rounded-xl bg-[#1b2e1f] text-[#4ade80] text-sm">Réessayer</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090e] text-white p-8 pl-12">

      {/* ═══════════════════ HEADER ═══════════════════ */}
      <div className="flex flex-col gap-6 mb-10">

        {/* Titre + BOUTONS SPÉCIAUX */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Élèves</h1>
            <p className="text-[#55556d] text-sm mt-1.5">
              <span className="text-white font-semibold">{students.length}</span> élève{students.length > 1 ? 's' : ''} inscrits
              {filtered.length !== students.length && (
                <> · <span className="text-[#4ade80] font-semibold">{filtered.length}</span> affiché{filtered.length > 1 ? 's' : ''}</>
              )}
            </p>
          </div>

          {/* ══ BOUTONS INSCRIPTION & RÉINSCRIPTION — styles distinctifs ══ */}
          <div className="flex items-center gap-3 shrink-0">

            {/* Réinscription — outlined cyan, moyen */}
            <button
              onClick={() => setReinscModal('global')}
              className="flex items-center gap-2.5 px-5 py-3 text-sm border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background:   'rgba(14,165,233,0.08)',
                borderColor:  'rgba(56,189,248,0.35)',
                color:        '#38bdf8'
              }}
            >
              <RotateCcw size={15} strokeWidth={2.5} />
              <span>Réinscription</span>
            </button>

            {/* Inscription — solid green gradient, plus grand, lumineux */}
            <button
              onClick={() => setEditModal('new')}
              className="flex items-center gap-2.5 px-6 py-3.5 text-sm  transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background:  '#4ade80',
                color:       '#09090e'
      
              }}
            >
              <UserPlus size={17} strokeWidth={2.5} />
              <span>Nouvelle inscription</span>
            </button>
          </div>
        </div>

        {/* Barre de recherche + filtres + tri + export */}
        <div className="flex items-center gap-3 flex-wrap">

          {/* Recherche */}
          <div className="relative flex items-center bg-[#111116] border border-[#222233] rounded-xl px-3.5 py-2.5 focus-within:border-[#4ade80] transition-colors flex-1 min-w-[220px] max-w-sm group">
            <Search size={15} className="text-[#55556d] group-focus-within:text-[#4ade80] shrink-0 transition-colors" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un élève..."
              className="bg-transparent border-none outline-none pl-2.5 text-sm text-white placeholder-[#55556d] w-full"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-[#55556d] hover:text-white transition-colors">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filtres */}
          <button
            onClick={() => setShowFilters((f) => !f)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors
              ${showFilters || activeFilters > 0
                ? 'bg-[#1b2e1f] border-[#1b3d2b] text-[#4ade80]'
                : 'bg-[#111116] border-[#222233] text-[#a0a0b0] hover:text-white hover:bg-[#1a1a26]'}`}
          >
            <Filter size={14} />
            Filtres
            {activeFilters > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#4ade80] text-[#09090e] text-[10px] font-bold flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>

          {/* Tri */}
          <div className="relative flex items-center bg-[#111116] border border-[#222233] rounded-xl overflow-hidden">
            <span className="pl-3">
              <ArrowUpDown size={13} className="text-[#55556d]" />
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border-none outline-none py-2.5 pl-2 pr-8 text-sm text-[#a0a0b0] cursor-pointer appearance-none"
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#44445a] pointer-events-none" />
          </div>

          {/* Export (dropdown) */}
          <div className="relative">
            <button
              onClick={() => setShowExport((e) => !e)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#111116] border border-[#222233] rounded-xl text-[#a0a0b0] hover:text-white hover:bg-[#1a1a26] transition-colors text-sm font-medium"
            >
              <Download size={14} />
              Exporter
              <ChevronDown size={12} />
            </button>

            {showExport && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExport(false)} />
                <div className="absolute right-0 top-full mt-2 z-20 bg-[#111116] border border-[#222233] rounded-xl overflow-hidden min-w-[160px]">
                  {[
                    { label:'CSV',             icon: FileText,        fn: () => { exportCSV(filtered);   setShowExport(false); } },
                    { label:'Excel (.xlsx)',    icon: FileSpreadsheet, fn: () => { exportExcel(filtered); setShowExport(false); } },
                    { label:'PDF / Imprimer',  icon: Printer,         fn: () => { exportPDF(filtered);   setShowExport(false); } },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={item.fn}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[#a0a0b0] hover:text-white hover:bg-[#1a1a26] transition-colors"
                    >
                      <item.icon size={13} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Panneau filtres dépliable */}
        {showFilters && (
          <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-[#55556d] uppercase tracking-widest">Filtrer par</span>
              {activeFilters > 0 && (
                <button
                  onClick={() => { setFilterClasse(''); setFilterOption(''); setFilterGenre(''); setFilterPaiement(''); }}
                  className="flex items-center gap-1 text-xs text-[#f43f5e] hover:underline"
                >
                  <X size={11} />Réinitialiser
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { lbl:'Classe',    val:filterClasse,    set:setFilterClasse,    opts:CLASSES,                       ph:'Toutes les classes' },
                { lbl:'Option',    val:filterOption,    set:setFilterOption,    opts:OPTIONS,                       ph:'Toutes les options' },
                { lbl:'Genre',     val:filterGenre,     set:setFilterGenre,     opts:[{value:'M',label:'Masculin'},{value:'F',label:' Féminin'}], ph:'Tous' },
                { lbl:'Paiement',  val:filterPaiement,  set:setFilterPaiement,  opts:['Soldé','Bon','Moyen','Bas','Non payé'].map(v=>({value:v.toLowerCase(),label:v})), ph:'Tous les statuts' },
              ].map((f) => (
                <div key={f.lbl}>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#44445a] block mb-1.5">{f.lbl}</label>
                  <SelectInput value={f.val} onChange={f.set} options={f.opts} placeholder={f.ph} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════ TABLE ═══════════════════ */}
      <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl overflow-hidden">

        {/* En-tête colonnes */}
        <div
          className="px-5 py-3 border-b border-[#1b1b26]"
          style={{ display:'grid', gridTemplateColumns:COLS, gap:'12px', alignItems:'center' }}
        >
          {['#','Élève','Sexe','Naissance','Classe','Option','Paiement','Actions'].map((h) => (
            <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-[#44445a]">{h}</span>
          ))}
        </div>

        {/* Lignes */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#09090e] border border-[#1b1b26] flex items-center justify-center mb-4">
              <Users size={26} className="text-[#2d2d3f]" />
            </div>
            <p className="text-[#44445a] font-semibold">Aucun élève trouvé</p>
            <p className="text-[#2d2d3f] text-sm mt-1">Modifiez vos critères de recherche ou de filtrage</p>
          </div>
        ) : (
          filtered.map((eleve) => {
            const pmt = paymentFor(eleve.id);
            return (
              <div
                key={eleve.id}
                className="border-b border-[#1b1b26] last:border-0 hover:bg-[#0c0c11] transition-colors"
                style={{ display:'grid', gridTemplateColumns:COLS, gap:'12px', alignItems:'center', padding:'13px 20px' }}
              >
                {/* ID */}
                <span className="text-[#2d2d3f] text-xs font-mono">{String(eleve.id).padStart(2,'0')}</span>

                {/* Avatar + Nom */}
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar eleve={eleve} size="sm" />
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate leading-tight">{fullName(eleve)}</p>
                    <p className="text-[#44445a] text-[11px] mt-0.5 truncate">{formatDate(getDateInscription(eleve))}</p>
                  </div>
                </div>

                {/* Sexe */}
                <span
                  className="text-xs font-bold"
                  style={{ color: eleve.sexe === 'M' ? '#38bdf8' : '#f9a8d4' }}
                >
                  {eleve.sexe === 'M' ? 'M' : ' F'}
                </span>

                {/* Naissance */}
                <div>
                  <p className="text-[#a0a0b0] text-xs leading-tight">{formatDate(eleve.dateNaissance)}</p>
                  <p className="text-[#44445a] text-[10px] mt-0.5">{getAge(eleve.dateNaissance)} ans</p>
                </div>

                {/* Classe */}
                <span className="text-[#4ade80] text-xs font-semibold">{eleve.classe}</span>

                {/* Option */}
                <span className="text-[#a0a0b0] text-xs truncate">{eleve.option}</span>

                {/* Paiement */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full border whitespace-nowrap"
                      style={{ color:pmt.color, backgroundColor:pmt.bg, borderColor:pmt.border }}
                    >
                      {pmt.label}
                    </span>
                    <span className="text-[10px] text-[#44445a] shrink-0">{pmt.progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#1b1b26] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width:`${pmt.progress}%`, backgroundColor:pmt.color }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {[
                    { icon:Eye,      title:'Voir',       fn:() => setViewModal(eleve),   colH:'#38bdf8', bgH:'#0c1f2e' },
                    { icon:Pencil,   title:'Modifier',   fn:() => setEditModal(eleve),   colH:'#818cf8', bgH:'#1e1b4b' },
                    { icon:RotateCcw,title:'Réinscrire', fn:() => setReinscModal(eleve), colH:'#38bdf8', bgH:'#0c1f2e' },
                    { icon:Trash2,   title:'Supprimer',  fn:() => setDeleteModal(eleve), colH:'#f43f5e', bgH:'#291415' },
                  ].map(({ icon:Icon, title, fn, colH, bgH }) => (
                    <button
                      key={title}
                      onClick={fn}
                      title={title}
                      className="p-1.5 rounded-lg text-[#44445a] transition-all duration-150"
                      onMouseEnter={(e) => { e.currentTarget.style.color=colH; e.currentTarget.style.backgroundColor=bgH; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color=''; e.currentTarget.style.backgroundColor=''; }}
                    >
                      <Icon size={14} />
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}

        {/* Pied de tableau */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#1b1b26]">
          <span className="text-[#44445a] text-xs">
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
            {activeFilters > 0 && ` · ${activeFilters} filtre${activeFilters > 1 ? 's' : ''} actif${activeFilters > 1 ? 's' : ''}`}
          </span>
          <div className="flex items-center gap-4 text-[10px] text-[#44445a]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#4ade80]" />
              {students.filter((e) => paymentFor(e.id).label === 'Soldé').length} soldés
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#f43f5e]" />
              {students.filter((e) => paymentFor(e.id).label === 'Non payé').length} non payés
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════ MODAUX ═══════════════════ */}

      {viewModal && (
        <ViewModal eleve={viewModal} paymentInfo={viewModal ? paymentFor(viewModal.id) : null} onClose={() => setViewModal(null)} />
      )}

      {editModal && (
        <InscriptionModal
          eleve={editModal === 'new' ? null : editModal}
          onClose={() => setEditModal(null)}
          onSave={handleSave}
        />
      )}

      {deleteModal && (
        <DeleteModal
          eleve={deleteModal}
          onClose={() => setDeleteModal(null)}
          onConfirm={handleDelete}
        />
      )}

      {reinscModal && (
        <ReInscriptionModal
          initialEleve={reinscModal === 'global' ? null : reinscModal}
          allStudents={students}
          onClose={() => setReinscModal(null)}
          onSave={handleReinscription}
        />
      )}
    </div>
  );
}