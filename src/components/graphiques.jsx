import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Users, BookOpen } from 'lucide-react';
import { useSchoolData } from '../hooks/useSchoolData';

// ─────────────────────────────────────────────────────────────────────────────
//  Palettes vertes — tonalités distinctes pour chaque classe / option
// ─────────────────────────────────────────────────────────────────────────────
const CLASS_COLORS = {
  '7ème A': '#14532d',
  '7ème B': '#15803d',
  '7ème C': '#86efac',
  '8ème A': '#052e16',
  '8ème B': '#16a34a',
  '8ème C': '#4ade80',
  '1ère A': '#bbf7d0',
  '1ère B': '#22c55e',
  '1ère C': '#166534',
  '2ème A': '#4ade80',
  '2ème B': '#14532d',
  '2ème C': '#15803d',
  '3ème A': '#16a34a',
  '3ème B': '#86efac',
  '3ème C': '#bbf7d0',
  '4ème A': '#22c55e',
  '4ème B': '#166534',
  '4ème C': '#4ade80',
};

const OPTION_COLORS = {
  'Sciences':      '#22c55e',
  'Lettres':       '#15803d',
  'Mathématiques': '#166534',
  'Commerce':      '#4ade80',
  'Arts':          '#86efac',
};

// Ordre canonique des classes pour l'axe X
const CLASS_ORDER = [
  '7ème A','7ème B','7ème C',
  '8ème A','8ème B','8ème C',
  '1ère A','1ère B','1ère C',
  '2ème A','2ème B','2ème C',
  '3ème A','3ème B','3ème C',
  '4ème A','4ème B','4ème C',
];

// Abréviation affichée sur l'axe X (ex. "7ème A" → "7A")
const abbrev = (label) =>
  label
    .replace('ème ', '')
    .replace('ère ', '')
    .replace(' ', '');

// ─────────────────────────────────────────────────────────────────────────────
//  Tooltip personnalisé pour le BarChart
// ─────────────────────────────────────────────────────────────────────────────
const BarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="bg-[#161620] rounded-xl px-4 py-3 shadow-2xl"
      style={{ border: `1px solid ${d.color}40` }}
    >
      <p className="text-xs font-bold mb-1" style={{ color: d.color }}>
        {d.fullLabel}
      </p>
      <p className="text-white text-sm font-semibold">
        {d.count} élève{d.count > 1 ? 's' : ''}
      </p>
      {d.garcons !== undefined && (
        <div className="mt-1.5 space-y-0.5">
          <p className="text-[11px] text-[#22c55e]">♂ {d.garcons} garçon{d.garcons > 1 ? 's' : ''}</p>
          <p className="text-[11px] text-[#f9a8d4]">♀ {d.filles} fille{d.filles > 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Composant principal
// ─────────────────────────────────────────────────────────────────────────────
export default function Graphiques() {
  const [activeView, setActiveView] = useState('classe');
  const { eleves, activeAnnee, loading } = useSchoolData({
    keys: ['eleve', 'inscription', 'classe', 'option', 'anneeScolaire'],
  });

  // ── Agrégation des données depuis l'API ──────────────────────────────────
  const { barData, pieData, totalM, totalF, total } = useMemo(() => {
    const list = eleves;

    // Genre global
    const totalM = eleves.filter((e) => e.sexe === 'M').length;
    const totalF = eleves.filter((e) => e.sexe === 'F').length;
    const total  = eleves.length;

    // ── Par classe ──────────────────────────────────────────────────────────
    let barData;
    if (activeView === 'classe') {
      const counts = {};
      const mCounts = {};
      const fCounts = {};

      eleves.forEach((e) => {
        counts[e.classe]  = (counts[e.classe]  || 0) + 1;
        mCounts[e.classe] = (mCounts[e.classe] || 0) + (e.sexe === 'M' ? 1 : 0);
        fCounts[e.classe] = (fCounts[e.classe] || 0) + (e.sexe === 'F' ? 1 : 0);
      });

      barData = CLASS_ORDER.map((c) => ({
        name:      abbrev(c),
        fullLabel: c,
        count:     counts[c]  || 0,
        garcons:   mCounts[c] || 0,
        filles:    fCounts[c] || 0,
        color:     CLASS_COLORS[c] || '#22c55e',
      }));

    // ── Par option ──────────────────────────────────────────────────────────
    } else {
      const counts = {};
      const mCounts = {};
      const fCounts = {};

      eleves.forEach((e) => {
        counts[e.option]  = (counts[e.option]  || 0) + 1;
        mCounts[e.option] = (mCounts[e.option] || 0) + (e.sexe === 'M' ? 1 : 0);
        fCounts[e.option] = (fCounts[e.option] || 0) + (e.sexe === 'F' ? 1 : 0);
      });

      barData = Object.entries(counts)
        .map(([opt, count]) => ({
          name:      opt,
          fullLabel: opt,
          count,
          garcons:   mCounts[opt] || 0,
          filles:    fCounts[opt] || 0,
          color:     OPTION_COLORS[opt] || '#22c55e',
        }))
        .sort((a, b) => b.count - a.count);
    }

    const pieData = [
      { name: 'Masculin', value: totalM, color: '#22c55e' },
      { name: 'Féminin',  value: totalF, color: '#f9a8d4' },
    ];

    return { barData, pieData, totalM, totalF, total };
  }, [activeView, eleves]);

  if (loading) {
    return (
      <div className="mt-8 text-center text-[#62627a] text-sm">Chargement des graphiques…</div>
    );
  }

  // ── Taille des barres selon la vue ─────────────────────────────────────────
  const barSize      = activeView === 'classe' ? 22 : 48;
  const xAxisHeight  = activeView === 'classe' ? 60 : 38;
  const xAxisAngle   = activeView === 'classe' ? -45 : 0;
  const xAnchor      = activeView === 'classe' ? 'end' : 'middle';

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-8">

      {/* ════════════════════════════════════════════════════════════════════
          PANNEAU GAUCHE — Histogramme
      ════════════════════════════════════════════════════════════════════ */}
      <div className="lg:col-span-2 bg-[#111116] border border-[#1b1b26] rounded-2xl p-6 flex flex-col">

        {/* En-tête */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h2 className="text-white font-bold text-base tracking-tight">
              Inscriptions par {activeView}
            </h2>
            <p className="text-[#44445a] text-xs mt-0.5">
              Année scolaire {activeAnnee?.designation ?? '—'}
            </p>
          </div>

          {/* Toggle Par classe / Par option */}
          <div className="flex shrink-0 bg-[#09090e] border border-[#1b1b26] rounded-xl p-1 gap-0.5">
            {['classe', 'option'].map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`
                  flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold
                  transition-all duration-200
                  ${activeView === view
                    ? 'bg-[#1b2e1f] text-[#4ade80] shadow-inner'
                    : 'text-[#44445a] hover:text-[#a0a0b0]'}
                `}
              >
                {view === 'classe' ? <Users size={12} /> : <BookOpen size={12} />}
                Par {view}
              </button>
            ))}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={barData}
              barSize={barSize}
              barGap={3}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              {/* Grille horizontale uniquement */}
              <CartesianGrid
                vertical={false}
                stroke="#1b1b26"
                strokeDasharray="0"
              />

              {/* Axe X */}
              <XAxis
                dataKey="name"
                tick={{
                  fill: '#44445a',
                  fontSize: activeView === 'classe' ? 10 : 12,
                  fontWeight: 500,
                }}
                axisLine={false}
                tickLine={false}
                angle={xAxisAngle}
                textAnchor={xAnchor}
                interval={0}
                height={xAxisHeight}
              />

              {/* Axe Y */}
              <YAxis
                tick={{ fill: '#44445a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={32}
              />

              <Tooltip
                content={<BarTooltip />}
                cursor={{ fill: 'rgba(255,255,255,0.03)', radius: [6, 6, 0, 0] }}
              />

              {/* Barres avec couleur individuelle via Cell */}
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Légende couleurs (par classe uniquement) */}
        {activeView === 'classe' && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-4 border-t border-[#1b1b26]">
            {['7ème','8ème','1ère','2ème','3ème','4ème'].map((grade, gi) => {
              const sampleClass = `${grade} A`;
              const color = CLASS_COLORS[sampleClass] || '#22c55e';
              return (
                <div key={grade} className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[11px] text-[#55556d]">{grade}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Légende couleurs (par option) */}
        {activeView === 'option' && (
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-4 pt-4 border-t border-[#1b1b26]">
            {Object.entries(OPTION_COLORS).map(([opt, color]) => (
              <div key={opt} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[11px] text-[#55556d]">{opt}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          PANNEAU DROIT — Donut répartition genre
      ════════════════════════════════════════════════════════════════════ */}
      <div className="bg-[#111116] border border-[#1b1b26] rounded-2xl p-6 flex flex-col">

        {/* En-tête */}
        <div className="mb-2">
          <h2 className="text-white font-bold text-base tracking-tight">Répartition</h2>
          <p className="text-[#44445a] text-xs mt-0.5">par sexe · {total} inscrits</p>
        </div>

        {/* Donut */}
        <div className="flex items-center justify-center py-2">
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={84}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
                startAngle={90}
                endAngle={-270}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`pie-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`${value} élèves`, name]}
                contentStyle={{
                  backgroundColor: '#161620',
                  border: '1px solid #2d2d3f',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#fff',
                }}
                itemStyle={{ color: '#fff' }}
                labelStyle={{ display: 'none' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Statistiques texte */}
        <div className="mt-auto space-y-0">

          {/* Masculin */}
          <div className="flex items-center justify-between py-3 border-b border-[#1b1b26]">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#22c55e] shrink-0" />
              <span className="text-[#a0a0b0] text-sm">Masculin</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#44445a]">
                {Math.round((totalM / total) * 100)}%
              </span>
              <span className="text-white font-bold text-sm w-6 text-right">{totalM}</span>
            </div>
          </div>

          {/* Féminin */}
          <div className="flex items-center justify-between py-3 border-b border-[#1b1b26]">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#f9a8d4] shrink-0" />
              <span className="text-[#a0a0b0] text-sm">Féminin</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#44445a]">
                {Math.round((totalF / total) * 100)}%
              </span>
              <span className="text-[#f9a8d4] font-bold text-sm w-6 text-right">{totalF}</span>
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between pt-3">
            <span className="text-[#a0a0b0] text-sm">Total inscrits</span>
            <span className="text-white font-bold text-sm">{total}</span>
          </div>

          {/* Mini barre de progression M/F */}
          <div className="mt-4 h-1.5 rounded-full overflow-hidden bg-[#f9a8d4]">
            <div
              className="h-full rounded-full bg-[#22c55e] transition-all duration-700"
              style={{ width: `${Math.round((totalM / total) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-[#22c55e]">♂ {Math.round((totalM / total) * 100)}%</span>
            <span className="text-[10px] text-[#f9a8d4]">♀ {Math.round((totalF / total) * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}