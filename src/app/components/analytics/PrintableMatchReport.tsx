import React from 'react';
import { CourtHeatmap } from '../live-match/CourtHeatmap';
import { NetHeatmap } from '../live-match/NetHeatmap';
import { Activity } from 'lucide-react';

interface PrintableMatchReportProps {
  dynStats: any;
  match: any;
  players: any[];
}

export const PrintableMatchReport = React.forwardRef<HTMLDivElement, PrintableMatchReportProps>(({ dynStats, match, players }, ref) => {
  if (!dynStats || !match) return null;

  const { teamBalance, r: rallies, sideOutPct } = dynStats;

  // Re-calculate some stuff just for the PDF or rely on dynStats
  const totalBalance = teamBalance.pos + teamBalance.neu + teamBalance.neg;
  const posPct = totalBalance > 0 ? (teamBalance.pos / totalBalance) * 100 : 0;
  const neuPct = totalBalance > 0 ? (teamBalance.neu / totalBalance) * 100 : 0;
  const negPct = totalBalance > 0 ? (teamBalance.neg / totalBalance) * 100 : 0;

  return (
    <div 
      ref={ref} 
      style={{
        width: '794px', // A4 width at 96 DPI
        minHeight: '1123px', // A4 height
        backgroundColor: '#0A0A0E', // Dark theme background
        color: '#FFFFFF',
        padding: '40px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative'
      }}
    >
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, background: '#A191FF', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={24} color="#000" />
          </div>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
              VolleyLab <span style={{ color: '#A191FF' }}>/</span> Reporte de Partido
            </h1>
            <p style={{ margin: '5px 0 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
              {new Date(match.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#A191FF', textTransform: 'uppercase', letterSpacing: '2px' }}>Marcador Final</p>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', fontFamily: 'monospace' }}>
            <span style={{ color: match.result === 'W' ? '#91FFB0' : '#FF919F' }}>Nosotros {match.score?.split('-')[0] || 0}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 10px' }}>-</span>
            <span style={{ color: 'rgba(255,255,255,0.8)' }}>Rival {match.score?.split('-')[1] || 0}</span>
          </p>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>vs {match.opponent}</p>
        </div>
      </div>

      {/* KPI GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        {/* Balance Team */}
        <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '20px' }}>
          <p style={{ margin: '0 0 15px 0', fontSize: '12px', color: '#A191FF', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Balance General</p>
          <div style={{ width: '100%', height: '16px', display: 'flex', borderRadius: '8px', overflow: 'hidden', marginBottom: '15px' }}>
            <div style={{ width: `${posPct}%`, backgroundColor: '#91FFB0' }} />
            <div style={{ width: `${neuPct}%`, backgroundColor: '#FFD391' }} />
            <div style={{ width: `${negPct}%`, backgroundColor: '#FF919F' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#91FFB0' }}>{teamBalance.pos} Positivos</span>
            <span style={{ color: '#FFD391' }}>{teamBalance.neu} Neutros</span>
            <span style={{ color: '#FF919F' }}>{teamBalance.neg} Errores</span>
          </div>
        </div>

        {/* Sideout & Transition */}
        <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '20px', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
             <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Eficacia Side-Out</p>
             <p style={{ margin: '10px 0 0 0', fontSize: '36px', fontWeight: 'bold', fontFamily: 'monospace', color: '#A191FF' }}>{sideOutPct}%</p>
          </div>
          <div style={{ width: '1px', height: '50px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
          <div style={{ textAlign: 'center' }}>
             <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Eficacia Transición</p>
             <p style={{ margin: '10px 0 0 0', fontSize: '36px', fontWeight: 'bold', fontFamily: 'monospace', color: '#A191FF' }}>{dynStats.transPct}%</p>
          </div>
        </div>
      </div>

      {/* PLAYER TABLE */}
      <div style={{ marginBottom: '30px' }}>
        <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#FFFFFF', fontWeight: 'bold' }}>Rendimiento Individual</p>
        <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <tr>
                <th style={{ padding: '12px 15px', fontWeight: 'normal' }}>Jugadora</th>
                <th style={{ padding: '12px 15px', fontWeight: 'normal' }}>Ataques (+/o/-)</th>
                <th style={{ padding: '12px 15px', fontWeight: 'normal' }}>Saques (+/o/-)</th>
                <th style={{ padding: '12px 15px', fontWeight: 'normal' }}>Eficacia Total</th>
              </tr>
            </thead>
            <tbody>
              {dynStats.players.map((p: any, i: number) => {
                const totalActions = p.attacks.attempts + p.serves.pos + p.serves.neg + p.serves.neu + p.receptions.attempts + p.blocks.pos + p.blocks.neg + p.blocks.neu + p.digs.pos + p.digs.neg + p.digs.neu;
                const posTotal = p.attacks.pos + p.serves.pos + p.receptions.pos + p.blocks.pos + p.digs.pos;
                const negTotal = p.attacks.neg + p.serves.neg + p.receptions.neg + p.blocks.neg + p.digs.neg;
                const eff = totalActions > 0 ? (((posTotal - negTotal) / totalActions) * 100).toFixed(1) : 0;
                
                return (
                  <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 15px' }}>
                      <span style={{ fontWeight: 'bold', color: '#FFFFFF', display: 'block' }}>{p.name}</span>
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{p.position}</span>
                    </td>
                    <td style={{ padding: '12px 15px', fontFamily: 'monospace', fontSize: '14px' }}>
                      <span style={{ color: '#91FFB0' }}>{p.attacks.pos}</span> / <span style={{ color: '#FFD391' }}>{p.attacks.neu}</span> / <span style={{ color: '#FF919F' }}>{p.attacks.neg}</span>
                    </td>
                    <td style={{ padding: '12px 15px', fontFamily: 'monospace', fontSize: '14px' }}>
                      <span style={{ color: '#91FFB0' }}>{p.serves.pos}</span> / <span style={{ color: '#FFD391' }}>{p.serves.neu}</span> / <span style={{ color: '#FF919F' }}>{p.serves.neg}</span>
                    </td>
                    <td style={{ padding: '12px 15px' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace',
                        backgroundColor: Number(eff) > 0 ? 'rgba(145,255,176,0.1)' : Number(eff) < 0 ? 'rgba(255,145,159,0.1)' : 'rgba(255,255,255,0.05)',
                        color: Number(eff) > 0 ? '#91FFB0' : Number(eff) < 0 ? '#FF919F' : 'rgba(255,255,255,0.5)'
                      }}>
                        {eff}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* HEATMAPS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '20px' }}>
          <p style={{ margin: '0 0 15px 0', fontSize: '12px', color: '#A191FF', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', textAlign: 'center' }}>Ataques en Cancha</p>
          <div style={{ transform: 'scale(0.8)', transformOrigin: 'top center', height: '400px' }}>
            <CourtHeatmap rallies={dynStats.rallies} filterTeam="our" filterAction="ataque" />
          </div>
        </div>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '20px' }}>
          <p style={{ margin: '0 0 15px 0', fontSize: '12px', color: '#A191FF', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', textAlign: 'center' }}>Ataques en Red</p>
          <div style={{ transform: 'scale(0.8)', transformOrigin: 'top center', height: '400px' }}>
            <NetHeatmap rallies={dynStats.rallies} filterTeam="our" filterAction="ataque" />
          </div>
        </div>
      </div>
      
      {/* FOOTER */}
      <div style={{ position: 'absolute', bottom: '20px', left: '40px', right: '40px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px', color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>
        <span>Generado por VolleyLab Analytics</span>
        <span>{new Date().toLocaleDateString('es-ES')} {new Date().toLocaleTimeString('es-ES')}</span>
      </div>
    </div>
  );
});
