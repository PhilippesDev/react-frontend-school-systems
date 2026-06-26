import React, { useMemo } from 'react';
import { 
  Search, 
  Calendar, 
  Bell, 
  Share2, 
  ExternalLink, 
  Users, 
  School, 
  Sliders, 
  Percent, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Plus,
} from 'lucide-react';
import Timeline from '@/components/timeline';
import Graphiques from '@/components/Graphiques';
import { useSchoolData } from '@/hooks/useSchoolData';
import { useAnneeScolaire } from '@/context/AnneeScolaireContext';
import { computePaymentProgress } from '@/lib/schoolJoins';

export default function Dashboard() {
  const {
    eleves,
    classes,
    options,
    annees,
    inscriptions,
    fraisConcerner,
    paiements,
    loading,
  } = useSchoolData();

  const { anneeId, setAnneeId } = useAnneeScolaire();

  const selectedYear = useMemo(
    () => annees.find((a) => a.id === anneeId) ?? null,
    [annees, anneeId],
  );

  const statsData = useMemo(() => {
    const totalPaid = paiements.reduce((s, p) => s + (p.montant ?? 0), 0);
    const totalDue = inscriptions.reduce((sum, ins) => {
      const due = fraisConcerner
        .filter((f) => f.classeId === ins.classeId && f.anneeScolaireId === ins.anneeScolaireId)
        .reduce((s, f) => s + (f.montant ?? 0), 0);
      return sum + due;
    }, 0);
    const remaining = Math.max(0, totalDue - totalPaid);
    const paidCount = eleves.filter(
      (e) => computePaymentProgress(e.id, inscriptions, fraisConcerner, paiements, anneeId) === 100,
    ).length;
    const reinscRate = eleves.length ? ((paidCount / eleves.length) * 100).toFixed(1) : '0';

    return [
      { id: 'eleves', label: 'Elèves', value: String(eleves.length), trend: '—', isPositive: true, icon: Users, iconBg: 'bg-[#132c3f]', iconColor: 'text-[#38bdf8]' },
      { id: 'classes', label: 'Classes', value: String(classes.length).padStart(2, '0'), trend: '—', isPositive: true, icon: School, iconBg: 'bg-[#2e163d]', iconColor: 'text-[#c084fc]' },
      { id: 'options', label: 'Options', value: String(options.length).padStart(2, '0'), trend: '—', isPositive: true, icon: Sliders, iconBg: 'bg-[#1e1b4b]', iconColor: 'text-[#818cf8]' },
      { id: 'reinscription', label: 'Réinscription', value: `${reinscRate}%`, trend: '—', isPositive: true, icon: Percent, iconBg: 'bg-[#3c2a16]', iconColor: 'text-[#fbbf24]' },
      { id: 'paye', label: 'Total payé', value: `${totalPaid} $`, trend: '—', isPositive: true, icon: CheckCircle2, iconBg: 'bg-[#103024]', iconColor: 'text-[#4ade80]' },
      { id: 'restant', label: 'Montant restant', value: `${remaining} $`, trend: '—', isPositive: false, icon: AlertCircle, iconBg: 'bg-[#3b1820]', iconColor: 'text-[#f43f5e]' },
    ];
  }, [eleves, classes, options, inscriptions, fraisConcerner, paiements, anneeId]);

  return (
    <div className="min-h-screen bg-[#09090e] text-white p-8 pl-12">
      
      {/* HEADER : Titre, Recherche, Actions & Avatars */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-10">
        
        {/* Titre principal */}
        <h1 className="text-3xl font-bold tracking-tight text-white font-sans">
          Dashboard
        </h1>

        {/* Barre d'outils droite */}
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Barre de recherche style macOS / Pro */}
          <div className="relative flex items-center bg-[#111116] border border-[#222233] rounded-xl px-3.5 py-2 group focus-within:border-green-500 transition-colors">
            <Search size={18} className="text-[#55556d] group-focus-within:text-green-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-transparent border-none outline-none pl-2.5 pr-12 text-sm text-white placeholder-[#55556d] w-44 focus:w-56 transition-all duration-300"
            />
            <span className="absolute right-3 text-[10px] font-mono bg-[#1a1a26] border border-[#2d2d3f] px-1.5 py-0.5 rounded text-[#787890] select-none">
              ⌘ F
            </span>
          </div>

          {/* Bouton Calendrier */}
          <button className="p-2.5 bg-[#111116] border border-[#222233] rounded-xl text-[#a0a0b0] hover:text-white hover:bg-[#1a1a26] transition-colors">
            <Calendar size={18} />
          </button>

          {/* Bouton Notification */}
          <button className="p-2.5 bg-[#111116] border border-[#222233] rounded-xl text-[#a0a0b0] hover:text-white hover:bg-[#1a1a26] relative transition-colors">
            <Bell size={18} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-green-500 rounded-full ring-2 ring-[#111116]" />
          </button>

          {/* Stack d'avatars équipe pédagogique / direction */}
          <div className="flex items-center pl-2">
            <div className="flex -space-x-2.5 overflow-hidden">
              <img className="inline-block h-8 w-8 rounded-full ring-2 ring-[#09090e] object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80" alt="Staff 1" />
              <img className="inline-block h-8 w-8 rounded-full ring-2 ring-[#09090e] object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80" alt="Staff 2" />
              <img className="inline-block h-8 w-8 rounded-full ring-2 ring-[#09090e] object-cover" src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&q=80" alt="Staff 3" />
            </div>
            <button className="ml-2.5 p-1.5 bg-[#111116] border border-[#222233] rounded-full text-[#787890] hover:text-white hover:bg-[#1a1a26] transition-colors">
              <Plus size={14} />
            </button>
          </div>

          {/* Bouton Partager (Share) */}
          <button className="flex items-center gap-2 bg-[#111116] border border-[#222233] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#1a1a26] transition-colors">
            <Share2 size={16} className="text-[#a0a0b0]" />
            <span>Share</span>
          </button>

        </div>
      </div>

    <Timeline
      schoolYears={annees}
      selectedYear={selectedYear}
      onYearChange={(year) => setAnneeId(year.id)}
    />

      
      {/* SECTION DES CARTES STATISTIQUES (Grid Responsive Équilibrée) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {statsData.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <div 
              key={stat.id}
              className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-5 flex flex-col justify-between hover:border-[#2d2d3f] transition-all duration-300"
            >
              {/* Top Card Section */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  {/* Conteneur de l'icône */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stat.iconBg} ${stat.iconColor}`}>
                    <IconComponent size={22} />
                  </div>
                  
                  {/* Valeurs numériques et labels */}
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold tracking-tight text-white">
                      {stat.value}
                    </span>
                    <span className="text-xs text-[#62627a] font-medium mt-0.5 whitespace-nowrap">
                      {stat.label}
                    </span>
                  </div>
                </div>

                {/* Pillule de croissance/tendance */}
                <div className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border
                  ${stat.isPositive 
                    ? 'bg-[#12241c] text-[#4ade80] border-[#1b3d2b]' 
                    : 'bg-[#291415] text-[#f43f5e] border-[#441d22]'
                  }`}
                >
                  {stat.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span>{stat.trend}</span>
                </div>
              </div>

              {/* Ligne de séparation en pointillés (Exactement comme sur l'image) */}
              <div className="border-t border-dashed border-[#222233] my-4 w-full" />

              {/* Bottom Card Section (View Details) */}
              <div className="flex items-center justify-between text-xs text-[#62627a] hover:text-white transition-colors cursor-pointer group/link">
                <span className="font-medium group-hover/link:underline">View Details</span>
                <ExternalLink size={14} className="text-[#4b4b5e] group-hover/link:text-white transition-colors" />
              </div>

            </div>
          );
        })}
      </div>

    <br />
    <br />
      {/* SECTION DES GRAPHIQUES (Répartition par genre) */}
      <Graphiques />

    </div>
  );
}