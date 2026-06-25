// Utilitaires présence — grille GitHub (données depuis API Presence)

export const GRID_COLOR = {
  present: '#4ade80',
  absent: '#f43f5e',
  'no-record': '#1b1b26',
  future: '#111116',
  outside: 'transparent',
};

export const buildYearGrid = (eleveId, classe, year, records) => {
  const jan1 = new Date(year, 0, 1);
  let cur = new Date(jan1);
  const dow0 = cur.getDay();
  if (dow0 === 0) cur.setDate(cur.getDate() - 6);
  else if (dow0 > 1) cur.setDate(cur.getDate() - (dow0 - 1));

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const weeks = [];
  const monthLabels = [];
  let lastMonth = -1;
  let wi = 0;

  while (true) {
    const days = [];
    for (let d = 0; d < 5; d++) {
      const date = new Date(cur);
      date.setDate(date.getDate() + d);
      const inYear = date.getFullYear() === year;
      const ds = date.toISOString().slice(0, 10);

      if (inYear && date.getMonth() !== lastMonth) {
        monthLabels.push({ label: date.toLocaleDateString('fr-FR', { month: 'short' }), wi });
        lastMonth = date.getMonth();
      }

      let status = 'outside';
      if (inYear) {
        if (date > today) status = 'future';
        else {
          const rec = records.find((r) => r.date === ds && r.classe === classe);
          status = rec
            ? (rec.presents.includes(eleveId) ? 'present' : 'absent')
            : 'no-record';
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

export const getPresenceStats = (eleveId, classe, year, records) => {
  const { weeks } = buildYearGrid(eleveId, classe, year, records);
  let present = 0;
  let absent = 0;
  weeks.flat().forEach((d) => {
    if (d.status === 'present') present++;
    if (d.status === 'absent') absent++;
  });
  const total = present + absent;
  return { present, absent, total, rate: total ? Math.round((present / total) * 100) : 0 };
};
