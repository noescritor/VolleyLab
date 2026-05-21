import React from "react";
import { AlertTriangle, TrendingUp, TrendingDown, Users, Activity, Target } from "lucide-react";
import { useApp } from "../utils/AppContext";

// Position color map aligned with VolleyLab design system
const POS_STYLE: Record<string, { color: string; bg: string }> = {
  Punta:     { color: "#A191FF", bg: "rgba(161,145,255,0.08)" },
  Opuesto:   { color: "#91CAFF", bg: "rgba(145,202,255,0.08)" },
  Central:   { color: "#91FFB0", bg: "rgba(145,255,176,0.08)" },
  Colocador: { color: "#FFD391", bg: "rgba(255,211,145,0.08)" },
  Líbero:    { color: "#FF919F", bg: "rgba(255,145,159,0.08)" },
};

function statusStyle(s: string) {
  if (s === "excellent") return { color: "#91FFB0", bg: "rgba(145,255,176,0.08)", label: "EXCELENTE" };
  if (s === "warning")   return { color: "#FFD391", bg: "rgba(255,211,145,0.08)", label: "ATENCIÓN"  };
  if (s === "bad")       return { color: "#FF919F", bg: "rgba(255,145,159,0.08)", label: "BAJO"      };
  return                        { color: "#91CAFF", bg: "rgba(145,202,255,0.08)", label: "BIEN"      };
}

export function Dashboard() {
  const { state } = useApp();
  const safePlayers      = state.players      || [];
  const safeMatches      = state.matches      || [];

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalPlayers        = safePlayers.length;
  const activeInjuries      = 0;
  const averageLoad         = 7.2;
  const sideOutPercentage   = 65.8;
  const availablePercentage = totalPlayers > 0
    ? Math.round(((totalPlayers - activeInjuries) / totalPlayers) * 100)
    : 100;

  // ── Position stats ────────────────────────────────────────────────────────
  const positionGroups = safePlayers.reduce<Record<string, typeof safePlayers>>((acc, p) => {
    if (!acc[p.position]) acc[p.position] = [];
    acc[p.position].push(p);
    return acc;
  }, {});

  const POSITION_META: Record<string, { metric: number; label: string; status: string }> = {
    Colocador: { metric: 67.3, label: "Side-Out",  status: "good"      },
    Líbero:    { metric: 2.4,  label: "Recepción", status: "excellent" },
    Central:   { metric: 52.1, label: "Ataque %",  status: "good"      },
    Opuesto:   { metric: 45.2, label: "Ataque %",  status: "good"      },
    Punta:     { metric: 38.7, label: "Ataque %",  status: "warning"   },
  };

  const positionStats = Object.entries(positionGroups).map(([position, list]) => ({
    position,
    count: list.length,
    ...(POSITION_META[position] ?? { metric: 40.0, label: "Rendimiento", status: "good" }),
  }));

  // ── Recent matches ────────────────────────────────────────────────────────
  const recentMatches = [...safeMatches]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3)
    .map((m) => ({
      opponent: m.opponent,
      result:   m.result || "W",
      score:    m.score  || "3-1",
      date:     new Date(m.date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }),
    }));

  // ── Alerts ────────────────────────────────────────────────────────────────
  const alerts: { message: string; severity: "high" | "medium" | "low" }[] = [
    ...(safePlayers.length > 0
      ? [{ message: `Monitorear carga de ${safePlayers[0]?.name || "jugadora"}`, severity: "medium" as const }]
      : []),
    { message: "Eficacia de ataque baja en rotación 4",     severity: "medium" },
    { message: "Revisar carga de entrenamiento del equipo", severity: "medium" },
  ];

  const alertColor = (s: string) =>
    s === "high" ? "#FF919F" : s === "medium" ? "#FFD391" : "#91CAFF";
  const alertBg = (s: string) =>
    s === "high" ? "rgba(255,145,159,0.06)" : s === "medium" ? "rgba(255,211,145,0.06)" : "rgba(145,202,255,0.06)";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="px-6 py-5 space-y-5">

      {/* ── KPI stat cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Jugadores */}
        <div className="px-5 py-4 bg-white/[0.02] border border-white/[0.06] rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <p className="text-label text-white/25">JUGADORES</p>
            <Users size={13} className="text-white/20" />
          </div>
          <p className="text-[26px] font-bold text-white font-mono leading-none">{totalPlayers}</p>
          <p className="text-[11px] text-white/30 mt-1">
            {activeInjuries > 0
              ? <span style={{ color: "#FF919F" }}>{activeInjuries} con lesiones</span>
              : "Todos disponibles"}
          </p>
        </div>

        {/* Side-Out */}
        <div className="px-5 py-4 bg-white/[0.02] border border-white/[0.06] rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <p className="text-label text-white/25">SIDE-OUT</p>
            <TrendingUp size={13} className="text-white/20" />
          </div>
          <p className="text-[26px] font-bold font-mono leading-none" style={{ color: "#91FFB0" }}>
            {sideOutPercentage}%
          </p>
          <p className="text-[11px] text-white/30 mt-1">+2.3% vs mes anterior</p>
        </div>

        {/* Carga */}
        <div className="px-5 py-4 bg-white/[0.02] border border-white/[0.06] rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <p className="text-label text-white/25">CARGA PROM.</p>
            <Activity size={13} className="text-white/20" />
          </div>
          <p className="text-[26px] font-bold text-white font-mono leading-none">{averageLoad}</p>
          <p className="text-[11px] text-white/30 mt-1">Óptimo: 6.5 – 8.0</p>
        </div>

        {/* Disponibilidad */}
        <div className="px-5 py-4 bg-white/[0.02] border border-white/[0.06] rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <p className="text-label text-white/25">DISPONIBILIDAD</p>
            <Target size={13} className="text-white/20" />
          </div>
          <p className="text-[26px] font-bold font-mono leading-none"
            style={{ color: availablePercentage >= 90 ? "#91FFB0" : availablePercentage >= 70 ? "#FFD391" : "#FF919F" }}>
            {availablePercentage}%
          </p>
          <p className="text-[11px] text-white/30 mt-1">
            {totalPlayers - activeInjuries}/{totalPlayers} jugadoras
          </p>
        </div>
      </div>

      {/* ── Middle row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Position stats */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
            <p className="text-[13px] font-semibold text-white">Rendimiento por posición</p>
            <p className="text-label text-white/25">ÚLTIMOS 5 PARTIDOS</p>
          </div>

          {positionStats.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-white/20">
              Sin jugadoras registradas aún.
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="text-left px-5 py-2 text-label text-white/25 font-normal">POSICIÓN</th>
                  <th className="text-right px-5 py-2 text-label text-white/25 font-normal">KPI</th>
                  <th className="text-right px-5 py-2 text-label text-white/25 font-normal">ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {positionStats.map((pos) => {
                  const ps = POS_STYLE[pos.position] ?? { color: "#A191FF", bg: "rgba(161,145,255,0.08)" };
                  const ss = statusStyle(pos.status);
                  return (
                    <tr key={pos.position} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-label px-2 py-0.5 rounded-full"
                            style={{ color: ps.color, backgroundColor: ps.bg }}
                          >
                            {pos.position.toUpperCase()}
                          </span>
                          <span className="text-[11px] text-white/30">{pos.count}p</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <p className="text-[14px] font-mono font-medium text-white">
                          {pos.position === "Líbero" ? `${pos.metric}/3` : `${pos.metric}%`}
                        </p>
                        <p className="text-label text-white/25">{pos.label}</p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className="text-label px-2 py-0.5 rounded-full"
                          style={{ color: ss.color, backgroundColor: ss.bg }}
                        >
                          {ss.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Alerts */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
            <p className="text-[13px] font-semibold text-white">Alertas</p>
            <span
              className="text-label px-2 py-0.5 rounded-full"
              style={{ color: "#FFD391", backgroundColor: "rgba(255,211,145,0.08)" }}
            >
              {alerts.length} ACTIVAS
            </span>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-5 py-3.5"
                style={{ backgroundColor: alertBg(alert.severity) }}
              >
                <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: alertColor(alert.severity) }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-white/70">{alert.message}</p>
                  <span
                    className="text-label mt-1 inline-block px-2 py-0.5 rounded-full"
                    style={{ color: alertColor(alert.severity), backgroundColor: `${alertColor(alert.severity)}15` }}
                  >
                    {alert.severity === "high" ? "ALTA" : alert.severity === "medium" ? "MEDIA" : "BAJA"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent matches ──────────────────────────────────────────────── */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06]">
          <p className="text-[13px] font-semibold text-white">Últimos partidos</p>
        </div>

        {recentMatches.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-white/20 border border-dashed border-white/[0.08] rounded-lg m-4">
            Sin partidos registrados — agrega tu primer partido en la pestaña Partidos.
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="text-left px-5 py-2 text-label text-white/25 font-normal">RESULTADO</th>
                <th className="text-left px-5 py-2 text-label text-white/25 font-normal">RIVAL</th>
                <th className="text-right px-5 py-2 text-label text-white/25 font-normal hidden sm:table-cell">FECHA</th>
                <th className="text-right px-5 py-2 text-label text-white/25 font-normal">SCORE</th>
              </tr>
            </thead>
            <tbody>
              {recentMatches.map((m, i) => (
                <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3">
                    <span
                      className="text-label px-2 py-0.5 rounded-full"
                      style={
                        m.result === "W"
                          ? { color: "#91FFB0", backgroundColor: "rgba(145,255,176,0.08)" }
                          : { color: "#FF919F", backgroundColor: "rgba(255,145,159,0.08)" }
                      }
                    >
                      {m.result === "W" ? "VICTORIA" : "DERROTA"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[13px] text-white">vs {m.opponent}</td>
                  <td className="px-5 py-3 text-[13px] text-white/40 text-right hidden sm:table-cell font-mono">{m.date}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-[16px] font-bold font-mono text-white">{m.score}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
