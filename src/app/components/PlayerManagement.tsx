import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Plus, Search, Edit, Activity, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../utils/AppContext';
import { SampleDataInfo } from './SampleDataInfo';
import { PlayerProfileDashboard } from './player-profile/PlayerProfileDashboard';

const POSITIONS = ['Opuesto', 'Punta', 'Central', 'Colocador', 'Líbero'];
const HANDS = ['Derecha', 'Izquierda'];

const POS_STYLE: Record<string, { color: string; bg: string }> = {
  Punta:     { color: '#A191FF', bg: 'rgba(161,145,255,0.08)' },
  Opuesto:   { color: '#91CAFF', bg: 'rgba(145,202,255,0.08)' },
  Central:   { color: '#91FFB0', bg: 'rgba(145,255,176,0.08)' },
  Colocador: { color: '#FFD391', bg: 'rgba(255,211,145,0.08)' },
  Líbero:    { color: '#FF919F', bg: 'rgba(255,145,159,0.08)' },
};

const AVATAR_COLORS = ['#A191FF', '#91CAFF', '#FFD391', '#91FFB0', '#DC91FF', '#FF919F'];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

const INPUT_CLS = 'w-full bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2.5 text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#A191FF]/50 transition-colors';

export function PlayerManagement() {
  const { state, createPlayer, updatePlayer, deletePlayer, navigateToTab } = useApp();
  const [search, setSearch]         = useState('');
  const [posFilter, setPosFilter]   = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]       = useState<any>(null);
  const [viewingDashboard, setViewingDashboard] = useState<any>(null);

  const filtered = state.players.filter(p => {
    const matchName = p.name.toLowerCase().includes(search.toLowerCase());
    const matchPos  = posFilter === 'all' || p.position === posFilter;
    return matchName && matchPos;
  });

  const openNew  = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (p: any) => { setEditing(p); setDialogOpen(true); };

  const handleSave = async (data: any) => {
    const nums = { height: Number(data.height)||null, weight: Number(data.weight)||null, wingspan: Number(data.wingspan)||null, reachStatic: Number(data.reachStatic)||null, reachBlock: Number(data.reachBlock)||null, reachAttack: Number(data.reachAttack)||null };
    try {
      if (editing) await updatePlayer(editing.id, { ...data, ...nums });
      else          await createPlayer({ ...data, ...nums, status: 'Activo' });
      setDialogOpen(false); setEditing(null);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    try { await deletePlayer(id); } catch (e) { console.error(e); }
  };

  if (state.loading.players) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-white/30">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-[13px]">Cargando jugadores...</span>
      </div>
    );
  }

  return (
    <div>
      <SampleDataInfo />

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 border-b border-white/[0.06]">
        <div className="relative flex-1 w-full">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar jugadoras..."
            className={`${INPUT_CLS} pl-9`}
          />
        </div>

        <Select value={posFilter} onValueChange={setPosFilter}>
          <SelectTrigger className="w-48 bg-white/[0.04] border-white/[0.08] text-[13px] text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-white/[0.08]">
            <SelectItem value="all" className="text-[13px] text-white/70">Todas las posiciones</SelectItem>
            {POSITIONS.map(p => (
              <SelectItem key={p} value={p} className="text-[13px] text-white/70">{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-[#A191FF] hover:bg-[#B8ADFF] text-black text-label font-semibold rounded-lg transition-colors shrink-0"
        >
          <Plus size={14} /> Nueva jugadora
        </button>
      </div>

      {/* ── Player grid ─────────────────────────────────────────────── */}
      <div className="px-6 py-5">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-white/20 border border-dashed border-white/[0.08] rounded-lg">
            {state.players.length === 0
              ? 'Sin jugadoras registradas. Crea la primera.'
              : 'Sin resultados para los filtros aplicados.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(player => {
              const ps = POS_STYLE[player.position] ?? { color: '#A191FF', bg: 'rgba(161,145,255,0.08)' };
              const ac = avatarColor(player.name);
              const hasReaches = player.reachStatic || player.reachBlock || player.reachAttack;
              return (
                <div
                  key={player.id}
                  className="bg-white/[0.02] border border-white/[0.06] rounded-lg hover:border-[#A191FF]/30 hover:bg-white/[0.04] transition-all cursor-pointer group"
                  onClick={() => setViewingDashboard(player)}
                >
                  {/* Card header */}
                  <div className="px-4 py-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${ac}20` }}
                      >
                        <span className="text-[11px] font-mono font-medium" style={{ color: ac }}>
                          {initials(player.name)}
                        </span>
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-white leading-tight">{player.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="text-label px-2 py-0.5 rounded-full"
                            style={{ color: ps.color, backgroundColor: ps.bg }}
                          >
                            {player.position.toUpperCase()}
                          </span>
                          <span
                            className="text-label px-2 py-0.5 rounded-full"
                            style={
                              player.status === 'Activo'
                                ? { color: '#91FFB0', backgroundColor: 'rgba(145,255,176,0.08)' }
                                : { color: '#FF919F', backgroundColor: 'rgba(255,145,159,0.08)' }
                            }
                          >
                            {(player.status || 'ACTIVO').toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEdit(player)} className="p-1.5 text-white/20 hover:text-white/60 transition-colors rounded">
                        <Edit size={13} />
                      </button>
                      <button onClick={() => handleDelete(player.id)} className="p-1.5 text-white/20 hover:text-[#FF919F] transition-colors rounded">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="px-4 pb-3 border-t border-white/[0.04]">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3">
                      {[
                        { label: 'ALTURA', value: player.height ? `${player.height} cm` : '—' },
                        { label: 'PESO',   value: player.weight ? `${player.weight} kg`  : '—' },
                        { label: 'ENVERG.', value: player.wingspan ? `${player.wingspan} cm` : '—' },
                        { label: 'MANO',   value: player.dominantHand || '—' },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-label text-white/25">{label}</p>
                          <p className="text-[13px] font-mono text-white/70 mt-0.5">{value}</p>
                        </div>
                      ))}
                    </div>

                    {hasReaches && (
                      <div className="mt-3 pt-3 border-t border-white/[0.04]">
                        <p className="text-label text-white/25 mb-2">ALCANCES</p>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'ESTÁT.', val: player.reachStatic },
                            { label: 'BLOQ.',  val: player.reachBlock  },
                            { label: 'ATAQ.',  val: player.reachAttack },
                          ].map(({ label, val }) => (
                            <div key={label} className="text-center bg-white/[0.03] rounded py-1.5">
                              <p className="text-[14px] font-mono font-semibold text-white">{val || '—'}</p>
                              <p className="text-label text-white/25">{label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-4 pb-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); setViewingDashboard(player); }}
                      className="w-full flex items-center justify-center gap-2 py-2 border border-white/[0.08] rounded text-label text-white/40 hover:text-[#A191FF] hover:border-[#A191FF]/30 transition-colors group-hover:text-[#A191FF] group-hover:border-[#A191FF]/30"
                    >
                      <Activity size={12} /> Ver Dashboard
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Dialog: nueva / editar jugadora ─────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl bg-[#0d0d0d] border border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-[15px] text-white">
              {editing ? 'Editar jugadora' : 'Nueva jugadora'}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-white/40">
              {editing ? 'Actualiza los datos de la jugadora.' : 'Ingresa los datos de la nueva jugadora.'}
            </DialogDescription>
          </DialogHeader>
          <PlayerForm player={editing} onSave={handleSave} onCancel={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {viewingDashboard && (
        <PlayerProfileDashboard
          player={viewingDashboard}
          tests={state.physicalTests.filter((t: any) => t.playerId === viewingDashboard.id)}
          onClose={() => setViewingDashboard(null)}
        />
      )}
    </div>
  );
}

// ── PlayerForm ────────────────────────────────────────────────────────────────

function PlayerForm({ player, onSave, onCancel }: { player: any; onSave: (d: any) => void; onCancel: () => void }) {
  const [d, setD] = useState(player ?? {
    name: '', position: '', dominantHand: '',
    height: '', weight: '', wingspan: '',
    reachStatic: '', reachBlock: '', reachAttack: '',
  });

  const field = (key: string, e: React.ChangeEvent<HTMLInputElement>) => setD({ ...d, [key]: e.target.value });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!d.name.trim())      { toast.error('El nombre es requerido'); return; }
    if (!d.position)         { toast.error('La posición es requerida'); return; }
    if (!d.dominantHand)     { toast.error('La mano dominante es requerida'); return; }
    onSave(d);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-label text-white/40">NOMBRE COMPLETO</Label>
          <input value={d.name} onChange={e => field('name', e)} placeholder="Nombre completo" className={INPUT_CLS} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-label text-white/40">POSICIÓN</Label>
          <Select value={d.position} onValueChange={v => setD({ ...d, position: v })}>
            <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-[13px] text-white">
              <SelectValue placeholder="Seleccionar posición" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/[0.08]">
              {POSITIONS.map(p => <SelectItem key={p} value={p} className="text-[13px] text-white/70">{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-label text-white/40">MANO DOMINANTE</Label>
          <Select value={d.dominantHand} onValueChange={v => setD({ ...d, dominantHand: v })}>
            <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-[13px] text-white">
              <SelectValue placeholder="Seleccionar mano" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/[0.08]">
              {HANDS.map(h => <SelectItem key={h} value={h} className="text-[13px] text-white/70">{h}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-label text-white/40">ALTURA (cm)</Label>
          <input type="number" value={d.height} onChange={e => field('height', e)} placeholder="Ej: 178" className={INPUT_CLS} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-label text-white/40">PESO (kg)</Label>
          <input type="number" value={d.weight} onChange={e => field('weight', e)} placeholder="Ej: 68" className={INPUT_CLS} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-label text-white/40">ENVERGADURA (cm)</Label>
          <input type="number" value={d.wingspan} onChange={e => field('wingspan', e)} placeholder="Ej: 182" className={INPUT_CLS} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-label text-white/40">ALCANCES (cm)</Label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'reachStatic', label: 'Estático'  },
            { key: 'reachBlock',  label: 'Bloqueo'   },
            { key: 'reachAttack', label: 'Ataque'    },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <p className="text-label text-white/25">{label.toUpperCase()}</p>
              <input type="number" value={d[key]} onChange={e => field(key, e)} placeholder="cm" className={INPUT_CLS} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-white/[0.06]">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-label text-white/40 hover:text-white transition-colors">
          Cancelar
        </button>
        <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-[#A191FF] hover:bg-[#B8ADFF] text-black text-label font-semibold rounded-lg transition-colors">
          {player ? 'Actualizar' : 'Crear jugadora'}
        </button>
      </div>
    </form>
  );
}
