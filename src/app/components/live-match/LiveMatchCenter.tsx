import { useState, useRef, useEffect, useMemo } from "react";
import { Volleyball, AlertTriangle, X, ArrowLeft } from "lucide-react";
import { useApp } from "../../utils/AppContext";
import {
  Quality,
  Gesture,
  rallyOutcomeFromAction,
  computeRotation,
  computeActionPhase,
  QUALITY_LABELS,
  RallyAction,
  Rotation
} from "../../utils/rallyModel";

/* ═══════════════════════════════════════════
   BRAND TOKENS — VolleyLab
═══════════════════════════════════════════ */
const C = {
  bg:    "#0A0A0E",
  card:  "rgba(255,255,255,0.06)",
  bd:    "rgba(255,255,255,0.15)",
  bdMed: "rgba(255,255,255,0.25)",

  vt: "#A191FF", vtLt: "#CECBF6",
  vtBg: "rgba(127,119,221,0.15)",
  vtBd: "rgba(127,119,221,0.45)",

  gn: "#91FFB0", gnLt: "#9FE1CB",
  gnBg: "rgba(29,158,117,0.13)",

  rd: "#FF919F", rdLt: "#F0997B",
  rdBg: "rgba(216,90,48,0.13)",

  gyBd: "rgba(255,255,255,0.25)",
  gyBg: "rgba(136,135,128,0.15)",
  gyLt: "#D0CECB", gyDk: "#767571",

  w: "#FFFFFF",
  t1: "rgba(255,255,255,0.95)",
  t2: "rgba(255,255,255,0.70)",
  t3: "rgba(255,255,255,0.45)",
};

const SB = { red: C.rd, green: C.gn, gray: C.gyBd };

/* ═══════════════════════════════════════════
   DATA & CONFIG
═══════════════════════════════════════════ */
import { CourtHeatmap, getZoneFromXY } from './CourtHeatmap';
import { NetHeatmap, getNetZoneFromXY } from './NetHeatmap';

const FRONT   = ["p4", "p3", "p2"];
const BACK    = ["p5", "p6", "p1"];
const ALL_Z   = [...FRONT, ...BACK];
const ZROW = { p4:"front", p3:"front", p2:"front", p5:"back", p6:"back", p1:"back" };
const ZLBL = { p4:"Z4", p3:"Z3", p2:"Z2", p5:"Z5", p6:"Z6", p1:"Z1" };

const GESTURES = [
  { id:"saque",     label:"Saque",     icon:"up"      },
  { id:"recepcion", label:"Recepción", icon:"shield"  },
  { id:"armado",    label:"Armado",    icon:"refresh" },
  { id:"ataque",    label:"Ataque",    icon:"bolt"    },
  { id:"dejada",    label:"Dejada",    icon:"feather" },
  { id:"bloqueo",   label:"Bloqueo",   icon:"shield"  },
  { id:"defensa",   label:"Defensa",   icon:"feather" },
];

const QUALITIES: { key: Quality; sym: string; bd: string; bg: string; tx: string; subDefault: string }[] = [
  { key: '#', sym: '#', bd: C.gn,   bg: C.gnBg, tx: C.gnLt, subDefault: 'Punto directo / Perfecto' },
  { key: '+', sym: '+', bd: C.vt,   bg: C.vtBg, tx: C.vtLt, subDefault: 'Positivo / Bueno' },
  { key: '!', sym: '!', bd: C.gyBd, bg: C.gyBg, tx: C.gyLt, subDefault: 'Neutro / Continuidad' },
  { key: '-', sym: '-', bd: '#FFD391', bg: 'rgba(255,211,145,0.1)', tx: '#FFD391', subDefault: 'Negativo / Malo' },
  { key: '=', sym: '=', bd: C.rd,   bg: C.rdBg, tx: C.rdLt, subDefault: 'Error / Punto rival' },
];

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
const dc      = (o: any) => JSON.parse(JSON.stringify(o));
const luNums  = (lu: any) => ALL_Z.map(z => lu[z]).filter(Boolean);
const luBench = (lu: any, roster: any[]) => roster.filter(p => !luNums(lu).includes(p.id));

// Generar nombre corto (primer nombre o iniciales)
const shortName = (name: string) => name ? name.split(' ')[0].substring(0, 8) : "";

/* ═══════════════════════════════════════════
   SVG ICONS
═══════════════════════════════════════════ */
const SVGS: any = {
  up:      <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>,
  bolt:    <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
  shield:  <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
  feather: <><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/></>,
  refresh: <><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>,
  undo:    <><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></>,
  plus:    <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  down:    <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>,
  hist:    <><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/><polyline points="12 7 12 12 15 15"/></>,
  flag:    <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></>,
  chart:   <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  clock:   <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>
};

const Ico = ({ k, sz = 18, style = {} }: any) => (
  <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {SVGS[k]}
  </svg>
);

/* ═══════════════════════════════════════════
   COURT CELL
═══════════════════════════════════════════ */
function CourtCell({ zone, playerId, pName, selected, status, onTap, onLong }: any) {
  const timer = useRef<any>(null);
  const fired = useRef(false);

  const pd = () => {
    fired.current = false;
    timer.current = setTimeout(() => { fired.current = true; onLong?.(); }, 480);
  };
  const pu = () => { clearTimeout(timer.current); if (!fired.current) onTap?.(); };
  const pl = () => clearTimeout(timer.current);

  return (
    <button
      onPointerDown={pd} onPointerUp={pu} onPointerLeave={pl}
      style={{
        aspectRatio: "1", borderRadius: 10, position: "relative",
        border: `2px solid ${selected ? C.vt : SB[status as keyof typeof SB] || C.gyBd}`,
        background: selected ? C.vtBg : "rgba(255,255,255,0.03)",
        color: selected ? C.vtLt : C.t1,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        userSelect: "none", touchAction: "none",
        transition: "border-color 0.2s, background 0.2s",
      }}
    >
      <span style={{ position:"absolute", top:3, left:5, fontSize:8, color:C.t3 }}>
        {ZLBL[zone as keyof typeof ZLBL]}
      </span>
      {!selected && playerId && status !== "gray" && (
        <span style={{
          position: "absolute", top: 4, right: 5,
          width: 6, height: 6, borderRadius: "50%",
          background: status === "red" ? C.rd : C.gn,
        }}/>
      )}
      <span style={{ fontSize:12, fontWeight:600 }}>
        {playerId ? pName : "—"}
      </span>
    </button>
  );
}

/* ═══════════════════════════════════════════
   SUBSTITUTION SHEET
═══════════════════════════════════════════ */
function SubSheet({ zone, outName, bench, isBack, onSub, onCancel, libero, subsLeft, subLimit }: any) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.74)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100,
    }}>
      <div style={{
        width: "100%", maxWidth: 375,
        background: "#111116", borderRadius: "20px 20px 0 0",
        border: `1px solid ${C.bd}`, padding: "18px 16px 36px",
      }}>
        {/* Handle */}
        <div style={{
          width: 32, height: 3, borderRadius: 2,
          background: "rgba(255,255,255,0.15)", margin: "0 auto 20px",
        }}/>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize:10, color:C.t2, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>
              Cambio · {ZLBL[zone as keyof typeof ZLBL]}
            </div>
            <div style={{ fontSize:17, fontWeight:500, color:C.w }}>
              Sale {outName}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize:10, color:C.t3, textTransform:"uppercase", letterSpacing:"0.08em" }}>Cambios Restantes</div>
            <div style={{ fontSize:16, fontWeight:600, color: subsLeft === 0 ? C.rdLt : C.vtLt }}>{subsLeft} / {subLimit}</div>
          </div>
        </div>

        {/* Libero option — only back row */}
        {isBack && libero && (
          <>
            <button onClick={() => onSub(libero.id, true)} style={{
              width: "100%", padding: 13, borderRadius: 10, marginBottom: 12,
              border: `1px solid ${C.vt}`, background: C.vtBg,
              color: C.vtLt, fontSize: 14, fontWeight: 500,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <Ico k="down" sz={15}/> Entra líbero ({shortName(libero.name)})
            </button>
            {bench.length > 0 && (
              <div style={{ fontSize:10, color:C.t3, textAlign:"center", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                o cambio regular
              </div>
            )}
          </>
        )}

        {!isBack && (
          <div style={{ fontSize:11, color:C.t3, textAlign:"center", marginBottom:12 }}>
            El líbero no puede entrar en zona delantera
          </div>
        )}

        {/* Bench players */}
        {bench.length > 0 ? (
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:16 }}>
            {bench.map((p: any) => (
              <button 
                key={p.id} 
                onClick={() => onSub(p.id, false)} 
                disabled={subsLeft === 0}
                style={{
                  padding: "10px 18px", borderRadius: 999,
                  border: `1px solid ${subsLeft === 0 ? C.bd : C.bdMed}`, 
                  background: "rgba(255,255,255,0.04)",
                  color: subsLeft === 0 ? C.t3 : C.w, fontSize: 13, fontWeight:500,
                  opacity: subsLeft === 0 ? 0.5 : 1
                }}
              >
                {shortName(p.name)}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ fontSize:12, color:C.t3, textAlign:"center", marginBottom:16 }}>
            No hay suplentes disponibles
          </div>
        )}

        <button onClick={onCancel} style={{
          width: "100%", padding: 11, borderRadius: 10,
          border: `1px solid ${C.bd}`, background: "transparent",
          color: C.t2, fontSize: 13,
        }}>cancelar</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   COURT GRID
═══════════════════════════════════════════ */
function CourtGrid({ zones, lineup, selP, statuses, onTap, onLong, getPlayerName }: any) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
      {zones.map((z: any) => (
        <CourtCell
          key={z} zone={z} 
          playerId={lineup[z]}
          pName={lineup[z] ? getPlayerName(lineup[z]) : ""}
          selected={lineup[z] === selP}
          status={statuses[lineup[z]] || "gray"}
          onTap={() => lineup[z] && onTap(lineup[z])}
          onLong={() => lineup[z] && onLong(z)}
        />
      ))}
    </div>
  );
}

function Net() {
  return (
    <div style={{ position:"relative", height:1, background:"rgba(255,255,255,0.07)", margin:"8px 0" }}>
      <span style={{
        position: "absolute", top: -7, left: "50%", transform: "translateX(-50%)",
        fontSize: 8, color: C.t3, background: C.bg,
        padding: "0 6px", letterSpacing: "0.12em",
      }}>RED</span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LIVE ANALYTICS VIEW
═══════════════════════════════════════════ */
function LiveAnalytics({ rallies, players, onClose, currentRallyActions }: any) {
  const [filterType, setFilterType] = useState<"all"|"our"|"rival">("all");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string|null>(null);

  // Aggregate stats from rallies
  const stats: any = {};
  players.forEach((p: any) => {
    stats[p.id] = { 
      id: p.id, name: shortName(p.name), 
      attacks: 0, kills: 0, errors: 0, blocks: 0,
      serves: 0, aces: 0, serveErr: 0,
      receptions: 0, recPos: 0,
      defenses: 0
    };
  });

  let totalKills = 0;
  let totalErrors = 0;
  let totalAttacks = 0;

  rallies.forEach((r: any) => {
    r.actions.forEach((a: any) => {
      if (!stats[a.playerId]) return;
      if (a.gesture === "ataque" || a.gesture === "dejada") {
        stats[a.playerId].attacks++;
        totalAttacks++;
        if (a.quality === "pos") { stats[a.playerId].kills++; totalKills++; }
        if (a.quality === "neg") { stats[a.playerId].errors++; totalErrors++; }
      }
      if (a.gesture === "bloqueo" && a.quality === "pos") {
        stats[a.playerId].blocks++;
      }
      if (a.gesture === "saque") {
        stats[a.playerId].serves++;
        if (a.quality === "pos") stats[a.playerId].aces++;
        if (a.quality === "neg") stats[a.playerId].serveErr++;
      }
      if (a.gesture === "recepcion" || a.gesture === "recepción") {
        stats[a.playerId].receptions++;
        if (a.quality === "pos") stats[a.playerId].recPos++;
      }
      if (a.gesture === "defensa") {
        stats[a.playerId].defenses++;
      }
    });
  });

  const statList = Object.values(stats).filter((s: any) => s.attacks > 0 || s.blocks > 0 || s.kills > 0 || s.errors > 0 || s.serves > 0 || s.receptions > 0 || s.defenses > 0);

  // Compute points for heatmap based on filters
  const heatPoints = rallies.filter((r: any) => {
    if (filterType === "our" && r.winner !== "our") return false;
    if (filterType === "rival" && r.winner !== "rival") return false;
    if (selectedPlayerId) {
      const participated = r.actions.some((a: any) => a.playerId === selectedPlayerId);
      if (!participated) return false;
    }
    return true;
  });

  const teamEff = totalAttacks > 0 ? Math.round(((totalKills - totalErrors) / totalAttacks) * 100) : 0;

  // New Metrics
  const lostServes = (currentRallyActions || []).filter((a:any) => a.gesture === 'saque' && a.quality === 'neg').length 
                   + rallies.flatMap((r:any) => r.actions).filter((a:any) => a.gesture === 'saque' && a.quality === 'neg').length;

  const rotationStats: Record<string, { win: number, lose: number }> = {};
  rallies.forEach((r:any) => {
    if (r.lineup && r.lineup.p1) {
      const p1 = r.lineup.p1;
      if (!rotationStats[p1]) rotationStats[p1] = { win: 0, lose: 0 };
      if (r.winner === 'our') rotationStats[p1].win++;
      else rotationStats[p1].lose++;
    }
  });
  
  let bestRotationPlayerId: string | null = null;
  let bestRotationDiff = -999;
  Object.keys(rotationStats).forEach(p1 => {
    const diff = rotationStats[p1].win - rotationStats[p1].lose;
    if (diff > bestRotationDiff) {
      bestRotationDiff = diff;
      bestRotationPlayerId = p1;
    }
  });
  
  const bestRotationName = bestRotationPlayerId ? (players.find((p:any) => p.id === bestRotationPlayerId)?.name || '') : 'N/A';

  const courtImpacts = heatPoints
    .filter((r: any) => r.impact && r.impact.plane === 'court' && r.impact.x !== undefined && r.impact.y !== undefined)
    .map((r: any) => ({
      x: r.impact.x,
      y: r.impact.y,
      weight: r.impact.weight || (r.winner === 'our' ? 2 : 1),
      type: r.impact.type || (r.winner === 'our' ? 'positive' : 'negative'),
      out: r.impact.out
    }));

  return (
    <div style={{
      position: "fixed", inset: 0, background: C.bg, zIndex: 150,
      padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column"
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, marginTop:10 }}>
        <div>
          <h2 style={{ color:C.w, fontSize:22, fontWeight:600 }}>Análisis en Vivo</h2>
          {selectedPlayerId && (
            <div style={{ color: C.vtLt, fontSize: 13, marginTop: 4 }}>
              Filtrando por: {stats[selectedPlayerId]?.name} 
              <button onClick={()=>setSelectedPlayerId(null)} style={{textDecoration:"underline", marginLeft:8}}>Quitar filtro</button>
            </div>
          )}
        </div>
        <button onClick={onClose} style={{ color:C.t2, fontSize:14 }}>Cerrar</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
        
        {/* HEAT MAP */}
        <div style={{ background:C.card, border:`1px solid ${C.bd}`, borderRadius:12, padding:16 }}>
          <h3 style={{ color:C.t1, fontSize:14, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:12 }}>Mapa de Impactos</h3>
          
          <div style={{ display:"flex", gap:8, marginBottom: 16 }}>
            <button onClick={()=>setFilterType("all")} style={{ flex:1, padding:8, borderRadius:6, fontSize:12, background: filterType==="all"?C.vtBg:"transparent", border:`1px solid ${filterType==="all"?C.vtBd:C.bd}`, color: filterType==="all"?C.vtLt:C.t2, transition: "all 0.2s" }}>Todos</button>
            <button onClick={()=>setFilterType("our")} style={{ flex:1, padding:8, borderRadius:6, fontSize:12, background: filterType==="our"?C.gnBg:"transparent", border:`1px solid ${filterType==="our"?C.gn:C.bd}`, color: filterType==="our"?C.gnLt:C.t2, transition: "all 0.2s" }}>A Favor</button>
            <button onClick={()=>setFilterType("rival")} style={{ flex:1, padding:8, borderRadius:6, fontSize:12, background: filterType==="rival"?C.rdBg:"transparent", border:`1px solid ${filterType==="rival"?C.rd:C.bd}`, color: filterType==="rival"?C.rdLt:C.t2, transition: "all 0.2s" }}>En Contra</button>
          </div>

          <div style={{ position:"relative", width: "100%", maxWidth: 280, margin: "0 auto" }}>
            <CourtHeatmap impacts={courtImpacts} mode="view" />
          </div>
        </div>

        {/* TEAM SUMMARY */}
        <div style={{ background:C.card, border:`1px solid ${C.bd}`, borderRadius:12, padding:16 }}>
          <h3 style={{ color:C.t1, fontSize:14, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:12 }}>Métricas de Equipo</h3>
          <div style={{ display:"flex", gap:12, marginBottom: 12 }}>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 8 }}>
              <div style={{ color:C.t3, fontSize:11, textTransform:"uppercase" }}>Total Rallies</div>
              <div style={{ color:C.w, fontSize:24, fontWeight:600 }}>{rallies.length}</div>
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 8 }}>
              <div style={{ color:C.t3, fontSize:11, textTransform:"uppercase" }}>Eficiencia</div>
              <div style={{ color: teamEff > 30 ? C.gnLt : teamEff < 0 ? C.rdLt : C.w, fontSize:24, fontWeight:600 }}>{teamEff}%</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:12, marginBottom: 20 }}>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 8 }}>
              <div style={{ color:C.t3, fontSize:11, textTransform:"uppercase" }}>Saques Perdidos</div>
              <div style={{ color:C.rdLt, fontSize:20, fontWeight:600 }}>{lostServes}</div>
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 8 }}>
              <div style={{ color:C.t3, fontSize:11, textTransform:"uppercase" }}>Mejor Rotación (Al saque)</div>
              <div style={{ color:C.gnLt, fontSize:14, fontWeight:600, marginTop:4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortName(bestRotationName)}</div>
            </div>
          </div>
          
          <div style={{ background: "rgba(255,255,255,0.02)", padding: 16, borderRadius: 8 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:C.t2, marginBottom:8 }}>
              <span style={{ color: C.gnLt }}>Puntos Ganados ({totalKills})</span>
              <span style={{ color: C.rdLt }}>Errores ({totalErrors})</span>
            </div>
            <div style={{ width: "100%", height: 10, background: "rgba(255,255,255,0.05)", borderRadius: 5, overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${totalKills / Math.max(1, totalKills + totalErrors) * 100}%`, background: C.gn, transition: "width 0.3s" }} />
              <div style={{ width: `${totalErrors / Math.max(1, totalKills + totalErrors) * 100}%`, background: C.rd, transition: "width 0.3s" }} />
            </div>
          </div>
        </div>

        {/* BOX SCORE */}
        <div style={{ background:C.card, border:`1px solid ${C.bd}`, borderRadius:12, padding:16, gridColumn: "1 / -1" }}>
          <h3 style={{ color:C.t1, fontSize:14, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4 }}>Rendimiento Individual</h3>
          <p style={{ color:C.t2, fontSize:12, marginBottom: 16 }}>Toca un jugador para ver sus zonas de impacto en el mapa.</p>
          
          {statList.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width:"100%", textAlign:"left", borderCollapse:"collapse", color:C.t1, fontSize:13, minWidth: 600 }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${C.bdMed}`, color:C.t3 }}>
                    <th style={{ paddingBottom:12, fontWeight:500 }}>Jugador</th>
                    <th style={{ paddingBottom:12, fontWeight:500 }}>Atq</th>
                    <th style={{ paddingBottom:12, fontWeight:500, color:C.gnLt }}>Kill</th>
                    <th style={{ paddingBottom:12, fontWeight:500, color:C.rdLt }}>Err</th>
                    <th style={{ paddingBottom:12, fontWeight:500 }}>EFF%</th>
                    <th style={{ paddingBottom:12, fontWeight:500, borderLeft:`1px solid ${C.bd}`, paddingLeft: 8 }}>Saq(A/E)</th>
                    <th style={{ paddingBottom:12, fontWeight:500, borderLeft:`1px solid ${C.bd}`, paddingLeft: 8 }}>Rec(Pos)</th>
                    <th style={{ paddingBottom:12, fontWeight:500, borderLeft:`1px solid ${C.bd}`, paddingLeft: 8 }}>Def</th>
                  </tr>
                </thead>
                <tbody>
                  {statList.map((s: any, i) => {
                    const eff = s.attacks > 0 ? Math.round(((s.kills - s.errors) / s.attacks) * 100) : 0;
                    const recEff = s.receptions > 0 ? Math.round((s.recPos / s.receptions) * 100) : 0;
                    const isSel = selectedPlayerId === s.id;
                    return (
                      <tr key={i} onClick={() => setSelectedPlayerId(isSel ? null : s.id)} 
                          style={{ 
                            borderBottom:`1px solid ${C.bd}`, 
                            background: isSel ? "rgba(127, 119, 221, 0.15)" : "transparent", 
                            cursor: "pointer", 
                            transition: "background 0.2s" 
                          }}>
                        <td style={{ padding:"12px 8px", fontWeight:600, color: isSel ? C.w : C.t1, borderLeft: isSel ? `3px solid ${C.vtLt}` : "3px solid transparent" }}>{s.name}</td>
                        <td style={{ padding:"12px 8px" }}>{s.attacks}</td>
                        <td style={{ padding:"12px 8px", color:C.gnLt }}>{s.kills}</td>
                        <td style={{ padding:"12px 8px", color:C.rdLt }}>{s.errors}</td>
                        <td style={{ padding:"12px 8px", fontWeight:600, color: eff > 30 ? C.gnLt : eff < 0 ? C.rdLt : C.w }}>{eff}%</td>
                        <td style={{ padding:"12px 8px", borderLeft:`1px solid ${C.bd}` }}>{s.aces} / {s.serveErr}</td>
                        <td style={{ padding:"12px 8px", borderLeft:`1px solid ${C.bd}` }}>{recEff}%</td>
                        <td style={{ padding:"12px 8px", borderLeft:`1px solid ${C.bd}` }}>{s.defenses}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ color:C.t3, fontSize:13, textAlign:"center", padding:"20px 0" }}>Aún no hay estadísticas suficientes</div>
          )}
        </div>

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LIVEMATCHCENTER MAIN COMPONENT
═══════════════════════════════════════════ */
export default function LiveMatchCenter() {
  const { state, createMatch } = useApp();
  const { players } = state;

  /* — Match/Database State — */
  const [opponent, setOpponent] = useState("");
  const [matchType, setMatchType] = useState("Amistoso");
  const [subRule, setSubRule] = useState(6); // 6 (FIVB) or 12 (Juvenil)

  /* — Navigation — */
  const [screen, setScreen] = useState("setup"); // "setup" | "lineup" | "live"
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [setNum, setSetNum] = useState(1);

  /* — Lineup state — */
  const [lineup, setLineup] = useState<any>({ p1:null, p2:null, p3:null, p4:null, p5:null, p6:null });
  const [firstServingTeam, setFirstServingTeam] = useState<'our' | 'rival'>('our');
  const [prevLu, setPrevLu] = useState<any>(null);
  const [editZone, setEditZone] = useState<string|null>(null);

  /* — Global Rally History (Para Analytics) — */
  const [allRallies, setAllRallies] = useState<any[]>([]);
  // We keep a timeline of events (timeouts, rallies)
  const [timeline, setTimeline] = useState<any[]>([]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [setsScores, setSetsScores] = useState<{our: number, rival: number}[]>([]);

  /* — Current Rally state (Punto Activo) — */
  const [currentRallyActions, setCurrentRallyActions] = useState<any[]>([]);
  const [pendingEndResult, setPendingEndResult] = useState<{winner: 'our'|'rival', action?: any} | null>(null);
  const [pendingError, setPendingError] = useState<any>(null);

  /* — Live Match state — */
  const [ourScore,   setOurScore]   = useState(0);
  const [rivalScore, setRivalScore] = useState(0);
  const [selP,       setSelP]       = useState<string|null>(null);
  const [activeG,    setActiveG]    = useState("ataque");
  const [subZone,    setSubZone]    = useState<string|null>(null);
  const [flash,      setFlash]      = useState<string|null>(null);
  const [msg,        setMsg]        = useState("");
  const [hist,       setHist]       = useState<any[]>([]); // undo history
  
  // Set-specific trackers
  const [subsUsed, setSubsUsed] = useState(0);
  const [ourTimeouts, setOurTimeouts] = useState(0);
  const [rivalTimeouts, setRivalTimeouts] = useState(0);
  const [rotationCount, setRotationCount] = useState<number>(0);

  // Point menus for Punto Nuestro / Punto Rival
  const [pointMenu, setPointMenu] = useState<'our' | 'rival' | null>(null);
  const [pointSubStep, setPointSubStep] = useState<
    'main' | 'rival_errors' | 'rival_points' | 'select_player' | 'select_gesture' | 'rival_number'
  >('main');
  const [tempPlayerId, setTempPlayerId] = useState<string | null>(null);
  const [tempPointQuality, setTempPointQuality] = useState<Quality>('#');
  const [tempRivalAction, setTempRivalAction] = useState<{
    winner: 'our' | 'rival';
    pointType: 'regalado_rival' | 'perdido';
    gesture: Gesture;
    quality: Quality;
    detailType: string;
  } | null>(null);
  const [rivalNumberInput, setRivalNumberInput] = useState<string>('');

  // --- HYDRATION ---
  useEffect(() => {
    const saved = localStorage.getItem("volleyLab_liveMatch");
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.opponent) setOpponent(s.opponent);
        if (s.matchType) setMatchType(s.matchType);
        if (s.subRule) setSubRule(s.subRule);
        if (s.screen) setScreen(s.screen);
        if (s.setNum) setSetNum(s.setNum);
        if (s.lineup) setLineup(s.lineup);
        if (s.firstServingTeam) setFirstServingTeam(s.firstServingTeam);
        if (s.allRallies) setAllRallies(s.allRallies);
        if (s.timeline) setTimeline(s.timeline);
        if (s.setsScores) setSetsScores(s.setsScores);
        if (s.currentRallyActions) setCurrentRallyActions(s.currentRallyActions);
        if (s.ourScore) setOurScore(s.ourScore);
        if (s.rivalScore) setRivalScore(s.rivalScore);
        if (s.subsUsed) setSubsUsed(s.subsUsed);
        if (s.ourTimeouts) setOurTimeouts(s.ourTimeouts);
        if (s.rivalTimeouts) setRivalTimeouts(s.rivalTimeouts);
        if (typeof s.rotationCount === 'number') setRotationCount(s.rotationCount);
      } catch (e) {
        console.error("Error loading match state", e);
      }
    }
  }, []);

  // --- AUTO-SAVE ---
  useEffect(() => {
    if (screen !== "setup") {
      const stateToSave = {
        opponent, matchType, subRule, screen, setNum, lineup, firstServingTeam,
        allRallies, timeline, setsScores, currentRallyActions,
        ourScore, rivalScore, subsUsed, ourTimeouts, rivalTimeouts, rotationCount
      };
      localStorage.setItem("volleyLab_liveMatch", JSON.stringify(stateToSave));
    }
  }, [opponent, matchType, subRule, screen, setNum, lineup, firstServingTeam, allRallies, timeline, setsScores, currentRallyActions, ourScore, rivalScore, subsUsed, ourTimeouts, rivalTimeouts, rotationCount]);


  /* — Derived Players — */
  const benchPlayers = useMemo(() => luBench(lineup, players), [lineup, players]);
  const liberoPlayer = useMemo(() => players.find(p => p.position === "Líbero" || p.position === "Libero"), [players]);

  const getPlayerName = (id: string) => {
    const p = players.find(pl => pl.id === id);
    return p ? shortName(p.name) : "—";
  };

  const gLabel = GESTURES.find(g => g.id === activeG)?.label || "";

  /* — Undo History — */
  const snap = () => ({
    ourScore, rivalScore, lineup: dc(lineup),
    currentRallyActions: dc(currentRallyActions), subsUsed, ourTimeouts, rivalTimeouts, rotationCount,
    allRallies: dc(allRallies), timeline: dc(timeline)
  });
  const pushH = () => setHist(h => [...h.slice(-19), snap()]);

  const undo = () => {
    if (!hist.length) return;
    const p = hist[hist.length - 1];
    setOurScore(p.ourScore);
    setRivalScore(p.rivalScore);
    setLineup(p.lineup);
    setCurrentRallyActions(p.currentRallyActions);
    setSubsUsed(p.subsUsed);
    setOurTimeouts(p.ourTimeouts);
    setRivalTimeouts(p.rivalTimeouts);
    if (typeof p.rotationCount === 'number') setRotationCount(p.rotationCount);
    if (p.allRallies) setAllRallies(p.allRallies);
    if (p.timeline) setTimeline(p.timeline);
    setHist(h => h.slice(0, -1));
    setMsg("deshecho");
  };

  /* — Deduce serving team from previous rally in the current set — */
  const getCurrentServingTeam = (actionsInRally: any[]): 'our' | 'rival' => {
    const setRallies = allRallies.filter((r: any) => r.setNum === setNum);
    if (setRallies.length > 0) {
      return setRallies[setRallies.length - 1].winner === 'our' ? 'our' : 'rival';
    }
    const firstAction = actionsInRally?.[0];
    if (firstAction?.gesture === 'saque' && firstAction.playerId) return 'our';
    if (firstAction?.gesture === 'recepcion' || firstAction?.gesture === 'recepción') return 'rival';
    return firstServingTeam;
  };

  const rotateLineup = (l: any) => ({ p1: l.p2, p2: l.p3, p3: l.p4, p4: l.p5, p5: l.p6, p6: l.p1 });

  const doFlash = (side: string) => {
    setFlash(side);
    setTimeout(() => setFlash(null), 280);
  };

  /* ── 1. SETUP MATCH ── */
  const handleCreateMatch = async () => {
    if (!opponent) { setMsg("Falta rival"); return; }
    setScreen("lineup");
    setMsg("");
  };

  /* ── 2. START LIVE SET ── */
  const startLive = () => {
    const nums = luNums(lineup);
    setSelP(nums[0] || null);
    setHist([]); setMsg("");
    setOurScore(0); setRivalScore(0); 
    if (setNum === 1) setSetsScores([]);
    setSubsUsed(0); setOurTimeouts(0); setRivalTimeouts(0);
    setRotationCount(0);
    setCurrentRallyActions([]);
    setScreen("live");
  };

  /* ── 3. RALLY LOGIC (5-level Quality: #, +, !, -, =) ── */
  const regResult = (key: Quality, overridePlayerId?: string, overrideGesture?: Gesture) => {
    const targetPlayer = overridePlayerId || selP;
    const targetGesture = (overrideGesture || activeG) as Gesture;
    if (!targetPlayer) return;

    if (overridePlayerId) setSelP(overridePlayerId);
    if (overrideGesture) setActiveG(overrideGesture);

    const action: RallyAction = {
      id: crypto.randomUUID(),
      ts: Date.now(),
      team: 'our',
      playerId: targetPlayer,
      gesture: targetGesture,
      quality: key,
      phase: computeActionPhase(
        getCurrentServingTeam(currentRallyActions) === 'rival' ? 'K1' : 'K2',
        currentRallyActions
      )
    };

    const outcome = rallyOutcomeFromAction(action);

    if (!outcome.isClosed) {
      // Punto sigue
      pushH();
      setCurrentRallyActions(prev => [...prev, action]);
      const label = QUALITY_LABELS[action.gesture]?.[key] || key;
      setMsg(`${label} de ${getPlayerName(targetPlayer)}`);
    } else if (outcome.winner === 'our') {
      // Punto nuestro
      setPendingEndResult({ winner: 'our', action });
    } else if (outcome.winner === 'rival') {
      // Error nuestro / Punto rival: abre modal de tipo de error
      setPendingError(action);
    }
  };

  const handleSelectErrorReason = (reason: string) => {
    const errorTypeMap: Record<string, string> = {
      'Red': 'red',
      'Fuera': 'fuera',
      'Falta Técnica': 'falta_tecnica',
      'Bloqueado': 'bloqueado',
      'Invasión': 'invasion',
      'Rotación': 'rotacion'
    };
    const actionWithError = {
      ...pendingError,
      detail: {
        ...(pendingError.detail || {}),
        errorType: errorTypeMap[reason] || 'falta_tecnica'
      }
    };
    setPendingError(null);
    
    // Si fue falta técnica, no necesitamos heatmap, terminamos el rally aquí.
    if (reason === 'Falta Técnica' || reason === 'Invasión' || reason === 'Rotación') {
      pushH();
      const finalActions = [...currentRallyActions, actionWithError];
      const servingTeam = getCurrentServingTeam(finalActions);
      const nextOurScore = ourScore;
      const nextRivalScore = rivalScore + 1;
      const newRally = {
        id: crypto.randomUUID(),
        winner: 'rival' as const,
        servingTeam,
        rotation: computeRotation(lineup, players, rotationCount),
        phase: servingTeam === 'rival' ? 'K1' : 'K2',
        pointType: 'regalado_nuestro' as const,
        ourScore: nextOurScore,
        rivalScore: nextRivalScore,
        setNum,
        endLocation: 'falta',
        actions: finalActions,
        lineup: dc(lineup)
      };
      setAllRallies(prev => [...prev, newRally]);
      setTimeline(prev => [...prev, { type: 'rally', data: newRally }]);
      setRivalScore(nextRivalScore);
      doFlash("rival");
      setMsg(`Punto rival (${reason} de ${getPlayerName(actionWithError.playerId)})`);
      setCurrentRallyActions([]);
    } else {
      // Para Red o Fuera, pedimos confirmación de posición o la saltamos
      setPendingEndResult({ winner: 'rival', action: actionWithError });
    }
  };

  const openPointMenu = (side: 'our' | 'rival') => {
    setPointMenu(side);
    setPointSubStep('main');
    setTempPlayerId(null);
    setTempRivalAction(null);
    setRivalNumberInput('');
  };

  const finishRallyWithRivalAction = (rivalNum?: number | null) => {
    if (!tempRivalAction) return;
    const { winner, pointType, gesture, quality, detailType } = tempRivalAction;
    pushH();
    const servingTeam = getCurrentServingTeam(currentRallyActions);
    const phase = servingTeam === 'rival' ? ('K1' as const) : ('K2' as const);
    const actionPhase = computeActionPhase(phase, currentRallyActions);

    const rivalAction: RallyAction = {
      id: crypto.randomUUID(),
      ts: Date.now(),
      team: 'rival',
      playerId: null,
      rivalNumber: rivalNum || null,
      gesture,
      quality,
      phase: actionPhase,
      detail: {
        errorType: detailType as any
      }
    };

    const finalActions = [...currentRallyActions, rivalAction];
    const nextOurScore = winner === 'our' ? ourScore + 1 : ourScore;
    const nextRivalScore = winner === 'rival' ? rivalScore + 1 : rivalScore;

    const newRally = {
      id: crypto.randomUUID(),
      winner,
      servingTeam,
      rotation: computeRotation(lineup, players, rotationCount),
      phase,
      pointType,
      ourScore: nextOurScore,
      rivalScore: nextRivalScore,
      setNum,
      actions: finalActions,
      lineup: dc(lineup)
    };

    setAllRallies(prev => [...prev, newRally]);
    setTimeline(prev => [...prev, { type: 'rally', data: newRally }]);

    if (winner === 'our') {
      setOurScore(nextOurScore);
      doFlash('our');
      if (servingTeam === 'rival') {
        setLineup((l: any) => rotateLineup(l));
        setRotationCount(c => c + 1);
        setMsg('¡Side-out ganado! Rotación automática');
      } else {
        setMsg('¡Punto ganado!');
      }
    } else {
      setRivalScore(nextRivalScore);
      doFlash('rival');
      setMsg('Punto rival.');
    }

    setCurrentRallyActions([]);
    setPointMenu(null);
    setPointSubStep('main');
    setTempRivalAction(null);
  };

  const confirmEndOfRally = (impact: any, plane: 'court'|'net', skipHeatmap = false) => {
    if (!pendingEndResult) return;
    
    pushH();
    
    // Determine the targetZone based on the heatmap used
    let targetZone = '';
    let finalImpact = impact;

    if (!skipHeatmap && impact) {
      if (plane === 'court') {
        targetZone = getZoneFromXY(impact.x, impact.y);
      } else {
        targetZone = getNetZoneFromXY(impact.x);
      }
    }

    // Add the final action to the rally if it came from a gesture
    const finalActions = [...currentRallyActions];
    if (pendingEndResult.action) {
      finalActions.push(pendingEndResult.action);
    }

    const servingTeam = getCurrentServingTeam(finalActions);
    const nextOurScore = pendingEndResult.winner === 'our' ? ourScore + 1 : ourScore;
    const nextRivalScore = pendingEndResult.winner === 'rival' ? rivalScore + 1 : rivalScore;

    let pointType: 'ganado' | 'regalado_rival' | 'perdido' | 'regalado_nuestro' = 'ganado';
    if (pendingEndResult.winner === 'our') {
      pointType = pendingEndResult.action?.team === 'rival' ? 'regalado_rival' : 'ganado';
    } else {
      pointType = pendingEndResult.action?.team === 'our' ? 'regalado_nuestro' : 'perdido';
    }

    // Save rally globally
    const newRally = {
      id: crypto.randomUUID(),
      winner: pendingEndResult.winner,
      servingTeam,
      rotation: computeRotation(lineup, players),
      phase: servingTeam === 'rival' ? ('K1' as const) : ('K2' as const),
      pointType,
      ourScore: nextOurScore,
      rivalScore: nextRivalScore,
      setNum,
      endLocation: targetZone,
      impact: skipHeatmap ? null : { ...finalImpact, plane },
      actions: finalActions,
      lineup: dc(lineup)
    };
    setAllRallies(prev => [...prev, newRally]);
    setTimeline(prev => [...prev, { type: 'rally', data: newRally }]);

    // Update Score & automatic rotation on side-out won
    if (pendingEndResult.winner === "our") {
      setOurScore(nextOurScore);
      doFlash("our");
      if (servingTeam === "rival") {
        setLineup((l: any) => rotateLineup(l));
        setRotationCount(c => c + 1);
        setMsg("¡Side-out ganado! Rotación automática");
      } else {
        setMsg("¡Punto ganado!");
      }
    } else {
      setRivalScore(nextRivalScore);
      doFlash("rival");
      setMsg("Punto perdido.");
    }

    // Reset current rally
    setCurrentRallyActions([]);
    setPendingEndResult(null);
  };

  /* ── ROTATE, TIMEOUTS & SUBS ── */
  const rotate = () => {
    pushH();
    setLineup((l:any) => rotateLineup(l));
    setRotationCount(c => c + 1);
    setMsg("Rotación aplicada");
  };

  const callTimeout = (team: 'our'|'rival') => {
    if (team === 'our' && ourTimeouts >= 2) { setMsg("Ya usaste tus 2 tiempos"); return; }
    if (team === 'rival' && rivalTimeouts >= 2) { setMsg("El rival ya usó sus 2 tiempos"); return; }
    pushH();
    if (team === 'our') {
      setOurTimeouts(t => t + 1);
    } else {
      setRivalTimeouts(t => t + 1);
    }
    setTimeline(prev => [...prev, { type: 'timeout', team, ourScore, rivalScore }]);
    setMsg(`Tiempo fuera: ${team === 'our' ? 'Nuestro' : 'Rival'}`);
  };

  const doSub = (zone: string, newN: string, isLiberoSub: boolean) => {
    if (!isLiberoSub && subsUsed >= subRule) {
      setMsg("Límite de cambios alcanzado");
      return;
    }
    pushH();
    const outN = getPlayerName(lineup[zone]);
    setLineup((l:any) => ({ ...l, [zone]: newN }));
    setSubZone(null);
    if (!isLiberoSub) setSubsUsed(s => s + 1);
    
    setTimeline(prev => [...prev, { type: 'sub', team: 'our', out: outN, in: getPlayerName(newN) }]);
    setMsg(`Cambio: Entra ${getPlayerName(newN)} x Sale ${outN}`);
  };

  /* ── END SET & MATCH ── */
  const endSet = () => {
    setSetsScores(prev => [...prev, { our: ourScore, rival: rivalScore }]);
    setPrevLu(dc(lineup));
    setLineup({ p1:null, p2:null, p3:null, p4:null, p5:null, p6:null });
    setSetNum(n => n + 1);
    setEditZone(null);
    setOurScore(0);
    setRivalScore(0);
    setRotationCount(0);
    setScreen("lineup");
  };

  const getLocalDateString = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const endMatch = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setMsg("Guardando partido...");
    
    const finalSets = [...setsScores, { our: ourScore, rival: rivalScore }];
    const scoreStr = finalSets.map(s => `${s.our}-${s.rival}`).join(', ');
    
    let ourSets = 0;
    let rivalSets = 0;
    finalSets.forEach(s => {
      if (s.our > s.rival) ourSets++;
      else if (s.rival > s.our) rivalSets++;
    });
    const resultStr: 'W' | 'L' | 'D' = ourSets > rivalSets ? 'W' : ourSets < rivalSets ? 'L' : 'D';

    try {
      await createMatch({
        opponent, 
        date: getLocalDateString(),
        matchType, 
        players: [], 
        score: scoreStr,
        result: resultStr,
        rallies: allRallies,
        timeline
      } as any);

      localStorage.removeItem("volleyLab_liveMatch");

      setTimeout(() => {
        localStorage.removeItem("volleyLab_liveMatch");
        setScreen("setup");
        setAllRallies([]);
        setTimeline([]);
        setSetsScores([]);
        setOurScore(0);
        setRivalScore(0);
        setSetNum(1);
        setMsg("");
        setIsSaving(false);
      }, 1500);
    } catch (err) {
      setMsg("Error guardando");
      setIsSaving(false);
      console.error(err);
    }
  };


  /* ══════════════════════════════════
     SCREEN: SETUP MATCH
  ══════════════════════════════════ */
  if (screen === "setup") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ width:"100%", maxWidth:375 }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: C.w, marginBottom: 24 }}>Nuevo Partido</div>
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ display:"block", color:C.t2, fontSize:12, marginBottom:8 }}>Equipo Rival</label>
            <input 
              value={opponent} onChange={e => setOpponent(e.target.value)}
              placeholder="Ej: Club Tigres"
              style={{ width:"100%", padding:14, borderRadius:10, background:C.card, border:`1px solid ${C.bd}`, color:C.w, fontSize:16, colorScheme: "dark" }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display:"block", color:C.t2, fontSize:12, marginBottom:8 }}>Tipo de Partido</label>
            <select 
              value={matchType} onChange={e => setMatchType(e.target.value)}
              style={{ width:"100%", padding:14, borderRadius:10, background:C.card, border:`1px solid ${C.bd}`, color:C.w, fontSize:16, colorScheme: "dark" }}
            >
              <option value="Amistoso" style={{ background: C.bg, color: C.w }}>Amistoso</option>
              <option value="Liga" style={{ background: C.bg, color: C.w }}>Liga</option>
              <option value="Torneo" style={{ background: C.bg, color: C.w }}>Torneo</option>
            </select>
          </div>

          <div style={{ marginBottom: 32 }}>
            <label style={{ display:"block", color:C.t2, fontSize:12, marginBottom:8 }}>Regla de Sustituciones</label>
            <select 
              value={subRule} onChange={e => setSubRule(Number(e.target.value))}
              style={{ width:"100%", padding:14, borderRadius:10, background:C.card, border:`1px solid ${C.bd}`, color:C.w, fontSize:16, colorScheme: "dark" }}
            >
              <option value={6} style={{ background: C.bg, color: C.w }}>6 Cambios (Regla FIVB)</option>
              <option value={12} style={{ background: C.bg, color: C.w }}>12 Cambios (Regla Juvenil)</option>
            </select>
          </div>

          <button onClick={handleCreateMatch} style={{
            width: "100%", padding: 16, borderRadius: 12,
            background: opponent ? C.vtBg : "transparent",
            border: `1px solid ${opponent ? C.vt : C.bd}`,
            color: opponent ? C.vtLt : C.t3,
            fontWeight: 600, fontSize: 16,
            transition: "all 0.2s"
          }} disabled={!opponent}>
            Crear Partido y Alineación
          </button>
          <div style={{ color:C.rd, fontSize:12, marginTop:12, textAlign:"center" }}>{msg}</div>
        </div>
      </div>
    );
  }


  /* ══════════════════════════════════
     SCREEN: LINEUP
  ══════════════════════════════════ */
  if (screen === "lineup") {
    const assigned = luNums(lineup);
    const filled   = assigned.length;

    const CellLU = ({ z }: any) => {
      const val = lineup[z];
      const ed  = editZone === z;
      return (
        <button
          onClick={() => val
            ? setLineup((l:any) => ({ ...l, [z]: null }))
            : setEditZone(ed ? null : z)
          }
          style={{
            aspectRatio: "1", borderRadius: 10, position: "relative",
            border: `${ed ? "2" : "1.5"}px solid ${ed ? C.vt : val ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.10)"}`,
            background: ed ? C.vtBg : val ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
            color: val ? C.w : C.t3,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 1,
          }}
        >
          <span style={{ position:"absolute", top:3, left:5, fontSize:8, color:C.t3 }}>
            {ZLBL[z as keyof typeof ZLBL]}
          </span>
          <span style={{ fontSize:13, fontWeight:600 }}>
            {val ? getPlayerName(val) : "+"}
          </span>
          {val && <span style={{ fontSize:8, color:C.t3 }}>quitar</span>}
        </button>
      );
    };

    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", justifyContent: "center", padding: "28px 16px 32px" }}>
        <div style={{ width:"100%", maxWidth:375 }}>
          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, color: C.t2, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
              VolleyLab · Vs {opponent}
            </div>
            <div style={{ fontSize: 24, fontWeight: 600, color: C.w, lineHeight: 1.2 }}>
              Alineación inicial
            </div>
            <div style={{ fontSize: 13, color: C.t2, marginTop: 5 }}>
              Set {setNum} · Asigna a los 6 jugadores
            </div>
          </div>

          {/* Court */}
          <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.bd}`, padding: "14px 12px", marginBottom: 12 }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:8 }}>
              {FRONT.map(z => <CellLU key={z} z={z}/>)}
            </div>
            <Net/>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
              {BACK.map(z => <CellLU key={z} z={z}/>)}
            </div>
          </div>

          {/* Player picker */}
          {editZone && (
            <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.bd}`, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize:10, color:C.t2, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>
                Asignar a {ZLBL[editZone as keyof typeof ZLBL]}
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {benchPlayers.map((p: any) => (
                  <button key={p.id}
                    onClick={() => { setLineup((l:any) => ({ ...l, [editZone]: p.id })); setEditZone(null); }}
                    style={{
                      padding: "9px 16px", borderRadius: 999,
                      border: `1px solid ${C.vtBd}`, background: C.vtBg,
                      color: C.vtLt, fontSize: 13, fontWeight:500
                    }}
                  >{shortName(p.name)}</button>
                ))}
                {benchPlayers.length === 0 && <span style={{ fontSize:12, color:C.t3 }}>Todos asignados</span>}
              </div>
            </div>
          )}

          {/* Primer saque del set */}
          <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.bd}`, padding: "12px 14px", marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: C.t2, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              ¿Quién saca primero en el Set {setNum}?
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                type="button"
                onClick={() => setFirstServingTeam('our')}
                style={{
                  padding: "9px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  border: `1px solid ${firstServingTeam === 'our' ? C.vt : C.bd}`,
                  background: firstServingTeam === 'our' ? C.vtBg : "transparent",
                  color: firstServingTeam === 'our' ? C.vtLt : C.t2,
                  transition: "all 0.15s"
                }}
              >
                <Volleyball size={14} />
                <span>Nuestro Equipo</span>
              </button>
              <button
                type="button"
                onClick={() => setFirstServingTeam('rival')}
                style={{
                  padding: "9px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  border: `1px solid ${firstServingTeam === 'rival' ? '#FFD391' : C.bd}`,
                  background: firstServingTeam === 'rival' ? 'rgba(255,211,145,0.1)' : "transparent",
                  color: firstServingTeam === 'rival' ? '#FFD391' : C.t2,
                  transition: "all 0.15s"
                }}
              >
                <Volleyball size={14} />
                <span>{opponent || 'Rival'}</span>
              </button>
            </div>
          </div>

          {/* Start set */}
          <button onClick={filled === 6 ? startLive : undefined} style={{
              width: "100%", padding: 16, borderRadius: 12,
              border: `1px solid ${filled === 6 ? C.vt : C.bd}`,
              background: filled === 6 ? C.vtBg : "transparent",
              color: filled === 6 ? C.vtLt : C.t3,
              fontSize: 15, fontWeight: 600,
              opacity: filled === 6 ? 1 : 0.38,
              marginTop: editZone ? 0 : 4,
            }}
          >
            Iniciar Set {setNum}
          </button>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════
     SCREEN: LIVE TRACKING
  ══════════════════════════════════ */
  return (
    <>
      {showAnalytics && <LiveAnalytics rallies={allRallies} players={players} onClose={() => setShowAnalytics(false)} currentRallyActions={currentRallyActions} />}
      
      {/* ERROR REASON MODAL */}
      {pendingError && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', padding: 20 }}>
          <div style={{ width: 320, background: '#111116', border: `1px solid ${C.bd}`, borderRadius: 16, padding: 20, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 style={{ color: C.w, fontSize: 16, fontWeight: 600, margin: 0 }}>¿Qué sucedió?</h3>
              <button onClick={() => setPendingError(null)} style={{ background: 'none', border: 'none', color: C.t2, cursor: 'pointer', padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ color: C.t2, fontSize: 12, marginBottom: 16, textAlign: 'left' }}>
              Error en {pendingError.gesture} de {getPlayerName(pendingError.playerId)}
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => handleSelectErrorReason("Red")} style={{ minHeight: 44, padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.bdMed}`, background: "rgba(255,255,255,0.04)", color: C.w, fontSize: 14, fontWeight: 500, textAlign: 'left' }}>
                Error en la red
              </button>
              <button onClick={() => handleSelectErrorReason("Fuera")} style={{ minHeight: 44, padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.bdMed}`, background: "rgba(255,255,255,0.04)", color: C.w, fontSize: 14, fontWeight: 500, textAlign: 'left' }}>
                Fuera / Out
              </button>
              {(pendingError.gesture === 'ataque' || pendingError.gesture === 'dejada') && (
                <button onClick={() => handleSelectErrorReason("Bloqueado")} style={{ minHeight: 44, padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.bdMed}`, background: "rgba(255,255,255,0.04)", color: C.w, fontSize: 14, fontWeight: 500, textAlign: 'left' }}>
                  Bloqueado por el rival
                </button>
              )}
              <button onClick={() => handleSelectErrorReason("Invasión")} style={{ minHeight: 44, padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.bdMed}`, background: "rgba(255,255,255,0.04)", color: C.w, fontSize: 14, fontWeight: 500, textAlign: 'left' }}>
                Invasión de red o línea
              </button>
              <button onClick={() => handleSelectErrorReason("Falta Técnica")} style={{ minHeight: 44, padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.bdMed}`, background: "rgba(255,255,255,0.04)", color: C.w, fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={15} color={C.rdLt} />
                <span>Falta técnica (doble, 4 toques, rotación)</span>
              </button>
            </div>
            <button onClick={() => setPendingError(null)} style={{ marginTop: 16, minHeight: 44, width: '100%', fontSize: 13, color: C.t3, background: 'none', border: 'none', cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}

      {pendingEndResult && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.92)', padding: 20 }}>
          <div style={{ position: 'relative', width: 320 }}>
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ color: pendingEndResult.winner === 'our' ? C.gnLt : C.rdLt, fontWeight: 600, fontSize: 16 }}>
                {pendingEndResult.winner === 'our' ? '¡PUNTO NUESTRO!' : 'PUNTO RIVAL'}
              </div>
              <button 
                onClick={() => setPendingEndResult(null)} 
                style={{ color: C.t2, fontSize: 12, background: 'transparent', border: 'none', padding: 4, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
              >
                <X size={16} />
                <span>Cancelar</span>
              </button>
            </div>
            
            <div style={{ color: C.t2, fontSize: 12, marginBottom: 16 }}>
              Toca dónde cayó el balón, o salta este paso si no aplica.
            </div>

            {pendingEndResult.action?.gesture === 'bloqueo' ? (
              <NetHeatmap 
                mode="capture"
                onCapture={(impact) => confirmEndOfRally(impact, 'net')}
              />
            ) : (
              <CourtHeatmap 
                mode="capture"
                viewHalf={pendingEndResult.winner === 'our' ? 'top' : 'bottom'}
                withOutZone={true}
                onCapture={(impact) => confirmEndOfRally(impact, 'court')}
              />
            )}

            <button onClick={() => confirmEndOfRally(null, 'court', true)} style={{
              width: "100%", marginTop: 20, minHeight: 44, padding: "12px 14px", borderRadius: 10,
              border: `1px solid ${C.bdMed}`, background: "rgba(255,255,255,0.05)", color: C.t1, fontSize: 14, fontWeight: 500, cursor: 'pointer'
            }}>
              Saltar Mapa
            </button>
          </div>
        </div>
      )}

      {/* ── POINT MENU MODAL (PUNTO NUESTRO / PUNTO RIVAL) ── */}
      {pointMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', padding: 16 }}>
          <div style={{ width: 330, maxHeight: '90vh', overflowY: 'auto', background: '#111116', border: `1px solid ${C.bd}`, borderRadius: 16, padding: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {pointSubStep !== 'main' && (
                  <button
                    onClick={() => {
                      if (pointSubStep === 'select_gesture') setPointSubStep('select_player');
                      else setPointSubStep('main');
                    }}
                    style={{ background: 'none', border: 'none', color: C.t2, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
                  >
                    <ArrowLeft size={18} />
                  </button>
                )}
                <h3 style={{ color: pointMenu === 'our' ? C.gnLt : C.rdLt, fontSize: 16, fontWeight: 700, margin: 0 }}>
                  {pointMenu === 'our' ? 'Punto Nuestro (+1)' : 'Punto Rival (+1)'}
                </h3>
              </div>
              <button
                onClick={() => setPointMenu(null)}
                style={{ background: 'none', border: 'none', color: C.t2, cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* STEP: MAIN MENU */}
            {pointSubStep === 'main' && (
              <div>
                <p style={{ color: C.t2, fontSize: 12, marginBottom: 16 }}>
                  {pointMenu === 'our' ? '¿Cómo se consiguió el punto?' : '¿Cómo se definió el punto?'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pointMenu === 'our' ? (
                    <>
                      <button
                        onClick={() => setPointSubStep('rival_errors')}
                        style={{
                          minHeight: 48, padding: "12px 14px", borderRadius: 10,
                          border: `1px solid ${C.vtBd}`, background: C.vtBg, color: C.vtLt,
                          fontSize: 14, fontWeight: 600, textAlign: 'left', cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', gap: 2
                        }}
                      >
                        <span>Error del Rival</span>
                        <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 400 }}>Saque fuera, red, ataque fuera, etc.</span>
                      </button>
                      <button
                        onClick={() => { setTempPointQuality('#'); setPointSubStep('select_player'); }}
                        style={{
                          minHeight: 48, padding: "12px 14px", borderRadius: 10,
                          border: `1px solid ${C.gn}`, background: C.gnBg, color: C.gnLt,
                          fontSize: 14, fontWeight: 600, textAlign: 'left', cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', gap: 2
                        }}
                      >
                        <span>Punto Ganado por Nosotros (#)</span>
                        <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 400 }}>Ace, ataque ganador, bloqueo, dejada</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setPointSubStep('rival_points')}
                        style={{
                          minHeight: 48, padding: "12px 14px", borderRadius: 10,
                          border: `1px solid ${C.rd}`, background: C.rdBg, color: C.rdLt,
                          fontSize: 14, fontWeight: 600, textAlign: 'left', cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', gap: 2
                        }}
                      >
                        <span>Punto del Rival</span>
                        <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 400 }}>Ataque rival, ace rival, bloqueo rival</span>
                      </button>
                      <button
                        onClick={() => { setTempPointQuality('='); setPointSubStep('select_player'); }}
                        style={{
                          minHeight: 48, padding: "12px 14px", borderRadius: 10,
                          border: `1px solid ${C.bdMed}`, background: "rgba(255,255,255,0.04)", color: C.w,
                          fontSize: 14, fontWeight: 600, textAlign: 'left', cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', gap: 2
                        }}
                      >
                        <span>Error Nuestro (=)</span>
                        <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 400 }}>Red, fuera, invasión, falta técnica</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* STEP: RIVAL ERRORS LIST */}
            {pointSubStep === 'rival_errors' && (
              <div>
                <p style={{ color: C.t2, fontSize: 12, marginBottom: 14 }}>
                  Tipo de error del equipo rival:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Saque fuera', key: 'saque_fuera' },
                    { label: 'Saque a la red', key: 'saque_red' },
                    { label: 'Ataque fuera', key: 'ataque_fuera' },
                    { label: 'Ataque a la red', key: 'ataque_red' },
                    { label: 'Invasión / Red', key: 'invasion' },
                    { label: 'Falta técnica', key: 'falta_tecnica' },
                  ].map(errItem => (
                    <button
                      key={errItem.key}
                      onClick={() => {
                        setTempRivalAction({
                          winner: 'our',
                          pointType: 'regalado_rival',
                          gesture: 'error_rival',
                          quality: '=',
                          detailType: errItem.key
                        });
                        setRivalNumberInput('');
                        setPointSubStep('rival_number');
                      }}
                      style={{
                        minHeight: 44, padding: "10px 14px", borderRadius: 10,
                        border: `1px solid ${C.bdMed}`, background: "rgba(255,255,255,0.04)",
                        color: C.w, fontSize: 14, fontWeight: 500, textAlign: 'left', cursor: 'pointer'
                      }}
                    >
                      {errItem.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP: RIVAL POINTS LIST */}
            {pointSubStep === 'rival_points' && (
              <div>
                <p style={{ color: C.t2, fontSize: 12, marginBottom: 14 }}>
                  Acción ganadora del rival:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Ataque rival', key: 'ataque_rival' },
                    { label: 'Ace rival', key: 'ace_rival' },
                    { label: 'Bloqueo rival', key: 'bloqueo_rival' },
                    { label: 'Falta técnica / Otro', key: 'otro' },
                  ].map(ptItem => (
                    <button
                      key={ptItem.key}
                      onClick={() => {
                        setTempRivalAction({
                          winner: 'rival',
                          pointType: 'perdido',
                          gesture: 'punto_rival',
                          quality: '#',
                          detailType: ptItem.key
                        });
                        setRivalNumberInput('');
                        setPointSubStep('rival_number');
                      }}
                      style={{
                        minHeight: 44, padding: "10px 14px", borderRadius: 10,
                        border: `1px solid ${C.bdMed}`, background: "rgba(255,255,255,0.04)",
                        color: C.w, fontSize: 14, fontWeight: 500, textAlign: 'left', cursor: 'pointer'
                      }}
                    >
                      {ptItem.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP: RIVAL NUMBER (OPTIONAL KEYPAD) */}
            {pointSubStep === 'rival_number' && (
              <div>
                <p style={{ color: C.t2, fontSize: 12, marginBottom: 8 }}>
                  Número de camiseta rival (opcional):
                </p>
                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${C.bd}`,
                  borderRadius: 8,
                  padding: "10px 14px",
                  textAlign: 'center',
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 24,
                  fontWeight: 700,
                  color: rivalNumberInput ? C.w : C.t3,
                  marginBottom: 12
                }}>
                  {rivalNumberInput ? `#${rivalNumberInput}` : 'Sin número'}
                </div>
                
                {/* Keypad */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 }}>
                  {['1','2','3','4','5','6','7','8','9','C','0','⌫'].map(btn => (
                    <button
                      key={btn}
                      onClick={() => {
                        if (btn === 'C') setRivalNumberInput('');
                        else if (btn === '⌫') setRivalNumberInput(prev => prev.slice(0, -1));
                        else if (rivalNumberInput.length < 2) setRivalNumberInput(prev => prev + btn);
                      }}
                      style={{
                        minHeight: 44,
                        borderRadius: 8,
                        border: `1px solid ${C.bd}`,
                        background: 'rgba(255,255,255,0.03)',
                        color: C.w,
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {btn}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    onClick={() => finishRallyWithRivalAction(null)}
                    style={{
                      minHeight: 44, padding: "10px 8px", borderRadius: 10,
                      border: `1px solid ${C.bdMed}`, background: 'rgba(255,255,255,0.05)',
                      color: C.t1, fontSize: 13, fontWeight: 500, cursor: 'pointer'
                    }}
                  >
                    Omitir
                  </button>
                  <button
                    onClick={() => finishRallyWithRivalAction(rivalNumberInput ? parseInt(rivalNumberInput, 10) : null)}
                    style={{
                      minHeight: 44, padding: "10px 8px", borderRadius: 10,
                      border: `1px solid ${pointMenu === 'our' ? C.gn : C.rd}`,
                      background: pointMenu === 'our' ? C.gnBg : C.rdBg,
                      color: pointMenu === 'our' ? C.gnLt : C.rdLt,
                      fontSize: 13, fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    {rivalNumberInput ? `Guardar #${rivalNumberInput}` : 'Confirmar'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP: SELECT PLAYER (OURS) */}
            {pointSubStep === 'select_player' && (
              <div>
                <p style={{ color: C.t2, fontSize: 12, marginBottom: 12 }}>
                  ¿Quién realizó la acción?
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {luNums(lineup).map(pId => {
                    const pl = players.find(p => p.id === pId);
                    return (
                      <button
                        key={pId}
                        onClick={() => {
                          setTempPlayerId(pId);
                          setPointSubStep('select_gesture');
                        }}
                        style={{
                          minHeight: 48, padding: "10px 12px", borderRadius: 10,
                          border: `1px solid ${C.bdMed}`, background: 'rgba(255,255,255,0.04)',
                          color: C.w, fontSize: 13, fontWeight: 600, textAlign: 'left', cursor: 'pointer'
                        }}
                      >
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.vtLt }}>#{pl?.number ?? '•'}</div>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pl ? shortName(pl.name) : '—'}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP: SELECT GESTURE */}
            {pointSubStep === 'select_gesture' && tempPlayerId && (
              <div>
                <p style={{ color: C.t2, fontSize: 12, marginBottom: 12 }}>
                  Gesto de {getPlayerName(tempPlayerId)}:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(tempPointQuality === '#'
                    ? [
                        { id: 'ataque', label: 'Ataque Ganador' },
                        { id: 'saque', label: 'Ace de Saque' },
                        { id: 'bloqueo', label: 'Punto de Bloqueo' },
                        { id: 'dejada', label: 'Dejada Ganadora' },
                      ]
                    : [
                        { id: 'saque', label: 'Error de Saque' },
                        { id: 'recepcion', label: 'Error de Recepción' },
                        { id: 'armado', label: 'Error de Armado' },
                        { id: 'ataque', label: 'Error de Ataque' },
                        { id: 'dejada', label: 'Error de Dejada' },
                        { id: 'bloqueo', label: 'Error / Invasión en Bloqueo' },
                        { id: 'defensa', label: 'Error de Defensa' },
                      ]
                  ).map(g => (
                    <button
                      key={g.id}
                      onClick={() => {
                        const targetP = tempPlayerId;
                        setPointMenu(null);
                        setPointSubStep('main');
                        regResult(tempPointQuality, targetP, g.id as Gesture);
                      }}
                      style={{
                        minHeight: 44, padding: "10px 14px", borderRadius: 10,
                        border: `1px solid ${C.bdMed}`, background: 'rgba(255,255,255,0.04)',
                        color: C.w, fontSize: 14, fontWeight: 500, textAlign: 'left', cursor: 'pointer'
                      }}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", justifyContent: "center" }}>
        <div style={{ width:"100%", maxWidth:375, padding:"16px 14px 28px", position:"relative" }}>

          {/* ── HEADER ── */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize:10, color:C.t2, letterSpacing:"0.08em", textTransform:"uppercase" }}>
                  Vs {opponent} · Set {setNum}
                </span>
                <span style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.vtLt,
                  background: C.vtBg,
                  border: `1px solid ${C.vtBd}`,
                  borderRadius: 5,
                  padding: "1px 6px",
                  lineHeight: "16px",
                  textTransform: "uppercase"
                }}>
                  {`P${computeRotation(lineup, players, rotationCount)}`}
                </span>
                <span style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 10,
                  fontWeight: 600,
                  color: C.t2,
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${C.bd}`,
                  borderRadius: 5,
                  padding: "1px 5px",
                  lineHeight: "16px",
                  textTransform: "uppercase"
                }}>
                  {getCurrentServingTeam(currentRallyActions) === 'rival' ? 'K1' : 'K2'}
                </span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                {/* Score */}
                <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                  <span style={{
                    fontFamily: "'DM Mono',monospace", fontSize: 36, fontWeight: 500,
                    color: flash === "our" ? C.gnLt : C.w, transition: "color 0.15s",
                  }}>{ourScore}</span>
                  <span style={{ fontSize:18, color:C.t3 }}>–</span>
                  <span style={{
                    fontFamily: "'DM Mono',monospace", fontSize: 36, fontWeight: 500,
                    color: flash === "rival" ? C.rdLt : C.w, transition: "color 0.15s",
                  }}>{rivalScore}</span>
                </div>
              </div>
            </div>

            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setShowAnalytics(true)} style={{
                  width: 38, height: 38, borderRadius: "50%",
                  background: "rgba(127,119,221,0.15)", border: `1px solid ${C.vtBd}`, color: C.vtLt,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                <Ico k="chart" sz={16}/>
              </button>
              <button onClick={undo} disabled={!hist.length} style={{
                  width: 38, height: 38, borderRadius: "50%",
                  background: "rgba(255,255,255,0.06)", border: `1px solid ${C.bd}`,
                  color: hist.length ? C.w : C.t3, opacity: hist.length ? 1 : 0.35,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                <Ico k="undo" sz={16}/>
              </button>
            </div>
          </div>
          
          {/* ── TIMEOUTS ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <button onClick={() => callTimeout('our')} disabled={ourTimeouts >= 2} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: ourTimeouts >= 2 ? C.t3 : C.vtLt, background: 'transparent', border: 'none', padding: '4px 0' }}>
              <Ico k="clock" sz={12}/> Tiempo Nosotros ({2 - ourTimeouts})
            </button>
            <button onClick={() => callTimeout('rival')} disabled={rivalTimeouts >= 2} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: rivalTimeouts >= 2 ? C.t3 : C.rdLt, background: 'transparent', border: 'none', padding: '4px 0' }}>
              <Ico k="clock" sz={12}/> Tiempo Rival ({2 - rivalTimeouts})
            </button>
          </div>

          {/* ── QUICK SCORE BAR (PUNTO NUESTRO / PUNTO RIVAL) ── */}
          <div style={{ display:"flex", gap:8, marginBottom:14 }}>
            <button onClick={() => openPointMenu("our")} style={{
                flex: 1, minHeight: 44, padding: "10px 8px", borderRadius: 10,
                border: `1px solid ${C.gn}`, background: C.gnBg, color: C.gnLt,
                fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                cursor: "pointer"
              }}>
              <Ico k="plus" sz={14}/> Punto Nuestro
            </button>
            <button onClick={() => openPointMenu("rival")} style={{
                flex: 1, minHeight: 44, padding: "10px 8px", borderRadius: 10,
                border: `1px solid ${C.rd}`, background: C.rdBg, color: C.rdLt,
                fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                cursor: "pointer"
              }}>
              <Ico k="plus" sz={14}/> Punto Rival
            </button>
          </div>

          {/* ── COURT ── */}
          <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.bd}`, padding: "12px 10px", marginBottom: 12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ fontSize:10, color:C.t2, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                {selP ? `${getPlayerName(selP)} seleccionado` : "Toca un jugador"}
              </span>
              <button onClick={rotate} style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 8,
                  border: `0.5px solid ${C.vtBd}`, background: C.vtBg, color: C.vtLt, fontSize: 11,
                }}>
                <Ico k="refresh" sz={12}/> Rotar
              </button>
            </div>

            <CourtGrid zones={FRONT} lineup={lineup} selP={selP} statuses={{}} getPlayerName={getPlayerName}
              onTap={setSelP} onLong={setSubZone}/>
            <Net/>
            <CourtGrid zones={BACK}  lineup={lineup} selP={selP} statuses={{}} getPlayerName={getPlayerName}
              onTap={setSelP} onLong={setSubZone}/>
          </div>

          {/* ── CURRENT RALLY ACTIONS COUNT ── */}
          <div style={{ textAlign:"center", fontSize:11, color:C.vtLt, marginBottom: 8, minHeight: 14 }}>
            {currentRallyActions.length > 0 && `Rally Activo: ${currentRallyActions.length} acciones sin cerrar`}
          </div>

          {/* ── GESTURE SELECTOR ── */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize:10, color:C.t2, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>
              Gesto (Selecciona uno)
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:6 }}>
              {GESTURES.map(g => {
                const sel = g.id === activeG;
                return (
                  <button key={g.id} onClick={() => setActiveG(g.id)}
                    style={{
                      padding: "10px 2px", borderRadius: 10,
                      border: `1px solid ${sel ? C.vt : C.bd}`,
                      background: sel ? C.vtBg : "rgba(255,255,255,0.02)",
                      color: sel ? C.vtLt : C.t2,
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    }}>
                    <Ico k={g.icon} sz={16}/>
                    <span style={{ fontSize: 9 }}>{g.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── RESULT PANEL (5-LEVEL SCALE) ── */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize:10, color:C.t2, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>
              {selP ? `Calidad del ${gLabel}` : "Selecciona un jugador arriba"}
            </div>

            {QUALITIES.map(q => {
              const gestureLabel = selP ? QUALITY_LABELS[activeG as Gesture]?.[q.key] || q.subDefault : q.subDefault;
              return (
                <button
                  key={q.key}
                  onClick={() => regResult(q.key)}
                  disabled={!selP}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    minHeight: 46,
                    borderRadius: 10,
                    marginBottom: 6,
                    border: `1px solid ${selP ? q.bd : C.bd}`,
                    background: selP ? q.bg : "rgba(255,255,255,0.02)",
                    color: selP ? q.tx : C.t3,
                    opacity: selP ? 1 : 0.38,
                    cursor: selP ? "pointer" : "not-allowed"
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 20, width: 22, textAlign: "center", lineHeight: 1, fontWeight: 700 }}>
                      {q.sym}
                    </span>
                    <span style={{ textAlign: "left" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, display: "block" }}>
                        {gestureLabel}
                      </span>
                      <span style={{ fontSize: 10, opacity: 0.65 }}>
                        {q.subDefault}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ textAlign: "center", fontSize: 11, color: C.t3, minHeight: 16, letterSpacing: "0.02em", marginBottom: 20 }}>
            {msg}
          </div>

          {/* ── FOOTER ACTIONS ── */}
          <div style={{ display:"flex", justifyContent:"space-between", padding:"0 10px" }}>
            <button onClick={endSet} style={{
                display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.t3,
                textDecoration: "underline", textDecorationStyle: "dotted", padding: "4px 8px",
              }}>
              <Ico k="flag" sz={12}/> Fin de set
            </button>
            
            <button onClick={endMatch} style={{
                display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.rdLt,
                background: "rgba(216,90,48,0.1)", border:`1px solid ${C.rd}`, borderRadius: 8, padding: "6px 12px",
              }}>
              Finalizar Partido
            </button>
          </div>

          {/* ── SUBSTITUTION SHEET ── */}
          {subZone && (
            <SubSheet
              zone={subZone} outName={getPlayerName(lineup[subZone])}
              bench={benchPlayers} isBack={ZROW[subZone as keyof typeof ZROW] === "back"}
              libero={liberoPlayer}
              subsLeft={subRule - subsUsed}
              subLimit={subRule}
              onSub={(id: string, isLib: boolean) => doSub(subZone, id, isLib)}
              onCancel={() => setSubZone(null)}
            />
          )}

        </div>
      </div>
    </>
  );
}
