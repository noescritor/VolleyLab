import React, { useState, createContext, useContext, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './components/ui/dialog';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Dashboard } from './components/Dashboard';
import { PlayerManagement } from './components/PlayerManagement';
import { PhysicalTesting } from './components/PhysicalTesting';
import { MatchAnalytics } from './components/MatchAnalytics';
import { MatchCenter } from './components/MatchCenter';
import LiveMatchCenter from './components/live-match/LiveMatchCenter';
import { LoadManagement } from './components/LoadManagement';
import { PerformanceReports } from './components/PerformanceReports';
import { TrainingPlan } from './components/TrainingPlan';
import { TestPage } from './components/TestPage';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { AppProvider, setNavigationCallback } from './utils/AppContext';
import {
  Activity, Users, TestTube, BarChart3, TrendingUp, FileText,
  Settings, Zap, Brain, Edit3, Save, X, Upload, Link, Trash2,
  Camera, Loader2, LogOut, ChevronLeft, ChevronRight, Menu, Moon, Sun, Calendar
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useUserProfile } from './utils/useUserProfile';
import { Toaster } from './components/ui/sonner';
import { ClubSelector } from './components/ClubSelector';
import { supabase } from './utils/supabase/globalClient';
import { VolleyLabLogo } from './components/VolleyLabLogo';

// ─── Navigation context ───────────────────────────────────────────────────────
interface NavigationContextType { setActiveTab: (tab: string) => void; }
const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used within NavigationProvider');
  return ctx;
}

// ─── Tab definition ───────────────────────────────────────────────────────────
const NAV_TABS = [
  { value: 'dashboard',    label: 'Dashboard',     icon: Activity,   live: false },
  { value: 'players',      label: 'Jugadores',     icon: Users,      live: false },
  { value: 'physical',     label: 'Tests Físicos', icon: TestTube,   live: false },
  { value: 'match',        label: 'Partidos',      icon: BarChart3,  live: false },
  { value: 'analytics',    label: 'Análisis',      icon: Brain,      live: false },
  { value: 'match-center', label: 'En Vivo',       icon: Zap,        live: true  },
  { value: 'load',         label: 'Carga',         icon: TrendingUp, live: false },
  { value: 'reports',      label: 'Reportes',      icon: FileText,   live: false },
  { value: 'training',     label: 'Planeación',    icon: Calendar,   live: false },
] as const;

type TabValue = typeof NAV_TABS[number]['value'] | 'test';

// ─── Sidebar (propio componente top-level) ─────────────────────────────────────
interface SidebarProps {
  activeTab: string;
  collapsed: boolean;
  showUserMenu: boolean;
  userMenuRef: React.RefObject<HTMLDivElement>;
  userProfile: any;
  isProfileLoading: boolean;
  onNavClick: (v: string) => void;
  onToggleUserMenu: () => void;
  onEditProfile: () => void;
  onEditAvatar: () => void;
  onSignOut: () => void;
  isSigningOut: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

function Sidebar({
  activeTab, collapsed, showUserMenu, userMenuRef,
  userProfile, isProfileLoading,
  onNavClick, onToggleUserMenu, onEditProfile, onEditAvatar,
  onSignOut, isSigningOut, theme, onToggleTheme
}: SidebarProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`px-4 py-5 flex items-center gap-3 border-b border-white/[0.05] ${collapsed ? 'justify-center' : ''}`}>
        <VolleyLabLogo size={34} />
        {!collapsed && (
          <div className="flex items-baseline gap-0.5 min-w-0">
            <span className="text-[15px] font-bold text-white tracking-tight truncate">VolleyLab</span>
            <span className="text-[15px] font-bold text-[#A191FF]">/</span>
          </div>
        )}
      </div>

      {/* Club Selector */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-white/[0.05]">
          <ClubSelector />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {!collapsed && (
          <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest px-3 pb-2">Menú Principal</p>
        )}
        {NAV_TABS.map(({ value, label, icon: Icon, live }) => {
          const isActive = activeTab === value;
          return (
            <button
              key={value}
              onClick={() => onNavClick(value)}
              title={collapsed ? label : undefined}
              className={[
                'w-full flex items-center rounded-lg transition-all duration-150 group relative',
                collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-2.5',
                isActive
                  ? live ? 'bg-[#91FFB0]/10 text-[#91FFB0]' : 'bg-[#A191FF]/10 text-[#A191FF]'
                  : 'text-white/35 hover:text-white/70 hover:bg-white/[0.04]',
              ].join(' ')}
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed && <span className="text-[13px] font-medium truncate">{label}</span>}
              {live && !isActive && (
                <span className={`w-1.5 h-1.5 rounded-full bg-[#91FFB0] animate-pulse ${collapsed ? 'absolute top-2 right-2' : 'ml-auto'}`} />
              )}
              {isActive && !collapsed && (
                <span className="ml-auto w-1 h-4 rounded-full" style={{ background: live ? '#91FFB0' : '#A191FF' }} />
              )}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#1a1a1a] border border-white/[0.1] rounded-md text-[12px] text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
                  {label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Theme Toggle */}
      <div className="px-3 pb-2 border-t border-white/[0.05] pt-2">
        <button onClick={onToggleTheme}
          className={['w-full flex items-center rounded-lg transition-all hover:bg-white/[0.04]', collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'].join(' ')}
          title={collapsed ? "Cambiar Tema" : undefined}
        >
          {theme === 'dark' ? <Sun size={16} className="shrink-0" /> : <Moon size={16} className="shrink-0" />}
          {!collapsed && <span className="text-[13px] font-medium text-white/60">Modo {theme === 'dark' ? 'Claro' : 'Oscuro'}</span>}
        </button>
      </div>

      {/* Bottom: user profile */}
      <div className="border-t border-white/[0.05] p-2">
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={onToggleUserMenu}
            className={['w-full flex items-center rounded-lg transition-all hover:bg-white/[0.04]', collapsed ? 'justify-center p-2.5' : 'gap-3 p-2.5'].join(' ')}
          >
            <div className="w-8 h-8 rounded-full bg-[#A191FF]/15 border border-[#A191FF]/20 flex items-center justify-center overflow-hidden shrink-0">
              {isProfileLoading
                ? <Loader2 size={13} className="text-[#A191FF] animate-spin" />
                : userProfile.avatarUrl
                  ? <img src={userProfile.avatarUrl} alt={userProfile.name} className="w-full h-full object-cover" />
                  : <span className="text-[11px] font-mono font-bold text-[#A191FF]">{userProfile.initials}</span>
              }
            </div>
            {!collapsed && (
              <div className="text-left min-w-0 flex-1">
                <p className="text-[13px] font-medium text-white/80 truncate">{userProfile.name}</p>
                <p className="text-[11px] text-white/30 truncate">{userProfile.role}</p>
              </div>
            )}
          </button>

          {showUserMenu && (
            <div className={`absolute ${collapsed ? 'left-full ml-2 bottom-0' : 'bottom-full mb-2 left-0 right-0'} bg-[#141414] border border-white/[0.1] rounded-xl overflow-hidden shadow-2xl z-50`}
              style={{ minWidth: collapsed ? 200 : undefined }}>
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <p className="text-[13px] font-medium text-white">{userProfile.name}</p>
                <p className="text-[11px] text-white/40">{userProfile.role}</p>
              </div>
              <div className="p-1.5 space-y-0.5">
                <button onClick={onEditProfile}
                  className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-white/60 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors text-left">
                  <Edit3 size={14} /> Editar perfil
                </button>
                <button onClick={onEditAvatar}
                  className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-white/60 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors text-left">
                  <Camera size={14} /> Cambiar avatar
                </button>
                <div className="h-px bg-white/[0.06] my-1" />
                <button onClick={onSignOut} disabled={isSigningOut}
                  className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-[#FF919F] hover:bg-[#FF919F]/10 rounded-lg transition-colors text-left disabled:opacity-50">
                  {isSigningOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                  {isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AppContent ───────────────────────────────────────────────────────────────
function AppContent() {
  const [activeTab, setActiveTab]         = useState<TabValue>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen]       = useState(false);
  const [showUserMenu, setShowUserMenu]   = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  const [theme, setTheme] = useState<'dark'|'light'>(() => {
    return (localStorage.getItem('theme') as 'dark'|'light') || 'dark';
  });

  const { userProfile, isLoading: isProfileLoading, updateProfile } = useUserProfile();

  const [isNameDialogOpen, setIsNameDialogOpen]     = useState(false);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [tempName, setTempName]         = useState('');
  const [tempRole, setTempRole]         = useState('');
  const [tempInitials, setTempInitials] = useState('');
  const [tempAvatarUrl, setTempAvatarUrl] = useState<string | null>(null);
  const [avatarMode, setAvatarMode]     = useState<'initials' | 'upload' | 'url'>('initials');
  const [tempImageUrl, setTempImageUrl] = useState('');
  const [isSaving, setIsSaving]         = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => { setNavigationCallback(setActiveTab); }, []);

  useEffect(() => {
    setTempName(userProfile.name);
    setTempRole(userProfile.role);
    setTempInitials(userProfile.initials);
    setTempAvatarUrl(userProfile.avatarUrl);
  }, [userProfile]);

  // Close user menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('currentOrgId');
      localStorage.removeItem('volleyLab_liveMatch');
      localStorage.removeItem('volleyball-offline-queue');
      window.location.href = '/auth';
    } catch {
      toast.error('Error al cerrar sesión');
      setIsSigningOut(false);
    }
  };

  const handleNavClick = (value: string) => {
    setActiveTab(value as TabValue);
    setMobileOpen(false);
  };

  const openEditProfile = () => {
    setShowUserMenu(false);
    setTempName(userProfile.name);
    setTempRole(userProfile.role);
    setIsNameDialogOpen(true);
  };

  const openEditAvatar = () => {
    setShowUserMenu(false);
    setTempInitials(userProfile.initials);
    setTempAvatarUrl(userProfile.avatarUrl);
    setAvatarMode(userProfile.avatarUrl ? 'url' : 'initials');
    setTempImageUrl('');
    setIsAvatarDialogOpen(true);
  };

  const handleNameSave = async () => {
    if (!tempName.trim()) { toast.error('El nombre no puede estar vacío'); return; }
    if (!tempRole.trim()) { toast.error('El rol no puede estar vacío'); return; }
    setIsSaving(true);
    try {
      await updateProfile({ name: tempName.trim(), role: tempRole.trim() });
      setIsNameDialogOpen(false);
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  const handleAvatarSave = async () => {
    setIsSaving(true);
    try {
      if (avatarMode === 'initials') {
        if (!tempInitials.trim())          { toast.error('Las iniciales no pueden estar vacías'); return; }
        if (tempInitials.trim().length > 3) { toast.error('Máximo 3 caracteres'); return; }
        await updateProfile({ initials: tempInitials.trim().toUpperCase(), avatarUrl: null });
      } else if (avatarMode === 'url') {
        if (!tempImageUrl.trim()) { toast.error('Debes ingresar una URL de imagen'); return; }
        await updateProfile({ avatarUrl: tempImageUrl.trim() });
      } else if (avatarMode === 'upload') {
        if (!tempAvatarUrl) { toast.error('Debes seleccionar una imagen'); return; }
        await updateProfile({ avatarUrl: tempAvatarUrl });
      }
      setIsAvatarDialogOpen(false);
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('La imagen no puede superar los 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setTempAvatarUrl(ev.target?.result as string); setAvatarMode('upload'); };
    reader.readAsDataURL(file);
  };

  const sidebarProps: SidebarProps = {
    activeTab, collapsed: sidebarCollapsed,
    showUserMenu, userMenuRef,
    userProfile, isProfileLoading,
    onNavClick: handleNavClick,
    onToggleUserMenu: () => setShowUserMenu(v => !v),
    onEditProfile: openEditProfile,
    onEditAvatar: openEditAvatar,
    onSignOut: handleSignOut,
    isSigningOut,
    theme,
    onToggleTheme: () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <NavigationContext.Provider value={{ setActiveTab }}>
      <div className="h-screen flex bg-[#080808] overflow-hidden">

        {/* ── Desktop Sidebar ──────────────────────────────────────────────── */}
        <aside
          className={['hidden md:flex flex-col shrink-0 border-r border-white/[0.06] transition-all duration-300 relative print:hidden', sidebarCollapsed ? 'w-[60px]' : 'w-[220px]'].join(' ')}
          style={{ background: 'rgba(255,255,255,0.01)' }}
        >
          <Sidebar {...sidebarProps} />
          <button
            onClick={() => setSidebarCollapsed(v => !v)}
            className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[#1a1a1a] border border-white/[0.1] flex items-center justify-center text-white/40 hover:text-white transition-colors z-10 shadow-lg"
          >
            {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </aside>

        {/* ── Mobile Drawer ────────────────────────────────────────────────── */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <div className="relative z-10 w-[240px] h-full flex flex-col"
                 style={{ background: '#0d0d0d', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
              <Sidebar {...sidebarProps} collapsed={false} />
            </div>
          </div>
        )}

        {/* ── Main Area ────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile top bar */}
          <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0 print:hidden"
               style={{ background: 'rgba(255,255,255,0.01)' }}>
            <button onClick={() => setMobileOpen(true)} className="p-2 text-white/40 hover:text-white transition-colors">
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <VolleyLabLogo size={28} />
              <span className="text-[14px] font-bold text-white">VolleyLab<span className="text-[#A191FF]">/</span></span>
            </div>
            <div className="w-10" />
          </div>

          {/* Content */}
          <main className="flex-1 overflow-y-auto min-h-0">
            {activeTab === 'dashboard'    && <Dashboard />}
            {activeTab === 'players'      && <PlayerManagement />}
            {activeTab === 'physical'     && <PhysicalTesting />}
            {activeTab === 'match'        && <MatchAnalytics />}
            {activeTab === 'analytics'    && <AnalyticsDashboard />}
            {activeTab === 'match-center' && <LiveMatchCenter />}
            {activeTab === 'load'         && <LoadManagement />}
            {activeTab === 'reports'      && <PerformanceReports />}
            {activeTab === 'training'     && <TrainingPlan />}
            {activeTab === 'test'         && <TestPage />}
          </main>
        </div>

        {/* ── Dialog: Editar nombre ─────────────────────────────────────────── */}
        <Dialog open={isNameDialogOpen} onOpenChange={setIsNameDialogOpen}>
          <DialogContent className="sm:max-w-md bg-[#0d0d0d] border border-white/[0.08]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[15px] text-white">
                <Edit3 size={16} className="text-[#A191FF]" /> Editar perfil
              </DialogTitle>
              <DialogDescription className="text-[13px] text-white/40">Nombre y rol visibles en el sistema.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-mono text-white/40 uppercase tracking-widest">Nombre Completo</Label>
                <Input value={tempName} onChange={e => setTempName(e.target.value)} placeholder="Tu nombre"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus:border-[#A191FF]/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-mono text-white/40 uppercase tracking-widest">Rol / Cargo</Label>
                <Input value={tempRole} onChange={e => setTempRole(e.target.value)} placeholder="Ej: Entrenador Principal"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus:border-[#A191FF]/50" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setIsNameDialogOpen(false)} disabled={isSaving}
                className="px-4 py-2 text-[13px] text-white/40 hover:text-white transition-colors disabled:opacity-50">Cancelar</button>
              <button onClick={handleNameSave} disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-[#A191FF] hover:bg-[#B8ADFF] text-black text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50">
                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Dialog: Editar avatar ─────────────────────────────────────────── */}
        <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
          <DialogContent className="sm:max-w-lg bg-[#0d0d0d] border border-white/[0.08]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[15px] text-white">
                <Camera size={16} className="text-[#A191FF]" /> Editar avatar
              </DialogTitle>
              <DialogDescription className="text-[13px] text-white/40">Iniciales, imagen subida o URL externa.</DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-4">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-[#A191FF]/10 border border-[#A191FF]/20 flex items-center justify-center overflow-hidden">
                  {(avatarMode === 'upload' || avatarMode === 'url') && tempAvatarUrl
                    ? <img src={tempAvatarUrl} alt="Preview" className="w-full h-full object-cover"
                        onError={() => { setAvatarMode('initials'); setTempAvatarUrl(null); toast.error('Error al cargar la imagen'); }} />
                    : <span className="text-[18px] font-mono font-medium text-[#A191FF]">{tempInitials}</span>
                  }
                </div>
                {tempAvatarUrl && (
                  <button onClick={() => { setTempAvatarUrl(null); setTempImageUrl(''); setAvatarMode('initials'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-[#FF919F] hover:bg-[#FF919F]/10 rounded transition-colors">
                    <Trash2 size={12} /> Eliminar imagen
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {[
                  { mode: 'initials' as const, icon: Edit3,  label: 'Usar iniciales' },
                  { mode: 'upload'   as const, icon: Upload, label: 'Subir imagen'   },
                  { mode: 'url'      as const, icon: Link,   label: 'URL de imagen'  },
                ].map(({ mode, icon: Icon, label }) => (
                  <div key={mode}>
                    <label className="flex items-center gap-3 p-3 rounded border border-white/[0.06] cursor-pointer hover:border-white/20 transition-colors">
                      <input type="radio" checked={avatarMode === mode} onChange={() => setAvatarMode(mode)} className="accent-[#A191FF]" />
                      <Icon size={14} className="text-white/40" />
                      <span className="text-[13px] text-white/60">{label}</span>
                    </label>
                    {avatarMode === mode && mode === 'initials' && (
                      <Input value={tempInitials} onChange={e => setTempInitials(e.target.value.toUpperCase())}
                        placeholder="Ej: CA" maxLength={3} className="mt-2 bg-white/[0.04] border-white/[0.08] text-white text-center focus:border-[#A191FF]/50" />
                    )}
                    {avatarMode === mode && mode === 'upload' && (
                      <div className="mt-2">
                        <Input type="file" accept="image/*" onChange={handleImageUpload}
                          className="bg-white/[0.04] border-white/[0.08] text-white/60" />
                        <p className="text-[11px] text-white/20 mt-1 font-mono">MÁXIMO 2MB · JPG, PNG, GIF</p>
                      </div>
                    )}
                    {avatarMode === mode && mode === 'url' && (
                      <div className="flex gap-2 mt-2">
                        <Input value={tempImageUrl} onChange={e => setTempImageUrl(e.target.value)} placeholder="https://..."
                          className="flex-1 bg-white/[0.04] border-white/[0.08] text-white focus:border-[#A191FF]/50" />
                        <button onClick={() => { if (tempImageUrl.trim()) setTempAvatarUrl(tempImageUrl.trim()); }}
                          className="px-3 border border-white/[0.08] rounded text-white/40 hover:text-white transition-colors">
                          <Link size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setIsAvatarDialogOpen(false)} disabled={isSaving}
                className="px-4 py-2 text-[13px] text-white/40 hover:text-white transition-colors disabled:opacity-50">Cancelar</button>
              <button onClick={handleAvatarSave} disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-[#A191FF] hover:bg-[#B8ADFF] text-black text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50">
                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        <Toaster />
      </div>
    </NavigationContext.Provider>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
