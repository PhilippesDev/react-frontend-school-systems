// ═══════════════════════════════════════════════════════════════════════════════
//  Parents.jsx — Portail parents (route /parents, hors sidebar)
//  Login par code d'accès · Inscription · Suivi enfants
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, X, Copy, Check, LogOut, UserPlus, KeyRound, Users,
  CreditCard, ClipboardCheck, Calendar,
  CheckCircle2, AlertCircle, User,
} from 'lucide-react';

import { useSchoolData } from '../hooks/useSchoolData';
import { ETABLISSEMENT } from '../lib/schoolConfig';
import {
  findParentByTelephone, registerParent,
  getSession, setSession, clearSession, getElevesForParent,
} from '../lib/parentsUtils';
import {
  fullName, getClasseByNom, getCoursClasseForClasse, enrichCoursClasse,
  getActiveAnnee, buildEleveResults, formatPourcentage,
} from '../lib/cotationsUtils';
import { presenceToRecords, mapPaiementForUi } from '../lib/schoolJoins';
import { elevePhotoUrl } from '../lib/elevePhoto';
import { buildYearGrid, GRID_COLOR, getPresenceStats } from '../lib/presenceData';

const AVT_BG   = ['#132c3f','#2e163d','#1e1b4b','#3c2a16','#103024','#3b1820'];
const AVT_TEXT = ['#38bdf8','#c084fc','#818cf8','#fbbf24','#4ade80','#f43f5e'];
const CELL = 12;
const GAP = 3;
const STEP = CELL + GAP;

const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ─── Mini composants ─────────────────────────────────────────────────────────

const Avatar = ({ eleve, size = 'md' }) => {
  const [err, setErr] = useState(false);
  const cls = { sm: 'w-8 h-8 text-[10px]', md: 'w-12 h-12 text-sm', lg: 'w-20 h-20 text-xl' }[size];
  const photoUrl = elevePhotoUrl(eleve?.photo);
  if (!err && photoUrl) {
    return <img src={photoUrl} alt="" onError={() => setErr(true)}
      className={`${cls} rounded-full object-cover ring-2 ring-[#222233] shrink-0`} />;
  }
  return (
    <div className={`${cls} rounded-full flex items-center justify-center font-bold ring-2 ring-[#222233] shrink-0`}
      style={{ backgroundColor: AVT_BG[((eleve?.id ?? 1) - 1) % AVT_BG.length], color: AVT_TEXT[((eleve?.id ?? 1) - 1) % AVT_TEXT.length] }}>
      {eleve?.nom?.[0]}{eleve?.prenom?.[0]}
    </div>
  );
};

const AttendanceGrid = ({ eleveId, classe, year, records }) => {
  const [tooltip, setTooltip] = useState(null);
  const { weeks, monthLabels } = useMemo(
    () => buildYearGrid(eleveId, classe, year, records), [eleveId, classe, year, records],
  );
  return (
    <div className="relative select-none">
      {tooltip && (
        <div className="fixed z-[9999] pointer-events-none" style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}>
          <div className="bg-[#161622] border border-[#2d2d44] rounded-lg px-3 py-1.5 shadow-xl text-xs">
            <p className="text-[#888]">{formatDate(tooltip.ds)}</p>
            <p style={{ color: GRID_COLOR[tooltip.status] }}>
              {tooltip.status === 'present' && 'Présent'}
              {tooltip.status === 'absent' && 'Absent'}
              {tooltip.status === 'no-record' && 'Aucun enregistrement'}
            </p>
          </div>
        </div>
      )}
      <div className="overflow-x-auto pb-2">
        <div style={{ minWidth: weeks.length * STEP + 32 }} className="relative pt-2">
          <div className="relative h-5 ml-8">
            {monthLabels.map((ml, i) => (
              <span key={i} className="absolute text-[10px] text-[#555]" style={{ left: ml.wi * STEP }}>{ml.label}</span>
            ))}
          </div>
          <div className="flex items-start">
            <div className="flex flex-col pr-2" style={{ gap: GAP, height: 5 * CELL + 4 * GAP }}>
              {['Lun','Mar','Mer','Jeu','Ven'].map((day, i) => (
                <div key={i} className="text-[9px] text-[#555] flex items-center justify-end" style={{ height: CELL, width: 22 }}>
                  {i % 2 === 0 ? day : ''}
                </div>
              ))}
            </div>
            <div className="flex" style={{ gap: GAP }}>
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                  {week.map((day, di) => (
                    <div key={di}
                      className={day.inYear && day.status !== 'outside' ? 'cursor-pointer hover:scale-110' : ''}
                      style={{ width: CELL, height: CELL, borderRadius: 3, backgroundColor: GRID_COLOR[day.status] ?? 'transparent', opacity: day.inYear ? 1 : 0.15 }}
                      onMouseEnter={(e) => day.inYear && setTooltip({ ...day, x: e.clientX, y: e.clientY })}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-4 mt-3 text-[10px] text-[#666]">
        {[['#4ade80','Présent'],['#f43f5e','Absent'],['#1b1b26','Sans données']].map(([c,l]) => (
          <span key={l} className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />{l}</span>
        ))}
      </div>
    </div>
  );
};

// ─── Écrans auth ─────────────────────────────────────────────────────────────

const LoginScreen = ({ onLogin, onGoRegister, error }) => {
  const [telephone, setTelephone] = useState('');
  return (
    <div className="min-h-screen bg-[#09090e] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={ETABLISSEMENT.logo} alt="" className="w-14 h-14 mx-auto mb-4 opacity-80" />
          <h1 className="text-2xl font-bold text-white">{ETABLISSEMENT.nom}</h1>
          <p className="text-[#62627a] text-sm mt-1">Espace parents</p>
        </div>
        <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <KeyRound size={18} className="text-[#4ade80]" />
            <h2 className="text-white font-bold">Connexion</h2>
          </div>
          <p className="text-[#62627a] text-xs mb-4">Entrez le numéro de téléphone enregistré lors de l'inscription.</p>
          {error && (
            <div className="flex items-center gap-2 bg-[#291415] border border-[#441d22] rounded-xl px-4 py-3 mb-4 text-[#f43f5e] text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <label className="text-[10px] font-bold uppercase tracking-widest text-[#44445a] block mb-2">Téléphone</label>
          <input
            value={telephone} onChange={(e) => setTelephone(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onLogin(telephone)}
            placeholder="+243..."
            className="w-full bg-[#09090e] border border-[#222233] rounded-xl px-4 py-3 text-white text-center text-lg focus:outline-none focus:border-[#4ade80]"
          />
          <button onClick={() => onLogin(telephone)}
            className="w-full mt-4 py-3 rounded-xl bg-[#4ade80] text-[#0a0a0e] font-bold hover:bg-[#22c55e] transition-colors">
            Se connecter
          </button>
          <p className="text-center text-[#62627a] text-sm mt-6">
            Pas encore inscrit ?{' '}
            <button onClick={onGoRegister} className="text-[#4ade80] hover:underline font-medium">Créer un compte</button>
          </p>
        </div>
      </div>
    </div>
  );
};

const RegisterScreen = ({ onRegister, onGoLogin, eleves }) => {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [generatedCode, setGeneratedCode] = useState(null);
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return eleves;
    const q = search.toLowerCase();
    return eleves.filter((e) => fullName(e).toLowerCase().includes(q) || e.classe.toLowerCase().includes(q));
  }, [eleves, search]);

  const toggle = (id) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const handleSubmit = async () => {
    if (!nom.trim()) { setError('Le nom est requis'); return; }
    if (!telephone.trim()) { setError('Le téléphone est requis'); return; }
    if (!selected.length) { setError('Sélectionnez au moins un élève'); return; }
    const { parent } = await onRegister({ nom, email, telephone, eleveIds: selected });
    setGeneratedCode(parent.telephone);
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (generatedCode) {
    return (
      <div className="min-h-screen bg-[#09090e] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#111116] border border-[#1b3d2b] rounded-2xl p-8 text-center">
          <CheckCircle2 size={48} className="text-[#4ade80] mx-auto mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">Inscription réussie !</h2>
          <p className="text-[#62627a] text-sm mb-6">Utilisez votre numéro de téléphone pour vous connecter.</p>
          <div className="bg-[#09090e] border border-[#4ade80]/30 rounded-xl px-6 py-4 mb-4">
            <p className="text-[10px] uppercase tracking-widest text-[#44445a] mb-1">Votre téléphone</p>
            <p className="text-2xl font-mono font-bold text-[#4ade80] tracking-widest">{generatedCode}</p>
          </div>
          <button onClick={copyCode}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-[#222233] text-[#a0a0b0] hover:text-white text-sm mb-3">
            {copied ? <Check size={14} className="text-[#4ade80]" /> : <Copy size={14} />}
            {copied ? 'Copié !' : 'Copier le code'}
          </button>
          <button onClick={onGoLogin}
            className="w-full py-3 rounded-xl bg-[#4ade80] text-[#0a0a0e] font-bold">
            Aller à la connexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090e] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">Inscription parent</h1>
          <p className="text-[#62627a] text-sm mt-1">Sélectionnez les élèves que vous suivez</p>
        </div>
        <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-[#291415] border border-[#441d22] rounded-xl px-4 py-3 text-[#f43f5e] text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#44445a] block mb-1.5">Nom complet *</label>
            <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom du parent / tuteur"
              className="w-full bg-[#09090e] border border-[#222233] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#4ade80]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#44445a] block mb-1.5">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="optionnel"
                className="w-full bg-[#09090e] border border-[#222233] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#4ade80]" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#44445a] block mb-1.5">Téléphone</label>
              <input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="optionnel"
                className="w-full bg-[#09090e] border border-[#222233] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#4ade80]" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#44445a] block mb-2">
              Élève(s) à suivre * <span className="text-[#4ade80]">({selected.length} sélectionné(s))</span>
            </label>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#44445a]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..."
                className="w-full bg-[#09090e] border border-[#222233] rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#4ade80]" />
            </div>
            <div className="max-h-48 overflow-y-auto border border-[#1b1b26] rounded-xl divide-y divide-[#1b1b26]">
              {filtered.map((e) => (
                <label key={e.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#0d0d12] cursor-pointer">
                  <input type="checkbox" checked={selected.includes(e.id)} onChange={() => toggle(e.id)}
                    className="accent-[#4ade80] w-4 h-4" />
                  <Avatar eleve={e} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{fullName(e)}</p>
                    <p className="text-[#44445a] text-xs">{e.classe}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <button onClick={handleSubmit}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#4ade80] text-[#0a0a0e] font-bold hover:bg-[#22c55e]">
            <UserPlus size={16} /> S'inscrire et obtenir mon code
          </button>
          <p className="text-center text-[#62627a] text-sm">
            Déjà inscrit ? <button onClick={onGoLogin} className="text-[#4ade80] hover:underline">Se connecter</button>
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Tableau de bord parent ──────────────────────────────────────────────────

const Dashboard = ({
  parent, eleves, onLogout,
  metaData, classesData, coursData, coursClassesData,
  cotations, paiementsRaw, frais, categoriesFrais, inscriptions,
  presences, classes,
}) => {
  const [activeChild, setActiveChild] = useState(eleves[0]?.id ?? null);
  const [tab, setTab] = useState('profil');
  const annee = getActiveAnnee(metaData);
  const etablissement = ETABLISSEMENT;
  const presenceRecords = useMemo(
    () => presenceToRecords(presences, inscriptions, classes),
    [presences, inscriptions, classes],
  );
  const year = new Date().getFullYear();

  const child = eleves.find((e) => e.id === activeChild);
  const classeObj = child ? getClasseByNom(classesData, child.classe) : null;
  const coursList = useMemo(() => {
    if (!classeObj) return [];
    return enrichCoursClasse(
      getCoursClasseForClasse(coursClassesData, classeObj.id, annee.id), coursData,
    );
  }, [classeObj, annee.id]);

  const results = useMemo(() => {
    if (!child || !coursList.length) return null;
    return buildEleveResults(cotations, child, coursList, metaData);
  }, [child, coursList, cotations]);

  const paiements = useMemo(() => {
    const enriched = paiementsRaw.map((p) =>
      mapPaiementForUi(p, inscriptions, [], frais, categoriesFrais),
    );
    return enriched.filter((p) => p.eleveId === activeChild);
  }, [paiementsRaw, inscriptions, frais, categoriesFrais, activeChild]);
  const totalPaye = paiements.reduce((s, p) => s + (p.montantPaye ?? p.montant ?? 0), 0);
  const presStats = child ? getPresenceStats(child.id, child.classe, year, presenceRecords) : null;

  const TABS = [
    { id: 'profil', label: 'Profil', icon: User },
    { id: 'paiements', label: 'Paiements', icon: CreditCard },
    { id: 'presence', label: 'Présences', icon: Calendar },
    { id: 'cotations', label: 'Cotations', icon: ClipboardCheck },
  ];

  return (
    <div className="min-h-screen bg-[#09090e]">
      {/* Header */}
      <header className="border-b border-[#1b1b26] bg-[#111116] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={etablissement.logo} alt="" className="w-8 h-8 opacity-80" />
            <div>
              <p className="text-white font-bold text-sm">{etablissement.nom}</p>
              <p className="text-[#44445a] text-xs">Bonjour, {parent.nom}</p>
            </div>
          </div>
          <button onClick={onLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#222233] text-[#a0a0b0] hover:text-white text-sm">
            <LogOut size={14} /> Déconnexion
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Sélection enfants */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#44445a] mb-3 flex items-center gap-1">
            <Users size={12} /> Mes enfants ({eleves.length})
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {eleves.map((e) => (
              <button key={e.id} onClick={() => setActiveChild(e.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shrink-0 transition-all ${
                  activeChild === e.id ? 'border-[#4ade80] bg-[#0d1f15]' : 'border-[#1b1b26] bg-[#111116] hover:border-[#333]'
                }`}>
                <Avatar eleve={e} size="sm" />
                <div className="text-left">
                  <p className="text-white text-sm font-semibold">{e.prenom} {e.nom}</p>
                  <p className="text-[#44445a] text-xs">{e.classe}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {child && (
          <>
            {/* Onglets */}
            <div className="flex gap-1 bg-[#111116] border border-[#1b1b26] rounded-2xl p-1.5 overflow-x-auto">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setTab(id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    tab === id ? 'bg-[#4ade80] text-[#0a0a0e] font-bold' : 'text-[#62627a] hover:text-white'
                  }`}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>

            {/* PROFIL */}
            {tab === 'profil' && (
              <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-6">
                <div className="flex items-start gap-6 mb-6">
                  <Avatar eleve={child} size="lg" />
                  <div>
                    <h2 className="text-white text-xl font-bold">{fullName(child)}</h2>
                    <p className="text-[#4ade80] text-sm mt-1">{child.classe} · {child.option}</p>
                    <p className="text-[#62627a] text-xs mt-1">Année {annee.designation}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {[
                    ['Sexe', child.sexe === 'M' ? 'Masculin' : 'Féminin'],
                    ['Date de naissance', formatDate(child.dateNaissance)],
                    ['Lieu de naissance', child.lieuNaissance],
                    ['Père', child.nomsPere],
                    ['Mère', child.nomsMere],
                    ['Tél. père', child.numPere],
                    ['Tél. mère', child.numMere],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between py-2 border-b border-[#1b1b26]">
                      <span className="text-[#55556d]">{l}</span>
                      <span className="text-white font-medium text-right">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PAIEMENTS */}
            {tab === 'paiements' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-5 text-center">
                    <p className="text-[#44445a] text-[10px] uppercase font-bold">Total payé</p>
                    <p className="text-[#4ade80] text-2xl font-bold mt-1">{totalPaye} $</p>
                  </div>
                  <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-5 text-center">
                    <p className="text-[#44445a] text-[10px] uppercase font-bold">Paiements</p>
                    <p className="text-white text-2xl font-bold mt-1">{paiements.length}</p>
                  </div>
                </div>
                <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl overflow-hidden">
                  {paiements.length === 0 ? (
                    <p className="text-[#44445a] text-sm text-center py-10">Aucun paiement enregistré</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#1b1b26] text-[10px] uppercase text-[#44445a]">
                          <th className="text-left px-4 py-3">Date</th>
                          <th className="text-left px-4 py-3">Frais</th>
                          <th className="text-left px-4 py-3">Catégorie</th>
                          <th className="text-right px-4 py-3">Montant</th>
                          <th className="text-right px-4 py-3">Mode</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paiements.map((p) => (
                            <tr key={p.id} className="border-b border-[#1b1b26] hover:bg-[#0d0d12]">
                              <td className="px-4 py-3 text-[#a0a0b0]">{formatDate(p.datePaiement)}</td>
                              <td className="px-4 py-3 text-white">{p.fraisDesignation ?? '—'}</td>
                              <td className="px-4 py-3 text-[#62627a]">{p.categorieDesignation ?? '—'}</td>
                              <td className="px-4 py-3 text-[#4ade80] font-bold text-right">{p.montantPaye ?? p.montant} $</td>
                              <td className="px-4 py-3 text-[#62627a] text-right">{p.mode ?? '—'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* PRÉSENCES */}
            {tab === 'presence' && presStats && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Présences', val: presStats.present, color: '#4ade80' },
                    { label: 'Absences', val: presStats.absent, color: '#f43f5e' },
                    { label: 'Taux', val: `${presStats.rate}%`, color: '#38bdf8' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-4 text-center">
                      <p className="text-[#44445a] text-[10px] uppercase font-bold">{label}</p>
                      <p className="text-xl font-bold mt-1" style={{ color }}>{val}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-6">
                  <h3 className="text-white font-bold text-sm mb-4">Grille de présence {year}</h3>
                  <AttendanceGrid eleveId={child.id} classe={child.classe} year={year} records={presenceRecords} />
                </div>
              </div>
            )}

            {/* COTATIONS */}
            {tab === 'cotations' && results && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {results.semesterMoyennes.map((s) => (
                    <div key={s.semestreId} className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-4 text-center">
                      <p className="text-[#44445a] text-[10px] uppercase font-bold">{s.label}</p>
                      <p className="text-[#4ade80] font-bold text-lg mt-1">{formatPourcentage(s.moyenne)}</p>
                    </div>
                  ))}
                  <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-4 text-center">
                    <p className="text-[#44445a] text-[10px] uppercase font-bold">Annuelle</p>
                    <p className="text-[#38bdf8] font-bold text-lg mt-1">{formatPourcentage(results.moyenneAnnuelle)}</p>
                  </div>
                  <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-4 text-center">
                    <p className="text-[#44445a] text-[10px] uppercase font-bold">Décision</p>
                    <p className={`font-bold text-lg mt-1 ${results.decision === 'ADMIS' ? 'text-[#4ade80]' : 'text-[#f43f5e]'}`}>
                      {results.decision}
                    </p>
                  </div>
                </div>
                <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[#1b1b26] bg-[#0d0d12]">
                          <th className="text-left px-4 py-3 text-[10px] uppercase text-[#44445a]">Cours</th>
                          {results.periodMoyennes.map((p) => (
                            <th key={p.periodeId} className="px-2 py-3 text-[10px] uppercase text-[#44445a] text-center whitespace-nowrap">{p.label}</th>
                          ))}
                          <th className="px-2 py-3 text-[10px] uppercase text-[#4ade80]">S1</th>
                          <th className="px-2 py-3 text-[10px] uppercase text-[#4ade80]">S2</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.coursResults.map((cr) => (
                          <tr key={cr.id} className="border-b border-[#1b1b26]">
                            <td className="px-4 py-2.5 text-white font-medium">{cr.coursDesignation}</td>
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
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ─── Composant principal ─────────────────────────────────────────────────────

export default function Parents() {
  const {
    eleves: allEleves,
    parents,
    meta,
    classesData,
    cours,
    coursClasses,
    cotations,
    paiements: paiementsRaw,
    frais,
    categoriesFrais,
    inscriptions,
    presences,
    classes,
    loading,
    reload,
  } = useSchoolData();

  const [view, setView] = useState('login');
  const [session, setSessionState] = useState(() => getSession());
  const [loginError, setLoginError] = useState('');

  const parent = useMemo(() => {
    if (!session) return null;
    return parents.find((p) => p.id === session.parentId)
      ?? findParentByTelephone(parents, session.telephone ?? session.codeAcces);
  }, [session, parents]);

  const children = useMemo(() => {
    if (!parent) return [];
    return getElevesForParent(allEleves, parent.id);
  }, [parent, allEleves]);

  useEffect(() => {
    if (session && parent) setView('dashboard');
  }, [session, parent]);

  const handleLogin = (telephone) => {
    setLoginError('');
    const found = findParentByTelephone(parents, telephone);
    if (!found) { setLoginError('Numéro de téléphone invalide'); return; }
    setSession(found);
    setSessionState({ parentId: found.id, telephone: found.telephone, nom: found.nom });
    setView('dashboard');
  };

  const handleRegister = async (data) => {
    const { parent: p } = await registerParent(data);
    await reload();
    return { parent: p };
  };

  const handleLogout = () => {
    clearSession();
    setSessionState(null);
    setView('login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090e] text-white flex items-center justify-center">
        <p className="text-[#62627a]">Chargement…</p>
      </div>
    );
  }

  if (view === 'dashboard' && parent && children.length) {
    return (
      <Dashboard
        parent={parent}
        eleves={children}
        onLogout={handleLogout}
        metaData={meta}
        classesData={classesData}
        coursData={cours}
        coursClassesData={coursClasses}
        cotations={cotations}
        paiementsRaw={paiementsRaw}
        frais={frais}
        categoriesFrais={categoriesFrais}
        inscriptions={inscriptions}
        presences={presences}
        classes={classes}
      />
    );
  }

  if (view === 'register') {
    return (
      <RegisterScreen
        eleves={allEleves}
        onRegister={handleRegister}
        onGoLogin={() => setView('login')}
      />
    );
  }

  return (
    <LoginScreen
      onLogin={handleLogin}
      onGoRegister={() => setView('register')}
      error={loginError}
    />
  );
}
