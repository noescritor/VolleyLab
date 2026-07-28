import React from 'react';
import { CourtHeatmap } from '../live-match/CourtHeatmap';
import { NetHeatmap } from '../live-match/NetHeatmap';

interface PrintableMatchReportProps {
  dynStats: any;
  match: any;
  players: any[];
}

// Helper to format date
const formatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  try { return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch(e) { return dateStr; }
};

export const PrintableMatchReport = React.forwardRef<HTMLDivElement, PrintableMatchReportProps>(({ dynStats, match, players }, ref) => {
  if (!dynStats || !match) return null;

  const { teamBalance, rallies, sideOutPct, transPct, errorPhaseFreq, historicalAvg, subImpact, momentum } = dynStats;

  const PRINT_STYLES = `
    @media print {
      @page { size: A4 portrait; margin: 0 !important; }
      html, body, #root { margin: 0 !important; padding: 0 !important; background: #000000 !important; width: 100% !important; height: auto !important; }
      .print\\:hidden { display: none !important; }
      #pdf-preview-wrapper { display: block !important; position: absolute; left: 0; top: 0; width: 100%; z-index: 9999; }
      .a4-page { width: 794px; height: 1123px; page-break-after: always; position: relative; overflow: hidden; background: #000000; box-sizing: border-box; }
      /* Force background graphics to print */
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
    
    .a4-page { width: 794px; height: 1123px; position: relative; overflow: hidden; background: #000000; box-sizing: border-box; font-family: 'DM Sans', sans-serif; margin-bottom: 20px; }
    .dot-grid { position: absolute; right: 40px; top: 40px; width: 80px; height: 80px; background-image: radial-gradient(rgba(255,255,255,0.14) 2px, transparent 2px); background-size: 16px 16px; }
    .glass-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; }
  `;

  const totalBalance = teamBalance.pos - teamBalance.neg;

  // Header Component
  const PageHeader = ({ pageNum, title }: { pageNum: string, title: string }) => (
    <>
      <div className="absolute left-[40px] top-[40px] font-mono text-[14px] font-medium tracking-[1.4px] text-[#A191FF]">
        VolleyLab<span className="text-white/50">/</span>
      </div>
      <div className="absolute right-[140px] top-[40px] font-mono text-[11px] font-medium tracking-[1.4px] text-white/45 text-right w-[380px]">
        {match.opponent} / {formatDate(match.date)}
      </div>
      <div className="absolute left-[40px] top-[60px] w-[714px] h-[1px] bg-white/10" />
      <div className="absolute left-[40px] top-[70px] font-mono text-[11px] tracking-[1.4px] text-white/45 uppercase">
        {title}
      </div>
      
      <div className="absolute left-[40px] bottom-[40px] w-[714px] h-[1px] bg-white/10" />
      <div className="absolute left-[40px] bottom-[20px] font-mono text-[11px] tracking-[1.4px] text-white/45">
        APP.VOLLEYLAB.COM
      </div>
      <div className="absolute right-[40px] bottom-[20px] font-mono text-[11px] tracking-[1.4px] text-white/45">
        PÁG {pageNum}/04
      </div>
      <div className="dot-grid" />
    </>
  );

  return (
    <div ref={ref} style={{ backgroundColor: '#000000', color: '#FFFFFF', position: 'relative' }}>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Mono:wght@500&display=swap" rel="stylesheet" />
      
      {/* ================= PAGE 1 ================= */}
      <div className="a4-page">
        <PageHeader pageNum="01" title="01 — Portada + Resumen" />
        
        <div className="absolute left-[40px] top-[120px] font-mono text-[14px] tracking-[1.4px] text-white/45 uppercase">
          REPORTE DE RENDIMIENTO
        </div>
        <div className="absolute left-[40px] top-[140px] font-bold text-[56px] leading-[64px] text-white w-[500px]">
          VS {match.opponent}
        </div>
        
        {/* Match Details */}
        <div className="absolute left-[40px] top-[220px]">
          <div className="font-mono text-[12px] tracking-[1.4px] text-white/45 mb-1 uppercase">Fecha</div>
          <div className="text-[16px] text-white">{formatDate(match.date)} {match.time && `- ${match.time}`}</div>
        </div>
        <div className="absolute left-[260px] top-[220px]">
          <div className="font-mono text-[12px] tracking-[1.4px] text-white/45 mb-1 uppercase">Competición</div>
          <div className="text-[16px] text-white">{match.matchType || 'Regular'}</div>
        </div>
        <div className="absolute left-[480px] top-[220px]">
          <div className="font-mono text-[12px] tracking-[1.4px] text-white/45 mb-1 uppercase">Sede</div>
          <div className="text-[16px] text-white">{match.venue || 'Local'}</div>
        </div>
        
        <div className="absolute left-[40px] top-[300px] w-[714px] h-[1px] bg-white/10" />
        <div className="absolute left-[40px] top-[320px] font-medium text-[20px] text-[#A191FF]">
          Resumen Ejecutivo
        </div>
        
        {/* KPIs Grid */}
        <div className="absolute left-[40px] top-[370px] flex gap-4 w-[714px] flex-wrap">
          {/* SideOut */}
          <div className="glass-card w-[349px] h-[140px] p-6 relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-[#91CAFF]" />
              <div className="font-mono text-[11px] tracking-[1.4px] text-white/45">SIDE-OUT %</div>
            </div>
            <div className="text-[40px] font-bold text-white">{sideOutPct}%</div>
            <div className="font-mono text-[10px] tracking-[0.4px] text-[#91CAFF] mt-1 absolute bottom-6">EFECTIVIDAD AL RECIBIR</div>
          </div>
          
          {/* Transicion */}
          <div className="glass-card w-[349px] h-[140px] p-6 relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-[#91FFB0]" />
              <div className="font-mono text-[11px] tracking-[1.4px] text-white/45">TRANSICIÓN %</div>
            </div>
            <div className="text-[40px] font-bold text-white">{transPct}%</div>
            <div className="font-mono text-[10px] tracking-[0.4px] text-[#91FFB0] mt-1 absolute bottom-6">EFECTIVIDAD AL DEFENDER</div>
          </div>
          
          {/* Balance */}
          <div className="glass-card w-[349px] h-[140px] p-6 relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-[#A191FF]" />
              <div className="font-mono text-[11px] tracking-[1.4px] text-white/45">BALANCE GLOBAL</div>
            </div>
            <div className="text-[40px] font-bold text-white">{totalBalance > 0 ? `+${totalBalance}` : totalBalance}</div>
            <div className="font-mono text-[10px] tracking-[0.4px] text-[#A191FF] mt-1 absolute bottom-6">ACCIONES POSITIVAS VS NEGATIVAS</div>
          </div>
          
          {/* Errores */}
          <div className="glass-card w-[349px] h-[140px] p-6 relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-[#FFAC91]" />
              <div className="font-mono text-[11px] tracking-[1.4px] text-white/45">MAYOR FOCO DE ERROR</div>
            </div>
            <div className="text-[32px] font-bold text-white mt-1">
              {(() => {
                let maxE = 0; let phase = '-';
                errorPhaseFreq.forEach((f: any) => {
                  const t = f.Saque + f.Ataque + f.Recepcion + f.Bloqueo;
                  if (t > maxE) { maxE = t; phase = f.name; }
                });
                return phase.split(' ')[0];
              })()}
            </div>
            <div className="font-mono text-[10px] tracking-[0.4px] text-[#FFAC91] mt-1 absolute bottom-6">FASE CON MÁS PUNTOS PERDIDOS</div>
          </div>
        </div>

        {/* Coach Notes */}
        {match.notes && (
          <div className="absolute left-[40px] top-[700px] w-[714px]">
            <div className="font-mono text-[11px] tracking-[1.4px] text-white/45 mb-2 uppercase">Notas del Entrenador</div>
            <div className="text-[16px] text-white/60 leading-[24px]">{match.notes}</div>
          </div>
        )}
      </div>

      {/* ================= PAGE 2 ================= */}
      <div className="a4-page">
        <PageHeader pageNum="02" title="02 — Análisis Táctico" />
        
        <div className="absolute left-[40px] top-[120px] font-medium text-[20px] text-[#A191FF]">
          Evolución del Partido (Momentum)
        </div>
        <div className="absolute left-[40px] top-[150px] text-[16px] text-white/60">
          Línea de tiempo de la diferencia de puntos. Los picos hacia arriba son ventajas nuestras.
        </div>

        <div className="absolute left-[40px] top-[190px] w-[714px] h-[220px] glass-card p-6 flex flex-col justify-end relative">
           {momentum && momentum.length > 0 ? (
             <div className="w-full h-[140px] relative border-b border-white/10 mb-6">
                <div className="absolute left-0 top-[50%] w-full h-[1px] bg-white/20 border-dashed" />
                <svg width="100%" height="100%" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke="#A191FF"
                    strokeWidth="3"
                    points={momentum.map((m:any, i:number) => `${(i / Math.max(1, momentum.length - 1)) * 100}%,${50 - (m.diff * 5)}%`).join(' ')}
                  />
                  {/* Puntos de Sustitucion (mocked for visual if any) */}
                  {subImpact?.subDetails && momentum.findIndex((m:any)=>m.ourScore===subImpact.subDetails.ourScore && m.rivalScore===subImpact.subDetails.rivalScore) > -1 && (
                    <circle 
                      cx={`${(momentum.findIndex((m:any)=>m.ourScore===subImpact.subDetails.ourScore && m.rivalScore===subImpact.subDetails.rivalScore) / Math.max(1, momentum.length - 1)) * 100}%`}
                      cy="50%" r="4" fill="#FFAC91" 
                    />
                  )}
                </svg>
             </div>
           ) : (
             <div className="text-white/30 text-center m-auto">Sin datos de momentum</div>
           )}
        </div>

        <div className="absolute left-[40px] top-[450px] font-medium text-[20px] text-[#A191FF]">
          Mapas Espaciales
        </div>

        {/* Heatmaps */}
        <div className="absolute left-[40px] top-[490px] w-[349px] h-[340px] glass-card p-6 overflow-hidden flex items-center justify-center">
          <div className="absolute left-6 top-6 font-mono text-[11px] tracking-[1.4px] text-[#91CAFF] z-10">ATAQUES EN CANCHA</div>
          <div className="transform scale-75 origin-center mt-8 relative z-0">
            <CourtHeatmap rallies={rallies || []} />
          </div>
        </div>

        <div className="absolute left-[405px] top-[490px] w-[349px] h-[340px] glass-card p-6 overflow-hidden flex items-center justify-center">
          <div className="absolute left-6 top-6 font-mono text-[11px] tracking-[1.4px] text-[#91F2FF] z-10">ATAQUES EN RED (TRAYECTORIA)</div>
          <div className="transform scale-[0.6] origin-center mt-8 relative z-0 w-[400px]">
            <NetHeatmap rallies={rallies || []} />
          </div>
        </div>
      </div>

      {/* ================= PAGE 3 ================= */}
      <div className="a4-page">
        <PageHeader pageNum="03" title="03 — Impacto de Cambios" />
        
        <div className="absolute left-[40px] top-[120px] font-medium text-[20px] text-[#A191FF]">
          Impacto de Sustituciones
        </div>
        <div className="absolute left-[40px] top-[150px] text-[16px] text-white/60">
          {subImpact ? `Rendimiento antes vs después del cambio: Entró ${subImpact.subDetails.in} por ${subImpact.subDetails.out}` : 'No se registraron cambios o no hay datos suficientes.'}
        </div>

        {subImpact && (
          <div className="absolute left-[40px] top-[190px] flex gap-4 w-[714px]">
            {/* Antes */}
            <div className="glass-card w-[349px] h-[200px] p-6 relative">
              <div className="font-mono text-[14px] tracking-[1.4px] text-[#FFAC91] mb-6">ANTES DEL CAMBIO</div>
              <div className="flex justify-between mt-4">
                <div>
                  <div className="text-[28px] font-bold text-white">{subImpact.before.balance > 0 ? `+${subImpact.before.balance}` : subImpact.before.balance}</div>
                  <div className="font-mono text-[10px] tracking-[0.4px] text-white/45">BALANCE</div>
                </div>
                <div>
                  <div className="text-[28px] font-bold text-white">{subImpact.before.attEff}%</div>
                  <div className="font-mono text-[10px] tracking-[0.4px] text-white/45">EFIC. ATAQUE</div>
                </div>
                <div>
                  <div className="text-[28px] font-bold text-white">{subImpact.before.recEff}%</div>
                  <div className="font-mono text-[10px] tracking-[0.4px] text-white/45">EFIC. RECP</div>
                </div>
              </div>
            </div>

            {/* Despues */}
            <div className="glass-card w-[349px] h-[200px] p-6 relative">
              <div className="font-mono text-[14px] tracking-[1.4px] text-[#91FFB0] mb-6">DESPUÉS DEL CAMBIO</div>
              <div className="flex justify-between mt-4">
                <div>
                  <div className="text-[28px] font-bold text-white">{subImpact.after.balance > 0 ? `+${subImpact.after.balance}` : subImpact.after.balance}</div>
                  <div className="font-mono text-[10px] tracking-[0.4px] text-white/45">BALANCE</div>
                </div>
                <div>
                  <div className="text-[28px] font-bold text-white">{subImpact.after.attEff}%</div>
                  <div className="font-mono text-[10px] tracking-[0.4px] text-white/45">EFIC. ATAQUE</div>
                </div>
                <div>
                  <div className="text-[28px] font-bold text-white">{subImpact.after.recEff}%</div>
                  <div className="font-mono text-[10px] tracking-[0.4px] text-white/45">EFIC. RECP</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="absolute left-[40px] top-[430px] font-medium text-[20px] text-[#A191FF]">
          Proyección Histórica (Últimos 5 partidos)
        </div>

        <div className="absolute left-[40px] top-[470px] w-[714px] h-[160px] glass-card p-8 flex flex-col justify-center gap-6">
          <div className="flex items-center">
            <div className="w-[180px] font-mono text-[11px] tracking-[0.4px] text-white/60">ESTE PARTIDO (SO%)</div>
            <div className="w-[450px] h-[16px] bg-white/5 rounded-full relative overflow-hidden">
              <div className="h-full bg-[#91CAFF] rounded-full" style={{ width: `${sideOutPct}%` }} />
            </div>
            <div className="w-[40px] text-right font-mono text-[11px] text-white">{sideOutPct}%</div>
          </div>

          <div className="flex items-center">
            <div className="w-[180px] font-mono text-[11px] tracking-[0.4px] text-white/60">PROMEDIO HISTÓRICO</div>
            <div className="w-[450px] h-[16px] bg-white/5 rounded-full relative overflow-hidden">
              <div className="h-full bg-white/40 rounded-full" style={{ width: `${historicalAvg?.sideOut || 0}%` }} />
            </div>
            <div className="w-[40px] text-right font-mono text-[11px] text-white">{historicalAvg?.sideOut || 0}%</div>
          </div>
        </div>
      </div>

      {/* ================= PAGE 4 ================= */}
      <div className="a4-page">
        <PageHeader pageNum="04" title="04 — Rendimiento Individual" />
        
        <div className="absolute left-[40px] top-[120px] font-medium text-[20px] text-[#A191FF]">
          Estadísticas por Jugador (Box Score)
        </div>
        
        <div className="absolute left-[40px] top-[160px] w-[714px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 font-mono text-[10px] tracking-[1px] text-white/40 uppercase">
                <th className="pb-3 pt-3 pl-2">Jugador</th>
                <th className="pb-3 pt-3 text-center">Pts</th>
                <th className="pb-3 pt-3 text-center">Aces</th>
                <th className="pb-3 pt-3 text-center">Bloq</th>
                <th className="pb-3 pt-3 text-center">Kills</th>
                <th className="pb-3 pt-3 text-center">Atq %</th>
                <th className="pb-3 pt-3 text-center">Rec %</th>
                <th className="pb-3 pt-3 text-center">Bal</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p: any, i: number) => {
                const pts = p.attacks.kills + p.serves.aces + p.blocks.stuffs;
                const attEff = p.attacks.attempts > 0 ? Math.round(((p.attacks.kills - p.attacks.neg) / p.attacks.attempts) * 100) : 0;
                const recEff = p.receptions.attempts > 0 ? Math.round((p.receptions.perfect / p.receptions.attempts) * 100) : 0;
                const bal = (p.attacks.pos + p.serves.pos + p.blocks.pos + p.receptions.pos + p.digs.pos + p.sets.pos) - 
                            (p.attacks.neg + p.serves.neg + p.blocks.neg + p.receptions.neg + p.digs.neg + p.sets.neg);
                
                return (
                  <tr key={p.id} className="border-b border-white/[0.03] text-[13px] text-white/80">
                    <td className="py-3 pl-2 flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center font-mono text-[10px] text-white/50">{p.number || '-'}</div>
                      <span className="font-medium text-white">{p.name}</span>
                    </td>
                    <td className="py-3 text-center font-bold text-white">{pts}</td>
                    <td className="py-3 text-center text-white/60">{p.serves.aces}</td>
                    <td className="py-3 text-center text-white/60">{p.blocks.stuffs}</td>
                    <td className="py-3 text-center text-white/60">{p.attacks.kills} / {p.attacks.attempts}</td>
                    <td className="py-3 text-center font-mono text-[12px] text-[#91CAFF]">{attEff}%</td>
                    <td className="py-3 text-center font-mono text-[12px] text-[#91FFB0]">{recEff}%</td>
                    <td className="py-3 text-center font-bold text-[#A191FF]">{bal > 0 ? `+${bal}` : bal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
