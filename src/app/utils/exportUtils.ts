// exportUtils.ts – Exporta el historial de tests físicos de un jugador a CSV
// Usa tipos genéricos para ser compatible con cualquier forma del objeto

export function exportPlayerTestsToCSV(player: { name: string; [key: string]: any }, tests: any[]) {
  if (!tests || tests.length === 0) {
    alert('No hay datos de tests para exportar.');
    return;
  }

  // Ordenar por fecha (más antiguos primero, mejor para Excel)
  const sorted = [...tests].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const headers = ['Fecha', 'Jugador', 'Tipo de Test', 'Valor', 'Unidad', 'Notas'];

  const rows = sorted.map(t => {
    const date = t.date ? new Date(t.date).toLocaleDateString('es-MX') : '';
    const testType = t.testType || Object.keys(t).find(k =>
      ['CMJ', 'SJ', 'abordaje', 'vel5m', 'vel10m', 'tTest', 'spikeSpeed', 'serveSpeed', 'reactionTime'].includes(k) && t[k]
    ) || 'N/A';
    const value = t.value ?? t[testType] ?? '';
    const unit = t.unit || '';
    const notes = t.notes ? `"${String(t.notes).replace(/"/g, '""')}"` : '';
    return [date, player.name, testType, value, unit, notes].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Reporte_${player.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
