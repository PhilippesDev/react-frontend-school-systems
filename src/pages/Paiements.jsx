import React, { useState, useMemo } from 'react';
import {
  Search, Plus, Edit3, Trash2, X, Users, Save, AlertCircle, ChevronRight,
  School, DollarSign, Receipt, Printer, CheckCircle2, CreditCard, Wallet,
  Layers, Tag, Banknote, ArrowLeft, ArrowRight, CalendarDays
} from 'lucide-react';
import { useSchoolData } from '../hooks/useSchoolData';
import { useAnneeScolaire } from '../context/AnneeScolaireContext';
import { createOne, updateOne, deleteOne } from '../lib/api';

const MODES_PAIEMENT = ['Espèces', 'Mobile Money', 'Carte bancaire', 'Virement', 'Chèque'];

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
        <div className="px-6 py-5 max-h-[80vh] overflow-y-auto custom-scrollbar">{children}</div>
      </div>
    </div>
  );
}

function FormInput({ label, type = 'text', value, onChange, placeholder, required = false, icon: Icon, min, max, step }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-[#a0a0b0] uppercase tracking-wider">
        {label} {required && <span className="text-[#f43f5e]">*</span>}
      </label>
      <div className="relative">
        {Icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#55556d]"><Icon size={16} /></div>}
        <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
          min={min} max={max} step={step}
          className={`w-full bg-[#09090e] border border-[#222233] rounded-xl text-sm text-white placeholder-[#44445a] outline-none focus:border-[#4ade80] transition-colors ${Icon ? 'pl-10' : 'pl-3.5'} pr-3.5 py-2.5`}
        />
      </div>
    </div>
  );
}

function FormSelect({ label, value, onChange, options, required = false, optionValue = 'value', optionLabel = 'label' }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-[#a0a0b0] uppercase tracking-wider">
        {label} {required && <span className="text-[#f43f5e]">*</span>}
      </label>
      <div className="relative">
        <select value={value} onChange={onChange} required={required}
          className="w-full bg-[#09090e] border border-[#222233] rounded-xl text-sm text-white outline-none focus:border-[#4ade80] transition-colors appearance-none pl-3.5 pr-10 py-2.5 cursor-pointer"
        >
          {options.map((opt, i) => (
            <option key={i} value={typeof opt === 'object' ? opt[optionValue] : opt}>
              {typeof opt === 'object' ? opt[optionLabel] : opt}
            </option>
          ))}
        </select>
        <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-[#55556d] pointer-events-none" />
      </div>
    </div>
  );
}

function printReceipt(paiement, eleve, frais, categorie) {
  const w = window.open('', '_blank');
  w.document.write(`
    <html><head><title>Reçu #${paiement.id}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
      body{font-family:'Inter',sans-serif;background:#fff;color:#111;padding:40px;max-width:400px;margin:0 auto}
      .header{text-align:center;border-bottom:2px dashed #ccc;padding-bottom:20px;margin-bottom:20px}
      .header h1{font-size:18px;font-weight:700;margin:0}
      .header p{font-size:12px;color:#666;margin:4px 0 0}
      .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:13px}
      .row .label{color:#666}.row .value{font-weight:600}
      .total{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-top:20px;text-align:center}
      .total .amount{font-size:28px;font-weight:700;color:#16a34a}
      .total .label{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px}
      .footer{text-align:center;margin-top:30px;font-size:11px;color:#999}
      .stamp{border:2px solid #16a34a;border-radius:50%;width:80px;height:80px;display:flex;align-items:center;justify-content:center;margin:20px auto;color:#16a34a;font-size:10px;font-weight:700;text-transform:uppercase;transform:rotate(-15deg);opacity:0.7}
    </style></head><body>
      <div class="header"><h1>REÇU DE PAIEMENT</h1><p>École Primaire & Secondaire</p>
      <p style="font-size:10px;color:#999;margin-top:8px;">N° ${paiement.id} · ${new Date(paiement.datePaiement).toLocaleDateString('fr-FR')}</p></div>
      <div class="row"><span class="label">Élève</span><span class="value">${eleve.nom} ${eleve.postnom} ${eleve.prenom}</span></div>
      <div class="row"><span class="label">Classe</span><span class="value">${eleve.classe}</span></div>
      <div class="row"><span class="label">Catégorie</span><span class="value">${categorie?.designation||'-'}</span></div>
      <div class="row"><span class="label">Frais</span><span class="value">${frais?.designation||'-'}</span></div>
      <div class="row"><span class="label">Montant dû</span><span class="value">${frais?.montant||0} $</span></div>
      <div class="row"><span class="label">Mode</span><span class="value">${paiement.mode}</span></div>
      <div class="total"><div class="label">Montant payé</div><div class="amount">${paiement.montantPaye} $</div></div>
      <div class="stamp">Payé</div>
      <div class="footer"><p>Ce reçu fait foi de paiement.</p><p>Imprimé le ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}</p></div>
    </body></html>
  `);
  w.document.close(); w.focus();
  setTimeout(() => w.print(), 500);
}

export default function Paiements() {
  const {
    eleves,
    classes,
    annees,
    categoriesFrais: categories,
    frais,
    fraisConcerner: fraisClasses,
    paiements: paiementsRaw,
    inscriptions,
    loading,
    error,
    reload,
  } = useSchoolData();

  const { anneeId, setAnneeId } = useAnneeScolaire();
  const selectedAnnee = anneeId ?? 0;

  const CLASSES = useMemo(() => classes.map((c) => c.nom), [classes]);
  const ANNEES_SCOLAIRES = useMemo(
    () => annees.map((a) => ({ id: a.id, label: a.designation })),
    [annees],
  );
  const paiements = useMemo(
    () => paiementsRaw.map((p) => {
      const ins = inscriptions.find((i) => i.id === p.inscriptionId);
      return { ...p, eleveId: ins?.eleveId, montantPaye: p.montant };
    }),
    [paiementsRaw, inscriptions],
  );

  const [activePart, setActivePart] = useState('cuisine');
  const [searchCuisine, setSearchCuisine] = useState('');
  const [searchPaiement, setSearchPaiement] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('Toutes');
  const [filterClasse, setFilterClasse] = useState('Toutes');

  const [modalCatAdd, setModalCatAdd] = useState(false);
  const [modalCatEdit, setModalCatEdit] = useState(null);
  const [modalCatDelete, setModalCatDelete] = useState(null);
  const [modalFraisAdd, setModalFraisAdd] = useState(false);
  const [modalFraisEdit, setModalFraisEdit] = useState(null);
  const [modalFraisDelete, setModalFraisDelete] = useState(null);
  const [modalAffectAdd, setModalAffectAdd] = useState(false);
  const [modalPaiement, setModalPaiement] = useState(false);
  const [modalRecu, setModalRecu] = useState(null);

  const [formCat, setFormCat] = useState({ designation: '' });
  const [formFrais, setFormFrais] = useState({ designation: '', categorieId: 1, montant: '' });
  const [formAffect, setFormAffect] = useState({ fraisId: '', classeId: '', anneeScolaireId: 4 });
  const [formPaiement, setFormPaiement] = useState({ eleveId: '', fraisId: '', montantPaye: '', datePaiement: new Date().toISOString().split('T')[0], mode: 'Espèces' });
  const [selectedEleve, setSelectedEleve] = useState(null);

  const stats = useMemo(() => {
    const totalFrais = fraisClasses.reduce((s, f) => s + (f.montant || 0), 0);
    const totalPaiements = paiements.reduce((s, p) => s + (p.montantPaye ?? p.montant ?? 0), 0);
    return { totalFrais, totalPaiements, totalEleves: eleves.length, totalPaye: paiements.length };
  }, [fraisClasses, paiements, eleves]);

  const fraisFiltres = useMemo(() => {
    let data = [...frais];
    if (searchCuisine.trim()) data = data.filter((f) => f.designation.toLowerCase().includes(searchCuisine.toLowerCase()));
    if (filterCategorie !== 'Toutes') data = data.filter((f) => f.categorieId === parseInt(filterCategorie));
    return data;
  }, [frais, searchCuisine, filterCategorie]);

  const fraisParClasse = useMemo(() => {
    const map = {};
    CLASSES.forEach((clNom) => {
      const cls = classes.find((c) => c.nom === clNom);
      const affects = fraisClasses.filter(
        (fc) => fc.classeId === cls?.id && fc.anneeScolaireId === selectedAnnee,
      );
      const listeFrais = affects.map((fc) => {
        const f = frais.find((fr) => fr.id === fc.fraisId);
        const cat = categories.find((c) => c.id === (f?.categorieFraisId ?? f?.categorieId));
        return { ...f, montant: fc.montant ?? f?.montant, categorie: cat?.designation };
      }).filter(Boolean);
      const total = listeFrais.reduce((s, f) => s + (f.montant || 0), 0);
      map[clNom] = { frais: listeFrais, total };
    });
    return map;
  }, [fraisClasses, frais, categories, selectedAnnee, CLASSES, classes]);

  const elevesFiltres = useMemo(() => {
    let data = [...eleves];
    if (searchPaiement.trim()) {
      const q = searchPaiement.toLowerCase();
      data = data.filter((e) => `${e.nom} ${e.postnom} ${e.prenom}`.toLowerCase().includes(q) || e.classe.toLowerCase().includes(q));
    }
    if (filterClasse !== 'Toutes') data = data.filter((e) => e.classe === filterClasse);
    return data;
  }, [eleves, searchPaiement, filterClasse]);

  const getFraisEleve = (eleve) => {
    const ins = inscriptions.find(
      (i) => i.eleveId === eleve.id && i.anneeScolaireId === selectedAnnee,
    );
    const affects = fraisClasses.filter(
      (fc) => fc.classeId === ins?.classeId && fc.anneeScolaireId === selectedAnnee,
    );
    return affects.map((fc) => {
      const f = frais.find((fr) => fr.id === fc.fraisId);
      const cat = categories.find((c) => c.id === (f?.categorieFraisId ?? f?.categorieId));
      const montant = fc.montant ?? f?.montant ?? 0;
      const paye = paiements
        .filter((p) => p.inscriptionId === ins?.id && p.fraisConcernerClasseId === fc.id)
        .reduce((s, p) => s + (p.montantPaye ?? p.montant ?? 0), 0);
      const reste = montant - paye;
      return { ...f, montant, categorie: cat?.designation, paye, reste, fraisConcernerClasseId: fc.id };
    }).filter(Boolean);
  };

  const handleAddCat = async (e) => {
    e.preventDefault();
    try {
      await createOne('categorieFrais', { designation: formCat.designation });
      await reload();
      setModalCatAdd(false); setFormCat({ designation: '' });
    } catch (err) { console.error(err); }
  };

  const handleEditCat = async (e) => {
    e.preventDefault();
    try {
      await updateOne('categorieFrais', modalCatEdit.id, { designation: formCat.designation });
      await reload();
      setModalCatEdit(null);
    } catch (err) { console.error(err); }
  };

  const handleDeleteCat = async () => {
    try {
      await deleteOne('categorieFrais', modalCatDelete.id);
      await reload();
    } catch (err) { console.error(err); }
    setModalCatDelete(null);
  };

  const handleAddFrais = async (e) => {
    e.preventDefault();
    try {
      await createOne('frais', {
        designation: formFrais.designation,
        categorieFraisId: parseInt(formFrais.categorieId),
      });
      await reload();
      setModalFraisAdd(false); setFormFrais({ designation: '', categorieId: 1, montant: '' });
    } catch (err) { console.error(err); }
  };

  const handleEditFrais = async (e) => {
    e.preventDefault();
    try {
      await updateOne('frais', modalFraisEdit.id, {
        designation: formFrais.designation,
        categorieFraisId: parseInt(formFrais.categorieId),
      });
      await reload();
      setModalFraisEdit(null);
    } catch (err) { console.error(err); }
  };

  const handleDeleteFrais = async () => {
    try {
      await deleteOne('frais', modalFraisDelete.id);
      await reload();
    } catch (err) { console.error(err); }
    setModalFraisDelete(null);
  };

  const handleAddAffect = async (e) => {
    e.preventDefault();
    const cls = classes.find((c) => c.nom === formAffect.classeId || c.id === parseInt(formAffect.classeId));
    try {
      await createOne('fraisConcernerClasse', {
        montant: parseFloat(formFrais.montant) || 0,
        fraisId: parseInt(formAffect.fraisId),
        classeId: cls?.id ?? parseInt(formAffect.classeId),
        anneeScolaireId: parseInt(formAffect.anneeScolaireId),
      });
      await reload();
    } catch (err) { console.error(err); }
    setModalAffectAdd(false); setFormAffect({ fraisId: '', classeId: '', anneeScolaireId: anneeId ?? 0 });
  };

  const handlePaiement = async (e) => {
    e.preventDefault();
    const eleveId = parseInt(formPaiement.eleveId);
    const ins = inscriptions.find((i) => i.eleveId === eleveId && i.anneeScolaireId === selectedAnnee);
    const fc = fraisClasses.find(
      (f) => f.fraisId === parseInt(formPaiement.fraisId) && f.classeId === ins?.classeId,
    );
    const fraisItem = frais.find((f) => f.id === parseInt(formPaiement.fraisId));
    const montantDu = fc?.montant ?? fraisItem?.montant ?? 0;
    const dejaPaye = paiements
      .filter((p) => p.inscriptionId === ins?.id && p.fraisConcernerClasseId === fc?.id)
      .reduce((s, p) => s + (p.montantPaye ?? p.montant ?? 0), 0);
    const reste = montantDu - dejaPaye;
    const montantPaye = parseFloat(formPaiement.montantPaye);
    if (montantPaye > reste) { alert(`Le montant ne peut pas dépasser le dû restant (${reste} $)`); return; }
    try {
      const created = await createOne('paiement', {
        inscriptionId: ins?.id,
        fraisConcernerClasseId: fc?.id,
        montant: montantPaye,
        datePaiement: formPaiement.datePaiement,
      });
      await reload();
      const eleve = eleves.find((e) => e.id === eleveId);
      const cat = categories.find((c) => c.id === (fraisItem?.categorieFraisId ?? fraisItem?.categorieId));
      setModalRecu({
        paiement: { ...created, montantPaye, mode: formPaiement.mode },
        eleve, frais: fraisItem, categorie: cat,
      });
      setModalPaiement(false);
      setFormPaiement({ eleveId: '', fraisId: '', montantPaye: '', datePaiement: new Date().toISOString().split('T')[0], mode: 'Espèces' });
    } catch (err) { console.error(err); }
  };

  const openPaiementModal = (eleve) => {
    setSelectedEleve(eleve);
    setFormPaiement((f) => ({ ...f, eleveId: eleve.id }));
    setModalPaiement(true);
  };


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

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-sans">Gestion des paiements</h1>
          <p className="text-[#62627a] text-sm mt-1">{stats.totalFrais} $ en frais · {stats.totalPaiements} $ collectés · {stats.totalPaye} transactions</p>
        </div>
        <div className="flex bg-[#111116] border border-[#222233] rounded-xl p-1 gap-0.5">
          <button onClick={() => setActivePart('cuisine')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm  transition-all ${activePart === 'cuisine' ? 'bg-[#1b2e1f] text-[#fffff] shadow-inner' : 'text-[#55556d] hover:text-[#a0a0b0]'}`}>
            <Layers size={16} /> Gestion des frais
          </button>
          <button onClick={() => setActivePart('paiement')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm  transition-all ${activePart === 'paiement' ? 'bg-[#132c3f] text-[#f4f4f4] shadow-inner' : 'text-[#55556d] hover:text-[#a0a0b0]'}`}>
            <CreditCard size={16} /> Enregistrement
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          PARTIE 1 : CUISINE DES FRAIS
      ════════════════════════════════════════════════════════════════════ */}
      {activePart === 'cuisine' && (
        <div className="space-y-6">

          {/* Catégories */}
          <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                
                <div>
                  <h2 className="text-white font-bold text-base tracking-tight">Catégories de frais</h2>
                  <p className="text-[#44445a] text-xs">{categories.length} catégorie{categories.length > 1 ? 's' : ''}</p>
                </div>
              </div>
              <button onClick={() => setModalCatAdd(true)}
                     className="flex items-center gap-2.5 px-6 py-3.5 text-sm  transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                      style={{
                        background:  '#4ade80',
                        color:       '#09090e'
              
                      }}
                >
                <Plus size={14} /> Ajouter
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {categories.map((cat) => {
                const count = frais.filter((f) => f.categorieId === cat.id).length;
                return (
                  <div key={cat.id} className="group flex items-center gap-3 bg-[#09090e] border border-[#222233] rounded-xl px-4 py-3 hover:border-[#2d2d3f] transition-all">
                    <div className="w-8 h-8 rounded-lg bg-[#1e1b4b] flex items-center justify-center text-[#818cf8]"><Layers size={14} /></div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white">{cat.designation}</p>
                      <p className="text-[10px] text-[#62627a]">{count} frais</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                      <button onClick={() => { setFormCat({ designation: cat.designation }); setModalCatEdit(cat); }}
                        className="p-1.5 rounded-lg text-[#818cf8] hover:bg-[#1e1b4b] hover:text-white transition-all"><Edit3 size={12} /></button>
                      <button onClick={() => setModalCatDelete(cat)}
                        className="p-1.5 rounded-lg text-[#f43f5e] hover:bg-[#3b1820] hover:text-white transition-all"><Trash2 size={12} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Frais */}
          <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-white font-bold text-base tracking-tight">Frais scolaires</h2>
                  <p className="text-[#44445a] text-xs">{fraisFiltres.length} frais · Total : {fraisFiltres.reduce((s, f) => s + f.montant, 0)} $</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative flex items-center bg-[#09090e] border border-[#222233] rounded-xl px-3 py-2 group focus-within:border-[#4ade80] transition-colors">
                  <Search size={14} className="text-[#55556d] group-focus-within:text-[#4ade80]" />
                  <input type="text" placeholder="Rechercher..." value={searchCuisine} onChange={(e) => setSearchCuisine(e.target.value)}
                    className="bg-transparent border-none outline-none pl-2 text-xs text-white placeholder-[#44445a] w-32" />
                </div>
                <FormSelect label="" value={filterCategorie} onChange={(e) => setFilterCategorie(e.target.value)}
                  options={['Toutes', ...categories.map((c) => ({ value: c.id, label: c.designation }))]} />
                <button onClick={() => setModalFraisAdd(true)}
                       className="flex items-center gap-2.5 px-6 py-3.5 text-sm  transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                      style={{
                        background:  '#4ade80',
                        color:       '#09090e'
              
                      }}>
                  <Plus size={14} /> Ajouter
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#1b1b26]">
                    <th className="px-4 py-3 text-[10px] font-bold text-[#62627a] uppercase">Désignation</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-[#62627a] uppercase">Catégorie</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-[#62627a] uppercase">Montant</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-[#62627a] uppercase">Classes</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-[#62627a] uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b1b26]">
                  {fraisFiltres.map((f) => {
                    const cat = categories.find((c) => c.id === f.categorieId);
                    const affects = fraisClasses.filter((fc) => fc.fraisId === f.id);
                    return (
                      <tr key={f.id} className="group hover:bg-[#16161c] transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-white">{f.designation}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-[#132c3f] border border-[#1b3d5c] text-[#38bdf8]">{cat?.designation || '-'}</span>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-[#fbbf24]">{f.montant} $</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {affects.length > 0 ? affects.map((fc) => (
                              <span key={fc.classeId} className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded bg-[#1e1b4b] text-[#818cf8] border border-[#2e2b6b]">{fc.classeId}</span>
                            )) : (<span className="text-[10px] text-[#44445a]">Non affecté</span>)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => { setFormFrais({ designation: f.designation, categorieId: f.categorieId, montant: f.montant }); setModalFraisEdit(f); }}
                              className="p-1.5 rounded-lg text-[#818cf8] hover:bg-[#1e1b4b] hover:text-white transition-all"><Edit3 size={12} /></button>
                            <button onClick={() => setModalFraisDelete(f)}
                              className="p-1.5 rounded-lg text-[#f43f5e] hover:bg-[#3b1820] hover:text-white transition-all"><Trash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Affectation par classe */}
          <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-white font-bold text-base tracking-tight">Affectation par classe</h2>
                  <p className="text-[#44445a] text-xs">Année {ANNEES_SCOLAIRES.find((a) => a.id === selectedAnnee)?.label}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FormSelect label="" value={selectedAnnee} onChange={(e) => setAnneeId(parseInt(e.target.value))}
                  options={ANNEES_SCOLAIRES.map((a) => ({ value: a.id, label: a.label }))} />
                <button onClick={() => setModalAffectAdd(true)}
                       className="flex items-center gap-2.5 px-6 py-3.5 text-sm  transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                        style={{
                          background:  '#4ade80',
                          color:       '#09090e'
                
                        }}>
                  <Plus size={14} /> Affecter
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {CLASSES.map((cl) => {
                const data = fraisParClasse[cl];
                const pct = data.total > 0 ? Math.min(100, (data.frais.length / 5) * 100) : 0;
                return (
                  <div key={cl} className="bg-[#09090e] border border-[#222233] rounded-xl p-4 hover:border-[#2d2d3f] transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-white">{cl}</span>
                      <span className="text-xs font-bold text-[#fbbf24]">{data.total} $</span>
                    </div>
                    <div className="space-y-1.5 mb-3">
                      {data.frais.length > 0 ? data.frais.map((f) => (
                        <div key={f.id} className="flex items-center justify-between text-[11px]">
                          <span className="text-[#a0a0b0] truncate">{f.designation}</span>
                          <span className="text-white font-medium">{f.montant} $</span>
                        </div>
                      )) : (<p className="text-[10px] text-[#44445a]">Aucun frais affecté</p>)}
                    </div>
                    <div className="h-1.5 rounded-full bg-[#1b1b26] overflow-hidden">
                      <div className="h-full rounded-full bg-[#4ade80] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          PARTIE 2 : ENREGISTREMENT DES PAIEMENTS
      ════════════════════════════════════════════════════════════════════ */}
      {activePart === 'paiement' && (
        <div className="space-y-6">
          <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-5">
            <div className="flex flex-col xl:flex-row xl:items-center gap-4">
              <div className="relative flex items-center bg-[#09090e] border border-[#222233] rounded-xl px-3.5 py-2.5 group focus-within:border-[#4ade80] transition-colors flex-1 max-w-md">
                <Search size={18} className="text-[#55556d] group-focus-within:text-[#4ade80] transition-colors" />
                <input type="text" placeholder="Rechercher un élève..." value={searchPaiement} onChange={(e) => setSearchPaiement(e.target.value)}
                  className="bg-transparent border-none outline-none pl-2.5 text-sm text-white placeholder-[#44445a] w-full" />
                {searchPaiement && (
                  <button onClick={() => setSearchPaiement('')} className="absolute right-3 text-[#55556d] hover:text-white"><X size={14} /></button>
                )}
              </div>
              <FormSelect label="" value={filterClasse} onChange={(e) => setFilterClasse(e.target.value)} options={['Toutes', ...CLASSES]} />
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-[11px] text-[#62627a]">Total payé :</span>
                <span className="text-sm font-bold text-[#4ade80]">{stats.totalPaiements} $</span>
              </div>
            </div>
          </div>

          <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#1b1b26]">
                    <th className="px-5 py-4 text-[11px] font-bold text-[#62627a] uppercase tracking-wider">Élève</th>
                    <th className="px-5 py-4 text-[11px] font-bold text-[#62627a] uppercase tracking-wider">Classe</th>
                    <th className="px-5 py-4 text-[11px] font-bold text-[#62627a] uppercase tracking-wider">Frais concernés</th>
                    <th className="px-5 py-4 text-[11px] font-bold text-[#62627a] uppercase tracking-wider">Total dû</th>
                    <th className="px-5 py-4 text-[11px] font-bold text-[#62627a] uppercase tracking-wider">Total payé</th>
                    <th className="px-5 py-4 text-[11px] font-bold text-[#62627a] uppercase tracking-wider">Reste</th>
                    <th className="px-5 py-4 text-[11px] font-bold text-[#62627a] uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b1b26]">
                  {elevesFiltres.map((eleve) => {
                    const fraisEleve = getFraisEleve(eleve);
                    const totalDu = fraisEleve.reduce((s, f) => s + (f.montant || 0), 0);
                    const totalPaye = fraisEleve.reduce((s, f) => s + f.paye, 0);
                    const reste = totalDu - totalPaye;
                    const pct = totalDu > 0 ? Math.round((totalPaye / totalDu) * 100) : 0;
                    return (
                      <tr key={eleve.id} className="group hover:bg-[#16161c] transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <img src={eleve.photo || `https://ui-avatars.com/api/?name=${eleve.nom}+${eleve.prenom}&background=1a1a26&color=fff`}
                              alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-[#222233]"
                              onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${eleve.nom}+${eleve.prenom}&background=1a1a26&color=fff`; }} />
                            <div>
                              <p className="text-sm font-bold text-white">{eleve.nom} {eleve.postnom} {eleve.prenom}</p>
                              <p className="text-[10px] text-[#62627a]">{eleve.sexe === 'M' ? '♂ Masculin' : '♀ Féminin'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#1e1b4b] border border-[#2e2b6b] text-[#818cf8]">
                            <School size={11} /> {eleve.classe}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1">
                            {fraisEleve.map((f) => (
                              <span key={f.id} className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded border ${f.reste === 0 ? 'bg-[#12241c] text-[#4ade80] border-[#1b3d2b]' : 'bg-[#3c2a16] text-[#fbbf24] border-[#4a3a20]'}`}>
                                {f.designation} ({f.reste === 0 ? '✓' : `${f.reste}$`})
                              </span>
                            ))}
                            {fraisEleve.length === 0 && <span className="text-[10px] text-[#44445a]">—</span>}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm font-bold text-white">{totalDu} $</td>
                        <td className="px-5 py-4 text-sm font-bold text-[#4ade80]">{totalPaye} $</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={`text-sm font-bold ${reste === 0 ? 'text-[#4ade80]' : 'text-[#f43f5e]'}`}>{reste} $</span>
                            <div className="h-1.5 rounded-full bg-[#1b1b26] overflow-hidden w-20">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: reste === 0 ? '#4ade80' : '#fbbf24' }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openPaiementModal(eleve)} disabled={fraisEleve.length === 0 || reste === 0}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${fraisEleve.length === 0 || reste === 0 ? 'bg-[#1a1a26] text-[#44445a] cursor-not-allowed' : 'bg-[#12241c] text-[#4ade80] border border-[#1b3d2b] hover:bg-[#1a3528] hover:text-white'}`}>
                              <Banknote size={13} /> Payer
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historique */}
          <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#132c3f] flex items-center justify-center text-[#38bdf8]"><Receipt size={18} /></div>
              <div>
                <h2 className="text-white font-bold text-base tracking-tight">Historique des paiements</h2>
                <p className="text-[#44445a] text-xs">{paiements.length} transaction{paiements.length > 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#1b1b26]">
                    <th className="px-4 py-3 text-[10px] font-bold text-[#62627a] uppercase">N°</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-[#62627a] uppercase">Élève</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-[#62627a] uppercase">Frais</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-[#62627a] uppercase">Montant</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-[#62627a] uppercase">Mode</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-[#62627a] uppercase">Date</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-[#62627a] uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b1b26]">
                  {[...paiements].reverse().map((p) => {
                    const eleve = eleves.find((e) => e.id === p.eleveId);
                    const f = frais.find((fr) => fr.id === p.fraisId);
                    return (
                      <tr key={p.id} className="hover:bg-[#16161c] transition-colors">
                        <td className="px-4 py-3 text-xs font-mono text-[#62627a]">#{p.id}</td>
                        <td className="px-4 py-3 text-xs text-white font-medium">{eleve?.nom} {eleve?.prenom}</td>
                        <td className="px-4 py-3 text-xs text-[#a0a0b0]">{f?.designation}</td>
                        <td className="px-4 py-3 text-xs font-bold text-[#4ade80]">{p.montantPaye} $</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded bg-[#1e1b4b] text-[#818cf8] border border-[#2e2b6b]">
                            <CreditCard size={9} className="mr-1" />{p.mode}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#62627a]">{new Date(p.datePaiement).toLocaleDateString('fr-FR')}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => { const cat = categories.find((c) => c.id === f?.categorieId); setModalRecu({ paiement: p, eleve, frais: f, categorie: cat }); }}
                              className="p-1.5 rounded-lg text-[#38bdf8] hover:bg-[#132c3f] hover:text-white transition-all" title="Voir reçu"><Receipt size={12} /></button>
                            <button onClick={() => { const cat = categories.find((c) => c.id === f?.categorieId); printReceipt(p, eleve, f, cat); }}
                              className="p-1.5 rounded-lg text-[#a0a0b0] hover:bg-[#1a1a26] hover:text-white transition-all" title="Imprimer"><Printer size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* ════════════════════════════════════════════════════════════════════
          MODALS
      ════════════════════════════════════════════════════════════════════ */}

      {/* Catégories */}
      <Modal isOpen={modalCatAdd} onClose={() => setModalCatAdd(false)} title="Ajouter une catégorie" maxWidth="max-w-sm">
        <form onSubmit={handleAddCat} className="space-y-4">
          <FormInput label="Désignation" value={formCat.designation} onChange={(e) => setFormCat({ designation: e.target.value })} placeholder="Ex: Frais connexes" required />
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1b1b26]">
            <button type="button" onClick={() => setModalCatAdd(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#a0a0b0] hover:text-white hover:bg-[#1a1a26] transition-colors">Annuler</button>
            <button type="submit"      className="flex items-center gap-2.5 px-6 py-3.5 text-sm  transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background:  '#4ade80',
                color:       '#09090e'
      
              }}><Save size={16} /> Enregistrer</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!modalCatEdit} onClose={() => setModalCatEdit(null)} title="Modifier la catégorie" maxWidth="max-w-sm">
        <form onSubmit={handleEditCat} className="space-y-4">
          <FormInput label="Désignation" value={formCat.designation} onChange={(e) => setFormCat({ designation: e.target.value })} required />
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1b1b26]">
            <button type="button" onClick={() => setModalCatEdit(null)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#a0a0b0] hover:text-white hover:bg-[#1a1a26] transition-colors">Annuler</button>
            <button type="submit"                         className="flex items-center gap-2.5 px-6 py-3.5 text-sm  transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background:  '#4ade80',
                color:       '#09090e'
      
              }}><Save size={16} /> Mettre à jour</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!modalCatDelete} onClose={() => setModalCatDelete(null)} title="Confirmer" maxWidth="max-w-sm">
        {modalCatDelete && (
          <div className="space-y-4">
            <p className="text-sm text-[#a0a0b0]">Supprimer <span className="text-white font-bold">{modalCatDelete.designation}</span> ?</p>
            <div className="bg-[#3b1820]/30 border border-[#441d22]/40 rounded-xl p-3">
              <p className="text-xs text-[#f43f5e]">Les frais de cette catégorie seront aussi supprimés.</p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setModalCatDelete(null)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#a0a0b0] hover:text-white hover:bg-[#1a1a26] transition-colors">Annuler</button>
              <button onClick={handleDeleteCat} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-[#3b1820] text-[#f43f5e] border border-[#441d22] hover:bg-[#4a2028] hover:text-white transition-all"><Trash2 size={16} /> Supprimer</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Frais */}
      <Modal isOpen={modalFraisAdd} onClose={() => setModalFraisAdd(false)} title="Ajouter un frais" maxWidth="max-w-md">
        <form onSubmit={handleAddFrais} className="space-y-4">
          <FormInput label="Désignation" value={formFrais.designation} onChange={(e) => setFormFrais({ ...formFrais, designation: e.target.value })} placeholder="Ex: Minerval" required />
          <div className="grid grid-cols-2 gap-4">
            <FormSelect label="Catégorie" value={formFrais.categorieId} onChange={(e) => setFormFrais({ ...formFrais, categorieId: parseInt(e.target.value) })} options={categories.map((c) => ({ value: c.id, label: c.designation }))} required />
            <FormInput label="Montant ($)" type="number" value={formFrais.montant} onChange={(e) => setFormFrais({ ...formFrais, montant: e.target.value })} placeholder="150" required min="0" step="0.01" icon={DollarSign} />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1b1b26]">
            <button type="button" onClick={() => setModalFraisAdd(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#a0a0b0] hover:text-white hover:bg-[#1a1a26] transition-colors">Annuler</button>
            <button type="submit"      className="flex items-center gap-2.5 px-6 py-3.5 text-sm  transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background:  '#4ade80',
                color:       '#09090e'
      
              }}><Save size={16} /> Enregistrer</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!modalFraisEdit} onClose={() => setModalFraisEdit(null)} title="Modifier le frais" maxWidth="max-w-md">
        <form onSubmit={handleEditFrais} className="space-y-4">
          <FormInput label="Désignation" value={formFrais.designation} onChange={(e) => setFormFrais({ ...formFrais, designation: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <FormSelect label="Catégorie" value={formFrais.categorieId} onChange={(e) => setFormFrais({ ...formFrais, categorieId: parseInt(e.target.value) })} options={categories.map((c) => ({ value: c.id, label: c.designation }))} required />
            <FormInput label="Montant ($)" type="number" value={formFrais.montant} onChange={(e) => setFormFrais({ ...formFrais, montant: e.target.value })} required min="0" step="0.01" icon={DollarSign} />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1b1b26]">
            <button type="button" onClick={() => setModalFraisEdit(null)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#a0a0b0] hover:text-white hover:bg-[#1a1a26] transition-colors">Annuler</button>
            <button type="submit"                         className="flex items-center gap-2.5 px-6 py-3.5 text-sm  transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background:  '#4ade80',
                color:       '#09090e'
      
              }}><Save size={16} /> Mettre à jour</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!modalFraisDelete} onClose={() => setModalFraisDelete(null)} title="Confirmer" maxWidth="max-w-sm">
        {modalFraisDelete && (
          <div className="space-y-4">
            <p className="text-sm text-[#a0a0b0]">Supprimer <span className="text-white font-bold">{modalFraisDelete.designation}</span> ({modalFraisDelete.montant}$) ?</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setModalFraisDelete(null)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#a0a0b0] hover:text-white hover:bg-[#1a1a26] transition-colors">Annuler</button>
              <button onClick={handleDeleteFrais}                         className="flex items-center gap-2.5 px-6 py-3.5 text-sm  transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background:  '#861200',
                color:       '#e8e8e8'
      
              }}><Trash2 size={16} /> Supprimer</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Affectation */}
      <Modal isOpen={modalAffectAdd} onClose={() => setModalAffectAdd(false)} title="Affecter un frais" maxWidth="max-w-md">
        <form onSubmit={handleAddAffect} className="space-y-4">
          <FormSelect label="Frais" value={formAffect.fraisId} onChange={(e) => setFormAffect({ ...formAffect, fraisId: e.target.value })} options={[{ value: '', label: 'Sélectionner...' }, ...frais.map((f) => ({ value: f.id, label: `${f.designation} (${f.montant}$)` }))]} required />
          <FormSelect label="Classe" value={formAffect.classeId} onChange={(e) => setFormAffect({ ...formAffect, classeId: e.target.value })} options={['Sélectionner...', ...CLASSES]} required />
          <FormSelect label="Année scolaire" value={formAffect.anneeScolaireId} onChange={(e) => setFormAffect({ ...formAffect, anneeScolaireId: parseInt(e.target.value) })} options={ANNEES_SCOLAIRES.map((a) => ({ value: a.id, label: a.label }))} required />
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1b1b26]">
            <button type="button" onClick={() => setModalAffectAdd(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#a0a0b0] hover:text-white hover:bg-[#1a1a26] transition-colors">Annuler</button>
            <button type="submit"      className="flex items-center gap-2.5 px-6 py-3.5 text-sm  transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background:  '#4ade80',
                color:       '#09090e'
      
              }}><Save size={16} /> Affecter</button>
          </div>
        </form>
      </Modal>

      {/* Paiement */}
      <Modal isOpen={modalPaiement} onClose={() => setModalPaiement(false)} title={selectedEleve ? `Paiement — ${selectedEleve.nom} ${selectedEleve.prenom}` : 'Paiement'} maxWidth="max-w-md">
        {selectedEleve && (
          <form onSubmit={handlePaiement} className="space-y-4">
            <div className="bg-[#09090e] border border-[#1b1b26] rounded-xl p-4 flex items-center gap-3">
              <img src={selectedEleve.photo || `https://ui-avatars.com/api/?name=${selectedEleve.nom}+${selectedEleve.prenom}&background=1a1a26&color=fff`}
                alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-[#222233]"
                onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${selectedEleve.nom}+${selectedEleve.prenom}&background=1a1a26&color=fff`; }} />
              <div>
                <p className="text-sm font-bold text-white">{selectedEleve.nom} {selectedEleve.prenom}</p>
                <p className="text-xs text-[#62627a]">{selectedEleve.classe} · {ANNEES_SCOLAIRES.find((a) => a.id === selectedAnnee)?.label}</p>
              </div>
            </div>
            {(() => {
              const fraisEleve = getFraisEleve(selectedEleve).filter((f) => f.reste > 0);
              if (fraisEleve.length === 0) return <p className="text-sm text-[#62627a] text-center py-4">Tous les frais sont soldés.</p>;
              return (
                <>
                  <FormSelect label="Frais à payer" value={formPaiement.fraisId} onChange={(e) => setFormPaiement({ ...formPaiement, fraisId: e.target.value })} required
                    options={[{ value: '', label: 'Sélectionner...' }, ...fraisEleve.map((f) => ({ value: f.id, label: `${f.designation} — Dû: ${f.reste}$ / ${f.montant}$` }))]} />
                  {formPaiement.fraisId && (
                    <div className="bg-[#3c2a16]/30 border border-[#4a3a20]/40 rounded-xl p-3">
                      <p className="text-xs text-[#fbbf24]">Reste à payer : <span className="font-bold">{fraisEleve.find((f) => f.id === parseInt(formPaiement.fraisId))?.reste}$</span></p>
                    </div>
                  )}
                  <FormInput label="Montant payé ($)" type="number" value={formPaiement.montantPaye} onChange={(e) => setFormPaiement({ ...formPaiement, montantPaye: e.target.value })} placeholder="0.00" required min="0.01" step="0.01" icon={DollarSign} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormInput label="Date de paiement" type="date" value={formPaiement.datePaiement} onChange={(e) => setFormPaiement({ ...formPaiement, datePaiement: e.target.value })} required icon={CalendarDays} />
                    <FormSelect label="Mode de paiement" value={formPaiement.mode} onChange={(e) => setFormPaiement({ ...formPaiement, mode: e.target.value })} options={MODES_PAIEMENT} required />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1b1b26]">
                    <button type="button" onClick={() => setModalPaiement(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#a0a0b0] hover:text-white hover:bg-[#1a1a26] transition-colors">Annuler</button>
                    <button type="submit" className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-[#12241c] text-[#4ade80] border border-[#1b3d2b] hover:bg-[#1a3528] hover:text-white transition-all">
                      <Banknote size={16} /> Confirmer le paiement
                    </button>
                  </div>
                </>
              );
            })()}
          </form>
        )}
      </Modal>

      {/* Reçu */}
      <Modal isOpen={!!modalRecu} onClose={() => setModalRecu(null)} title="Reçu de paiement" maxWidth="max-w-md">
        {modalRecu && (
          <div className="space-y-5">
            <div className="bg-[#09090e] border border-[#1b1b26] rounded-xl p-5 text-center">
              <div className="w-16 h-16 rounded-full bg-[#12241c] border border-[#1b3d2b] flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={28} className="text-[#4ade80]" />
              </div>
              <h4 className="text-lg font-bold text-white">Paiement confirmé</h4>
              <p className="text-xs text-[#62627a] mt-1">N° {modalRecu.paiement.id} · {new Date(modalRecu.paiement.datePaiement).toLocaleDateString('fr-FR')}</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-[#62627a]">Élève</span><span className="text-white font-medium">{modalRecu.eleve?.nom} {modalRecu.eleve?.prenom}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#62627a]">Classe</span><span className="text-white font-medium">{modalRecu.eleve?.classe}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#62627a]">Catégorie</span><span className="text-[#38bdf8] font-medium">{modalRecu.categorie?.designation}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#62627a]">Frais</span><span className="text-white font-medium">{modalRecu.frais?.designation}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#62627a]">Mode</span><span className="text-[#818cf8] font-medium">{modalRecu.paiement.mode}</span></div>
              <div className="border-t border-dashed border-[#222233] my-3" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#62627a] uppercase tracking-wider">Montant payé</span>
                <span className="text-2xl font-bold text-[#4ade80]">{modalRecu.paiement.montantPaye} $</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1b1b26]">
              <button onClick={() => setModalRecu(null)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#a0a0b0] hover:text-white hover:bg-[#1a1a26] transition-colors">Fermer</button>
              <button onClick={() => printReceipt(modalRecu.paiement, modalRecu.eleve, modalRecu.frais, modalRecu.categorie)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-[#132c3f] text-[#38bdf8] border border-[#1b3d5c] hover:bg-[#1a3d54] hover:text-white transition-all">
                <Printer size={16} /> Imprimer le reçu
              </button>
            </div>
          </div>
        )}
      </Modal>
      </>
      )}
    </div>
  );
}
