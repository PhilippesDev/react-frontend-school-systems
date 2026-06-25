import React, { useState } from 'react';
import { Flag } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
//  Données exemple — remplacer par vos vraies données ou les passer en props
//  Forme attendue pour chaque objet :
//    { id, label, startDate: Date, endDate: Date, color: '#hex' }
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_YEARS = [
  { id: 1, label: '2021-2022', startDate: new Date('2021-09-01'), endDate: new Date('2022-06-30'), color: '#f97316' },
  { id: 2, label: '2022-2023', startDate: new Date('2022-09-01'), endDate: new Date('2023-06-30'), color: '#a855f7' },
  { id: 3, label: '2023-2024', startDate: new Date('2023-09-01'), endDate: new Date('2026-11-30'), color: '#38bdf8' },
  { id: 4, label: '2024-2025', startDate: new Date('2024-09-01'), endDate: new Date('2025-06-30'), color: '#4ade80' },
  { id: 5, label: '2025-2026', startDate: new Date('2025-09-01'), endDate: new Date('2026-12-30'), color: '#f43f5e' },
];

// ─────────────────────────────────────────────────────────────────────────────
//  Constantes de mise en page (px, relatif au container)
// ─────────────────────────────────────────────────────────────────────────────
const BAND_TOP = 130; // espace au-dessus de la bande (labels + tiges hauts)
const BAND_H   = 40;  // épaisseur de la bande horizontale
const STEM_H   = 52;  // longueur des tiges verticales (haut et bas)
const TOTAL_H  = BAND_TOP + BAND_H + STEM_H + 72; // ≈ 294 px

// ─────────────────────────────────────────────────────────────────────────────
//  Composant SchoolYearTimeline
//
//  Props :
//    schoolYears   — tableau d'années (voir DEFAULT_YEARS). Optionnel.
//    selectedYear  — objet année actuellement sélectionnée (ou null).
//    onYearChange  — callback(year) déclenché au clic sur une année.
//
//  Intégration dans Dashboard.jsx :
//    import Timeline from './Timeline';
//
//    const currentSY = schoolYears.find(y => today >= y.startDate && today <= y.endDate);
//    const [selectedYear, setSelectedYear] = useState(currentSY ?? null);
//
//    <Timeline
//      schoolYears={schoolYears}
//      selectedYear={selectedYear}
//      onYearChange={setSelectedYear}
//    />
// ─────────────────────────────────────────────────────────────────────────────
export default function Timeline({
  schoolYears  = DEFAULT_YEARS,
  selectedYear,
  onYearChange,
}) {
  const [hoveredYear, setHoveredYear] = useState(null);
  const [mousePos,    setMousePos]    = useState(null);

  const today = new Date();

  // Année en cours (aujourd'hui est entre startDate et endDate)
  const currentYear    = schoolYears.find(y => today >= y.startDate && today <= y.endDate) ?? null;
  const currentYearIdx = schoolYears.findIndex(y => y.id === currentYear?.id);

  // Avancement de l'année en cours (0–100 %)
  const currentProgress = currentYear != null
    ? Math.min(100, Math.max(0,
        ((today - currentYear.startDate) / (currentYear.endDate - currentYear.startDate)) * 100,
      ))
    : null;

  // Position horizontale du flag (% de la largeur totale de la bande)
  const flagPct = currentYear && currentProgress != null
    ? ((currentYearIdx + currentProgress / 100) / schoolYears.length) * 100
    : null;

  const segW = 100 / schoolYears.length; // % de largeur par segment

  const fmtDate = (d) =>
    d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <>
      {/* ── Tooltip flottant : position fixed → jamais rogné par overflow ── */}
      {hoveredYear && mousePos && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ left: mousePos.x + 18, top: mousePos.y + 18 }}
        >
          <div
            className="bg-[#161620] border rounded-xl p-3  min-w-[205px]"
            style={{ borderColor: `${hoveredYear.color}45` }}
          >
            {/* Nom de l'année */}
            <p className="text-sm font-bold mb-2" style={{ color: hoveredYear.color }}>
              {hoveredYear.label}
            </p>

            <div className="text-xs text-[#8a8aa8] space-y-1">
              <p>Début : {fmtDate(hoveredYear.startDate)}</p>
              <p>Fin&nbsp;&nbsp; : {fmtDate(hoveredYear.endDate)}</p>

              {/* Bloc progression uniquement pour l'année en cours */}
              {hoveredYear.id === currentYear?.id && currentProgress != null && (
                <div className="mt-2 pt-2 border-t border-[#28283c]">
                  <p
                    className="font-semibold flex items-center gap-1.5 mb-1.5"
                    style={{ color: hoveredYear.color }}
                  >
                    <Flag size={10} />
                    Progression : {Math.round(currentProgress)}%
                  </p>
                  {/* Mini barre de progression */}
                  <div className="h-1.5 rounded-full bg-[#28283c] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${currentProgress}%`, backgroundColor: hoveredYear.color }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Wrapper global ── */}
      <div
        className="w-full my-8 select-none"
        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
      >
        {/* En-tête du composant */}
        <div className="flex items-center justify-between mb-1 px-1">
          <p className="text-[11px] font-semibold text-[#44445a] uppercase tracking-widest">
            Navigation — Années scolaires
          </p>
          {selectedYear && (
            <p className="text-[11px] text-[#6060808]">
              Sélection :{' '}
              <span className="font-bold" style={{ color: selectedYear.color }}>
                {selectedYear.label}
              </span>
            </p>
          )}
        </div>

        {/* Canvas de la timeline */}
        <div
          className="relative w-full"
          style={{ height: TOTAL_H }}
          onMouseLeave={() => setHoveredYear(null)}
        >

          {/* ══════════════════════════════════════════════
              BANDE HORIZONTALE
          ══════════════════════════════════════════════ */}
          <div
            className="absolute left-0 right-0 flex rounded-full overflow-hidden"
            style={{ top: BAND_TOP, height: BAND_H }}
          >
            {schoolYears.map((year, idx) => {
              const isCurrent  = year.id === currentYear?.id;
              const isPast     = currentYear
                ? year.endDate < currentYear.startDate
                : today > year.endDate;
              const isSelected = year.id === selectedYear?.id;

              return (
                <div
                  key={year.id}
                  className="relative h-full cursor-pointer overflow-hidden"
                  style={{
                    width: `${segW}%`,
                    backgroundColor: `${year.color}22`,
                    // Séparateur entre segments — cette ligne fait aussi office de délimiteur visuel
                    borderRight: idx < schoolYears.length - 1 ? '2px solid #09090e' : 'none',
                    // Atténuation des années non sélectionnées
                    opacity: selectedYear && !isSelected ? 0.35 : 1,
                    transition: 'opacity 0.3s ease',
                  }}
                  onClick={() => onYearChange?.(year)}
                  onMouseEnter={() => setHoveredYear(year)}
                >
                  {/* Années passées → remplissage plein teinté */}
                  {isPast && (
                    <div
                      className="absolute inset-0"
                      style={{ backgroundColor: year.color, opacity: 0.38 }}
                    />
                  )}

                  {/* Année en cours → remplissage progressif (barre de progression) */}
                  {isCurrent && currentProgress != null && (
                    <div
                      className="absolute inset-y-0 left-0 transition-all duration-700"
                      style={{
                        width: `${currentProgress}%`,
                        backgroundColor: year.color,
                        opacity: 0.65,
                      }}
                    />
                  )}
                </div>
              );
            })}

            {/* Ligne verticale blanche = curseur de position dans l'année */}
            {flagPct != null && (
              <div
                className="absolute inset-y-0 z-10 pointer-events-none"
                style={{
                  left: `${flagPct}%`,
                  width: 2,
                  backgroundColor: 'white',
                  opacity: 0.9,
                }}
              />
            )}
          </div>

          {/* Badge flag au-dessus de la bande (affiche le % écoulé) */}
          {flagPct != null && currentYear && currentProgress != null && (
            <div
              className="absolute z-20 pointer-events-none"
              style={{
                left: `${flagPct}%`,
                top: BAND_TOP - 30,
                transform: 'translateX(-50%)',
              }}
            >
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px] font-bold  whitespace-nowrap"
                style={{ backgroundColor: currentYear.color }}
              >
                <Flag size={9} />
                <span>{Math.round(currentProgress)}%</span>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              NŒUDS + TIGES + LABELS (alternance haut/bas)
          ══════════════════════════════════════════════ */}
          {schoolYears.map((year, idx) => {
            const isAbove    = idx % 2 === 0;   // pairs → au-dessus, impairs → en-dessous
            const isSelected = year.id === selectedYear?.id;
            const isHovered  = year.id === hoveredYear?.id;
            const isCurrent  = year.id === currentYear?.id;

            // Centre horizontal du segment
            const midX = `${(idx + 0.5) * segW}%`;

            // Centre vertical du nœud (bord haut ou bas de la bande)
            const nodeCenterY = isAbove ? BAND_TOP : BAND_TOP + BAND_H;

            // Tige : part du nœud vers le label
            const stemTop = isAbove ? nodeCenterY - STEM_H : nodeCenterY;

            // Label : au-dessus de la tige (isAbove) ou en-dessous (isBelow)
            const labelTop = isAbove
              ? nodeCenterY - STEM_H - 32  // ~46 px depuis le haut du container
              : nodeCenterY + STEM_H + 8;  // ~230 px depuis le haut du container

            // Taille du nœud selon état
            const nodeSize = isSelected ? 20 : isHovered ? 17 : 13;

            return (
              <React.Fragment key={year.id}>

                {/* Tige verticale */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: midX,
                    top: stemTop,
                    width: 2,
                    height: STEM_H,
                    backgroundColor: year.color,
                    transform: 'translateX(-50%)',
                    opacity: selectedYear && !isSelected ? 0.18 : 0.72,
                    transition: 'opacity 0.3s',
                  }}
                />

                {/* Nœud circulaire */}
                <div
                  className="absolute cursor-pointer z-10"
                  style={{
                    left: midX,
                    top: nodeCenterY,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onClick={() => onYearChange?.(year)}
                  onMouseEnter={() => setHoveredYear(year)}
                >
                  <div
                    style={{
                      width: nodeSize,
                      height: nodeSize,
                      borderRadius: '50%',
                      border: `2px solid ${year.color}`,
                      backgroundColor: isSelected ? year.color : '#111116',

                      transition: 'all 0.2s ease',
                    }}
                  />
                </div>

                {/* Label de l'année */}
                <div
                  className="absolute flex flex-col items-center cursor-pointer z-10"
                  style={{ left: midX, top: labelTop, transform: 'translateX(-50%)' }}
                  onClick={() => onYearChange?.(year)}
                  onMouseEnter={() => setHoveredYear(year)}
                >
                  <span
                    className="text-sm font-bold whitespace-nowrap"
                    style={{
                      color: isSelected || isHovered ? year.color : '#5e5e78',
                      transition: 'color 0.2s'
                    }}
                  >
                    {year.label}
                  </span>

                  {/* Badge "En cours" uniquement sur l'année active */}
                  {isCurrent && currentProgress != null && (
                    <span
                      className="text-[9px] font-bold mt-1 px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{
                        backgroundColor: `${year.color}20`,
                        color: year.color,
                        border: `1px solid ${year.color}38`,
                      }}
                    >
                      En cours · {Math.round(currentProgress)}%
                    </span>
                  )}
                </div>

              </React.Fragment>
            );
          })}
        </div>
      </div>
    </>
  );
}