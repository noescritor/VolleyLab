import { useState, useRef, useEffect, useMemo } from "react";
import { useApp } from "../../utils/AppContext";

/* ═══════════════════════════════════════════
   BRAND TOKENS — VolleyLab
═══════════════════════════════════════════ */
const C = {
  bg:    "#0A0A0E",
  card:  "rgba(255,255,255,0.06)",
  bd:    "rgba(255,255,255,0.15)",
  bdMed: "rgba(255,255,255,0.25)",

  vt: "#7F77DD", vtLt: "#CECBF6",
  vtBg: "rgba(127,119,221,0.15)",
  vtBd: "rgba(127,119,221,0.45)",

  gn: "#1D9E75", gnLt: "#9FE1CB",
  gnBg: "rgba(29,158,117,0.13)",

  rd: "#D85A30", rdLt: "#F0997B",
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
  { id:"bloqueo",   label:"Bloqueo",   icon:"shield"  },
  { id:"defensa",   label:"Defensa",   icon:"feather" },
];

const RESULTS = [
  { key:"pos", sym:"+", label:"Positivo", bd:C.gn,  bg:C.gnBg, tx:C.gnLt, sub:"Gana el punto" },
  { key:"neu", sym:"•", label:"Neutral",  bd:C.gyDk,bg:C.gyBg, tx:C.gyLt, sub:"El rally sigue" },
  { key:"neg", sym:"−", label:"Negativo", bd:C.rd,  bg:C.rdBg, tx:C.rdLt, sub:"Pierde el punto" },
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
function SubSheet({ zone, outName, bench, isBack, onSub, onCancel, libero }: any) {
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

        <div style={{ fontSize:10, color:C.t2, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>
          Cambio · {ZLBL[zone as keyof typeof ZLBL]}
        </div>
        <div style={{ fontSize:17, fontWeight:500, color:C.w, marginBottom:20 }}>
          Sale {outName}
        </div>

        {/* Libero option — only back row */}
        {isBack && libero && (
          <>
            <button onClick={() => onSub(libero.id)} style={{
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
              <button key={p.id} onClick={() => onSub(p.id)} style={{
                padding: "10px 18px", borderRadius: 999,
                border: `1px solid ${C.bdMed}`, background: "rgba(255,255,255,0.04)",
                color: C.w, fontSize: 13, fontWeight:500
              }}>{shortName(p.name)}</button>
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
   COURT TARGET MAP (Modal para cierre de rally)
═══════════════════════════════════════════ */
function CourtTargetMap({ title, subtitle, color, onSelectTarget, onCancel }: any) {
  // A simple 3x3 grid for the opponent court
  const zones = [
    { id: "4", label: "Z4" }, { id: "3", label: "Z3" }, { id: "2", label: "Z2" },
    { id: "5", label: "Z5" }, { id: "6", label: "Z6" }, { id: "1", label: "Z1" },
  ];

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 200,
    }}>
      <div style={{ textAlign:"center", marginBottom:30 }}>
        <div style={{ color: color, fontWeight: 600, fontSize: 22, marginBottom: 4 }}>{title}</div>
        <div style={{ color: C.t2, fontSize: 14 }}>{subtitle}</div>
      </div>

      <div style={{ 
        width: 280, height: 280, 
        border: `2px solid ${C.bdMed}`, 
        background: "rgba(255,255,255,0.02)",
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(2, 1fr)",
        gap: 2, padding: 2, position: "relative"
      }}>
        {zones.map(z => (
          <button key={z.id} onClick={() => onSelectTarget(z.id)} style={{
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${C.bd}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: C.t3, fontSize: 18, fontWeight: 600,
            transition: "background 0.2s"
          }}
          >
            {z.label}
          </button>
        ))}
        {/* Fake net at the bottom indicating our side is below */}
        <div style={{ position:"absolute", bottom:-2, left:0, right:0, height:4, background:C.w, opacity:0.8 }} />
      </div>
      <div style={{ color: C.w, fontSize: 12, marginTop: 16, letterSpacing: "0.1em" }}>RED / NUESTRA CANCHA AQUÍ ABAJO</div>

      <button onClick={onCancel} style={{
        marginTop: 40, padding: "12px 24px", borderRadius: 999,
        border: `1px solid ${C.bd}`, color: C.t1, fontSize: 14,
      }}>
        Cancelar (El punto no ha terminado)
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LIVE ANALYTICS VIEW
═══════════════════════════════════════════ */
function LiveAnalytics({ rallies, players, onClose }: any) {
  const [filterType, setFilterType] = useState<"all"|"our"|"rival">("all");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string|null>(null);

  // Aggregate stats from rallies
  const stats: any = {};
  players.forEach((p: any) => {
    stats[p.id] = { id: p.id, name: shortName(p.name), attacks: 0, kills: 0, errors: 0, blocks: 0 };
  });

  let totalKills = 0;
  let totalErrors = 0;
  let totalAttacks = 0;

  rallies.forEach((r: any) => {
    r.actions.forEach((a: any) => {
      if (!stats[a.playerId]) return;
      if (a.gesture === "ataque") {
        stats[a.playerId].attacks++;
        totalAttacks++;
        if (a.quality === "pos") { stats[a.playerId].kills++; totalKills++; }
        if (a.quality === "neg") { stats[a.playerId].errors++; totalErrors++; }
      }
      if (a.gesture === "bloqueo" && a.quality === "pos") {
        stats[a.playerId].blocks++;
      }
    });
  });

  const statList = Object.values(stats).filter((s: any) => s.attacks > 0 || s.blocks > 0 || s.kills > 0 || s.errors > 0);

  // Compute points for heatmap based on filters
  const heatPoints = rallies.filter((r: any) => {
    if (filterType === "our" && r.winner !== "our") return false;
    if (filterType === "rival" && r.winner !== "rival") return false;
    if (selectedPlayerId) {
      // Did this player participate in the actions of this rally?
      const participated = r.actions.some((a: any) => a.playerId === selectedPlayerId);
      if (!participated) return false;
    }
    return true;
  });

  const teamEff = totalAttacks > 0 ? Math.round(((totalKills - totalErrors) / totalAttacks) * 100) : 0;

  const renderHeatZone = (zoneId: string) => {
    const count = heatPoints.filter((r:any) => r.endLocation === zoneId).length;
    const max = Math.max(1, heatPoints.length);
    const intensity = Math.min(1, (count / max) * 1.5); 
    
    const baseColor = filterType === "our" ? "29, 158, 117" : filterType === "rival" ? "216, 90, 48" : "127, 119, 221";

    return (
      <div key={zoneId} style={{
        background: count > 0 ? `rgba(${baseColor}, ${intensity})` : "rgba(255,255,255,0.02)",
        border: `1px solid ${C.bd}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column",
        transition: "background 0.3s ease"
      }}>
        {count > 0 && <span style={{ color:C.w, fontSize:18, fontWeight:600 }}>{count}</span>}
        <span style={{ color:C.t3, fontSize:10 }}>Z{zoneId}</span>
      </div>
    );
  };

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

          <div style={{ position:"relative", width: "100%", maxWidth: 280, margin: "0 auto", aspectRatio: "1" }}>
            <div style={{ 
              width: "100%", height: "100%",
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(2, 1fr)",
              gap: 2, padding: 2, background: "rgba(255,255,255,0.02)", border: `2px solid ${C.bdMed}`
            }}>
              {["4","3","2","5","6","1"].map(renderHeatZone)}
            </div>
            <div style={{ position:"absolute", bottom:-2, left:0, right:0, height:4, background:C.w, opacity:0.8 }} />
            <div style={{ color: C.t3, fontSize: 10, textAlign:"center", marginTop: 12, letterSpacing: "0.1em" }}>RED / NUESTRA CANCHA AQUÍ ABAJO</div>
          </div>
        </div>

        {/* TEAM SUMMARY */}
        <div style={{ background:C.card, border:`1px solid ${C.bd}`, borderRadius:12, padding:16 }}>
          <h3 style={{ color:C.t1, fontSize:14, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:12 }}>Métricas de Equipo</h3>
          <div style={{ display:"flex", gap:12, marginBottom: 20 }}>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 8 }}>
              <div style={{ color:C.t3, fontSize:11, textTransform:"uppercase" }}>Total Rallies</div>
              <div style={{ color:C.w, fontSize:24, fontWeight:600 }}>{rallies.length}</div>
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 8 }}>
              <div style={{ color:C.t3, fontSize:11, textTransform:"uppercase" }}>Eficiencia</div>
              <div style={{ color: teamEff > 30 ? C.gnLt : teamEff < 0 ? C.rdLt : C.w, fontSize:24, fontWeight:600 }}>{teamEff}%</div>
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
              <table style={{ width:"100%", textAlign:"left", borderCollapse:"collapse", color:C.t1, fontSize:13, minWidth: 400 }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${C.bdMed}`, color:C.t3 }}>
                    <th style={{ paddingBottom:12, fontWeight:500 }}>Jugador</th>
                    <th style={{ paddingBottom:12, fontWeight:500 }}>Atq</th>
                    <th style={{ paddingBottom:12, fontWeight:500, color:C.gnLt }}>Kill</th>
                    <th style={{ paddingBottom:12, fontWeight:500, color:C.rdLt }}>Err</th>
                    <th style={{ paddingBottom:12, fontWeight:500 }}>Blk</th>
                    <th style={{ paddingBottom:12, fontWeight:500 }}>EFF</th>
                  </tr>
                </thead>
                <tbody>
                  {statList.map((s: any, i) => {
                    const eff = s.attacks > 0 ? Math.round(((s.kills - s.errors) / s.attacks) * 100) : 0;
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
                        <td style={{ padding:"12px 8px" }}>{s.blocks}</td>
                        <td style={{ padding:"12px 8px", fontWeight:600, color: eff > 30 ? C.gnLt : eff < 0 ? C.rdLt : C.w }}>{eff}%</td>
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

  /* — Fonts & global styles — */
  useEffect(() => {
    const lk = document.createElement("link");
    lk.rel = "stylesheet";
    lk.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap";
    document.head.appendChild(lk);
    return () => { document.head.removeChild(lk); };
  }, []);

  /* — Match/Database State — */
  const [opponent, setOpponent] = useState("");
  const [matchType, setMatchType] = useState("Amistoso");

  /* — Navigation — */
  const [screen, setScreen] = useState("setup"); // "setup" | "lineup" | "live"
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [setNum, setSetNum] = useState(1);

  /* — Lineup state — */
  const [lineup, setLineup] = useState<any>({ p1:null, p2:null, p3:null, p4:null, p5:null, p6:null });
  const [prevLu, setPrevLu] = useState<any>(null);
  const [editZone, setEditZone] = useState<string|null>(null);

  /* — Global Rally History (Para Analytics) — */
  const [allRallies, setAllRallies] = useState<any[]>([]);

  /* — Current Rally state (Punto Activo) — */
  const [currentRallyActions, setCurrentRallyActions] = useState<any[]>([]);
  const [pendingEndResult, setPendingEndResult] = useState<{winner: 'our'|'rival', action?: any} | null>(null);

  /* — Live Match state — */
  const [ourScore,   setOurScore]   = useState(0);
  const [rivalScore, setRivalScore] = useState(0);
  const [selP,       setSelP]       = useState<string|null>(null);
  const [activeG,    setActiveG]    = useState("ataque");
  const [subZone,    setSubZone]    = useState<string|null>(null);
  const [flash,      setFlash]      = useState<string|null>(null);
  const [msg,        setMsg]        = useState("");
  const [hist,       setHist]       = useState<any[]>([]); // undo history

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
    currentRallyActions: dc(currentRallyActions)
  });
  const pushH = () => setHist(h => [...h.slice(-19), snap()]);

  const undo = () => {
    if (!hist.length) return;
    const p = hist[hist.length - 1];
    setOurScore(p.ourScore);
    setRivalScore(p.rivalScore);
    setLineup(p.lineup);
    setCurrentRallyActions(p.currentRallyActions);
    setHist(h => h.slice(0, -1));
    setMsg("deshecho");
  };

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
    setCurrentRallyActions([]);
    setScreen("live");
  };

  /* ── 3. RALLY LOGIC (Neutral, Pos, Neg) ── */
  const regResult = (key: string) => {
    if (!selP) return;
    pushH();

    const action = {
      playerId: selP,
      gesture: activeG,
      quality: key, // 'pos', 'neu', 'neg'
      timestamp: Date.now()
    };

    if (key === "neu") {
      // Neutral: Agrega a la lista pero NO cierra el punto
      setCurrentRallyActions(prev => [...prev, action]);
      setMsg(`Neutral: ${gLabel} de ${getPlayerName(selP)}`);
    } else if (key === "pos") {
      // Positivo: Gana el punto, preguntamos DÓNDE
      setPendingEndResult({ winner: 'our', action });
    } else if (key === "neg") {
      // Negativo: Pierde el punto, preguntamos DÓNDE
      setPendingEndResult({ winner: 'rival', action });
    }
  };

  const quickScore = (side: 'our'|'rival') => {
    setPendingEndResult({ winner: side });
  };

  const confirmEndOfRally = (impact: any, plane: 'court'|'net') => {
    if (!pendingEndResult) return;
    
    pushH();
    
    // Determine the targetZone based on the heatmap used
    let targetZone = '';
    if (plane === 'court') {
      targetZone = getZoneFromXY(impact.x, impact.y);
    } else {
      targetZone = getNetZoneFromXY(impact.x);
    }

    // Add the final action to the rally if it came from a gesture
    const finalActions = [...currentRallyActions];
    if (pendingEndResult.action) {
      finalActions.push(pendingEndResult.action);
    }

    // Save rally globally
    const newRally = {
      id: Date.now().toString(),
      winner: pendingEndResult.winner,
      endLocation: targetZone,
      impact: { ...impact, plane },
      actions: finalActions
    };
    setAllRallies(prev => [...prev, newRally]);

    // Update Score
    if (pendingEndResult.winner === "our") {
      setOurScore(s => s + 1);
      doFlash("our");
      setMsg("¡Punto ganado!");
    } else {
      setRivalScore(s => s + 1);
      doFlash("rival");
      setMsg("Punto perdido.");
    }

    // Reset current rally
    setCurrentRallyActions([]);
    setPendingEndResult(null);
  };

  /* ── ROTATE & SUBS ── */
  const rotate = () => {
    pushH();
    setLineup((l:any) => ({ p1:l.p2, p2:l.p3, p3:l.p4, p4:l.p5, p5:l.p6, p6:l.p1 }));
    setMsg("Rotación aplicada");
  };

  const doSub = (zone: string, newN: string) => {
    pushH();
    const outN = getPlayerName(lineup[zone]);
    setLineup((l:any) => ({ ...l, [zone]: newN }));
    setSubZone(null);
    setMsg(`Cambio: Entra ${getPlayerName(newN)} x Sale ${outN}`);
  };

  /* ── END SET & MATCH ── */
  const endSet = () => {
    setPrevLu(dc(lineup));
    setLineup({ p1:null, p2:null, p3:null, p4:null, p5:null, p6:null });
    setSetNum(n => n + 1);
    setEditZone(null);
    setScreen("lineup");
  };

  const endMatch = async () => {
    setMsg("Guardando partido...");
    
    // Compute aggregated player stats from allRallies if we wanted, but we can also just save rallies
    const scoreStr = `${ourScore}-${rivalScore}`;
    const resultStr = ourScore > rivalScore ? 'W' : 'L';

    try {
      await createMatch({
        opponent, 
        date: new Date().toISOString().split('T')[0],
        matchType, 
        players: [], 
        score: scoreStr,
        result: resultStr,
        rallies: allRallies
      } as any);

      setTimeout(() => {
        setScreen("setup");
        setAllRallies([]);
        setOurScore(0);
        setRivalScore(0);
        setSetNum(1);
        setMsg("");
      }, 1500);
    } catch (err) {
      setMsg("Error guardando");
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

          <div style={{ marginBottom: 32 }}>
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
      {showAnalytics && <LiveAnalytics rallies={allRallies} players={players} onClose={() => setShowAnalytics(false)} />}
      
      {pendingEndResult && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', padding: 20 }}>
          <div style={{ position: 'relative', width: 300 }}>
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ color: pendingEndResult.winner === 'our' ? C.gnLt : C.rdLt, fontWeight: 600, fontSize: 14 }}>
                {pendingEndResult.winner === 'our' ? '¡PUNTO NUESTRO!' : 'PUNTO RIVAL'}
              </div>
              <button 
                onClick={() => setPendingEndResult(null)} 
                style={{ color: C.t2, fontSize: 12, background: 'transparent', border: 'none', padding: 0 }}
              >
                ✕ Cancelar
              </button>
            </div>
            
            <div style={{ color: C.w, fontSize: 12, marginBottom: 12, opacity: 0.8 }}>
              Toca {pendingEndResult.action?.gesture === 'bloqueo' ? 'la red' : 'la cancha'} donde finalizó la acción
            </div>

            {pendingEndResult.action?.gesture === 'bloqueo' ? (
              <NetHeatmap 
                mode="capture"
                onCapture={(impact) => confirmEndOfRally(impact, 'net')}
              />
            ) : (
              <CourtHeatmap 
                mode="capture"
                onCapture={(impact) => confirmEndOfRally(impact, 'court')}
              />
            )}
          </div>
        </div>
      )}

      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", justifyContent: "center" }}>
        <div style={{ width:"100%", maxWidth:375, padding:"16px 14px 28px", position:"relative" }}>

          {/* ── HEADER ── */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
            <div>
              <div style={{ fontSize:10, color:C.t2, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>
                Vs {opponent} · Set {setNum}
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

          {/* ── QUICK SCORE BAR (Ahora cierra directo) ── */}
          <div style={{ display:"flex", gap:8, marginBottom:14 }}>
            <button onClick={() => quickScore("our")} style={{
                flex: 1, padding: "10px 6px", borderRadius: 10,
                border: `1px solid ${C.gn}`, background: C.gnBg, color: C.gnLt,
                fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              }}>
              <Ico k="plus" sz={13}/> Punto Directo
            </button>
            <button onClick={() => quickScore("rival")} style={{
                flex: 1, padding: "10px 6px", borderRadius: 10,
                border: `1px solid ${C.rd}`, background: C.rdBg, color: C.rdLt,
                fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              }}>
              <Ico k="plus" sz={13}/> Punto Rival
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
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:6 }}>
              {GESTURES.map(g => {
                const sel = g.id === activeG;
                return (
                  <button key={g.id} onClick={() => setActiveG(g.id)}
                    style={{
                      padding: "10px 4px", borderRadius: 10,
                      border: `1px solid ${sel ? C.vt : C.bd}`,
                      background: sel ? C.vtBg : "rgba(255,255,255,0.02)",
                      color: sel ? C.vtLt : C.t2,
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    }}>
                    <Ico k={g.icon} sz={18}/>
                    <span style={{ fontSize: 10 }}>{g.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── RESULT PANEL ── */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize:10, color:C.t2, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>
              {selP ? `Calidad del ${gLabel}` : "Selecciona un jugador arriba"}
            </div>

            {RESULTS.map(r => (
              <button key={r.key} onClick={() => regResult(r.key)} disabled={!selP}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "13px 14px", borderRadius: 10, marginBottom: 6,
                  border: `1px solid ${selP ? r.bd : C.bd}`,
                  background: selP ? r.bg : "rgba(255,255,255,0.02)",
                  color: selP ? r.tx : C.t3,
                  opacity: selP ? 1 : 0.38,
                }}>
                <span style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, width: 20, textAlign: "center", lineHeight: 1 }}>{r.sym}</span>
                  <span style={{ textAlign: "left" }}>
                    <span style={{ fontSize:14, fontWeight:600, display:"block" }}>{r.label}</span>
                    <span style={{ fontSize:10, opacity:0.65 }}>{r.sub}</span>
                  </span>
                </span>
              </button>
            ))}
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
              onSub={(id: string) => doSub(subZone, id)}
              onCancel={() => setSubZone(null)}
            />
          )}

        </div>
      </div>
    </>
  );
}