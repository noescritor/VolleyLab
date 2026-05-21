import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { supabaseService } from '../utils/supabaseService';
import { Loader2 } from 'lucide-react';

export function ClubSelector() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentOrgId, setCurrentOrgId] = useState<string>('');

  useEffect(() => {
    supabaseService.getUserOrgs().then(data => {
      setOrgs(data);
      const stored = localStorage.getItem('currentOrgId');
      if (stored && data.find((o: any) => o.org_id === stored)) {
        setCurrentOrgId(stored);
      } else if (data.length > 0) {
        setCurrentOrgId(data[0].org_id);
        localStorage.setItem('currentOrgId', data[0].org_id);
      }
      setLoading(false);
    });
  }, []);

  const handleOrgChange = (orgId: string) => {
    setCurrentOrgId(orgId);
    localStorage.setItem('currentOrgId', orgId);
    window.location.reload(); // Recargar para limpiar estados y obtener datos del nuevo club
  };

  if (loading) return <Loader2 className="animate-spin text-white/50 w-4 h-4 mx-2" />;
  if (orgs.length <= 1) {
    // Si solo tiene un club, mostramos el nombre como texto estático
    return orgs.length === 1 ? (
      <span className="text-xs text-white/40 px-2 truncate max-w-[150px] hidden md:block">
        {orgs[0].orgs.nombre}
      </span>
    ) : null;
  }

  return (
    <div className="hidden md:block">
      <Select value={currentOrgId} onValueChange={handleOrgChange}>
        <SelectTrigger className="w-[180px] h-8 bg-white/[0.04] border-white/[0.08] text-xs text-white">
          <SelectValue placeholder="Seleccionar Club" />
        </SelectTrigger>
        <SelectContent className="bg-[#0d0d0d] border-white/[0.08] text-white">
          {orgs.map((org: any) => (
            <SelectItem key={org.org_id} value={org.org_id} className="text-xs hover:bg-white/[0.04]">
              {org.orgs.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
