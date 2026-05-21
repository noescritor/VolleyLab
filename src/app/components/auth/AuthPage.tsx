import React, { useState } from 'react';
import { supabase } from '../../utils/supabase/globalClient';
import { toast } from 'sonner@2.0.3';
import { useNavigate } from 'react-router';
import { Loader2, Activity, Users, TrendingUp, BarChart3, Zap, ArrowRight, Check } from 'lucide-react';
import { VolleyLabLogo } from '../VolleyLabLogo';

const INPUT_CLS =
  'w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-[#A191FF]/60 focus:bg-white/[0.07] transition-all duration-200';
const LABEL_CLS = 'block text-[11px] font-mono text-white/40 uppercase tracking-widest mb-2';

const FEATURES = [
  { icon: Users,      text: 'Gestión completa de jugadores y plantillas' },
  { icon: TrendingUp, text: 'Tests físicos con evolución histórica y PRs' },
  { icon: BarChart3,  text: 'Análisis avanzado con gráficas en tiempo real' },
  { icon: Zap,        text: 'Captura de estadísticas en partidos en vivo' },
  { icon: Activity,   text: 'Exportación de datos a Excel para análisis externo' },
];

export function AuthPage() {
  const [isLogin, setIsLogin]   = useState(true);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [orgName, setOrgName]   = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('¡Bienvenido de nuevo!');
        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: {
              full_name: name,
              org_name: orgName.trim() || `Club de ${name.trim() || email.split('@')[0]}`,
            },
          },
        });
        if (error) throw error;
        toast.success('¡Cuenta creada! Tu organización está lista.');
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error en la autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#070709' }}>

      {/* ── LEFT: Marketing panel ──────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 relative overflow-hidden p-14">
        {/* Ambient glow */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(161,145,255,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(145,202,255,0.08) 0%, transparent 70%)' }} />

        {/* Grid lines decoration */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <VolleyLabLogo size={38} />
          <div>
            <span className="text-[18px] font-bold text-white tracking-tight">VolleyLab</span>
            <span className="text-[18px] font-bold text-[#A191FF]">/</span>
          </div>
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-mono tracking-widest text-[#A191FF]"
              style={{ background: 'rgba(161,145,255,0.1)', border: '1px solid rgba(161,145,255,0.2)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#A191FF] animate-pulse" />
              PLATAFORMA DEPORTIVA · BETA
            </div>

            <h1 className="text-5xl font-bold leading-tight text-white">
              Analítica de
              <span style={{ background: 'linear-gradient(90deg, #A191FF, #91CAFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}> alto rendimiento </span>
              para voleibol
            </h1>

            <p className="text-[16px] text-white/45 leading-relaxed max-w-md">
              Centraliza el seguimiento de tus jugadores, captura estadísticas en tiempo real y toma decisiones respaldadas por datos — todo en una sola plataforma.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(145,255,176,0.1)', border: '1px solid rgba(145,255,176,0.2)' }}>
                  <Check size={12} style={{ color: '#91FFB0' }} />
                </div>
                <span className="text-[14px] text-white/55">{text}</span>
              </li>
            ))}
          </ul>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/[0.06]">
            {[
              { value: '100%', label: 'Datos en la nube' },
              { value: 'Multi', label: 'Club / Deporte' },
              { value: '0€',   label: 'En acceso beta' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-[11px] text-white/30 font-mono uppercase tracking-wide mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-[12px] text-white/20 font-mono">
          © 2025 VolleyLab · Todos los derechos reservados
        </p>
      </div>

      {/* ── RIGHT: Auth form ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative"
        style={{ background: 'rgba(255,255,255,0.012)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <VolleyLabLogo size={34} />
          <span className="text-[17px] font-bold text-white">VolleyLab<span className="text-[#A191FF]">/</span></span>
        </div>

        <div className="w-full max-w-sm">
          {/* Tabs */}
          <div className="flex rounded-xl p-1 mb-8" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { id: true,  label: 'Iniciar sesión' },
              { id: false, label: 'Crear cuenta' },
            ].map(({ id, label }) => (
              <button
                key={String(id)}
                onClick={() => setIsLogin(id)}
                className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200"
                style={isLogin === id
                  ? { background: 'rgba(161,145,255,0.15)', color: '#A191FF', border: '1px solid rgba(161,145,255,0.25)' }
                  : { color: 'rgba(255,255,255,0.35)', border: '1px solid transparent' }
                }
              >
                {label}
              </button>
            ))}
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-[24px] font-bold text-white tracking-tight">
              {isLogin ? 'Bienvenido de nuevo' : 'Comienza hoy'}
            </h2>
            <p className="text-[14px] text-white/35 mt-1">
              {isLogin ? 'Ingresa tus credenciales para acceder a tu club.' : 'Crea tu cuenta y configura tu primer equipo.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className={LABEL_CLS}>Nombre Completo</label>
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Tu nombre completo" required
                    className={INPUT_CLS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Nombre del Club / Organización</label>
                  <input
                    type="text" value={orgName} onChange={e => setOrgName(e.target.value)}
                    placeholder="Ej: Club Voleibol Monterrey"
                    className={INPUT_CLS}
                  />
                  <p className="text-[11px] text-white/25 mt-1.5 font-mono">Opcional · puedes cambiarlo después</p>
                </div>
              </>
            )}

            <div>
              <label className={LABEL_CLS}>Correo Electrónico</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@correo.com" required
                className={INPUT_CLS}
              />
            </div>

            <div>
              <label className={LABEL_CLS}>Contraseña</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required minLength={6}
                className={INPUT_CLS}
              />
              {!isLogin && (
                <p className="text-[11px] text-white/25 mt-1.5 font-mono">Mínimo 6 caracteres</p>
              )}
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-[14px] transition-all duration-200 disabled:opacity-50 mt-2"
              style={{
                background: loading ? 'rgba(161,145,255,0.3)' : 'linear-gradient(135deg, #A191FF, #8B7FE8)',
                color: '#000',
                boxShadow: loading ? 'none' : '0 8px 32px rgba(161,145,255,0.25)',
              }}
            >
              {loading
                ? <Loader2 size={18} className="animate-spin text-black/50" />
                : <>
                    {isLogin ? 'Ingresar' : 'Crear cuenta'}
                    <ArrowRight size={16} />
                  </>
              }
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.06]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-[11px] text-white/25 font-mono" style={{ background: 'rgba(255,255,255,0.012)' }}>
                {isLogin ? '¿NO TIENES CUENTA?' : '¿YA TIENES CUENTA?'}
              </span>
            </div>
          </div>

          <button
            type="button" onClick={() => setIsLogin(!isLogin)}
            className="w-full flex items-center justify-center h-11 rounded-xl text-[13px] font-semibold transition-all duration-200"
            style={{
              color: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.02)',
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.85)'; (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.5)'; (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >
            {isLogin ? 'Crear cuenta nueva' : 'Iniciar sesión'}
          </button>

          <p className="text-center text-[11px] text-white/20 mt-8 font-mono leading-relaxed">
            Al continuar, aceptas los términos de uso.<br />Tus datos son privados y solo tú controlas el acceso.
          </p>
        </div>
      </div>
    </div>
  );
}
