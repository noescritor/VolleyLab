import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { KPIStat } from './KPIStat';
import { PositionBadge } from './PositionBadge';
import { RadarChart } from './RadarChart';
import { HeatmapCourt } from './HeatmapCourt';
import { BarStacked } from './BarStacked';
import { RotationPie } from './RotationPie';
import { TrendLine } from './TrendLine';
import { Filter, Calendar } from 'lucide-react';

export function TeamDashboard() {
  const [selectedTournament, setSelectedTournament] = useState('liga-2024');
  const [selectedPosition, setSelectedPosition] = useState('all');

  // Mock data
  const teamKPIs = {
    sideOut: { value: 67.5, trend: 'up' as const, trendValue: 2.3 },
    receptionEff: { value: 2.45, trend: 'up' as const, trendValue: 0.15 },
    hitting: { value: 42.8, trend: 'down' as const, trendValue: 1.2 },
    aces: { value: 8.5, trend: 'neutral' as const },
    stuffs: { value: 1.8, trend: 'up' as const, trendValue: 0.3 }
  };

  const positionData = [
    {
      position: 'OH' as const,
      players: 2,
      kpis: {
        hitting: 38.5,
        reception: 2.3,
        digs: 3.2
      }
    },
    {
      position: 'OPP' as const,
      players: 2,
      kpis: {
        hitting: 45.2,
        aces: 1.8,
        stuffs: 0.9
      }
    },
    {
      position: 'MB' as const,
      players: 3,
      kpis: {
        hitting: 52.1,
        stuffs: 1.2,
        quickAttack: 68.0
      }
    },
    {
      position: 'S' as const,
      players: 2,
      kpis: {
        sideOut: 67.3,
        distribution: 85.5,
        dumps: 2.1
      }
    },
    {
      position: 'L' as const,
      players: 2,
      kpis: {
        reception: 2.6,
        digs: 4.8,
        organization: 92.0
      }
    }
  ];

  const radarData = [
    { subject: 'Saque', player: 72, reference: 65 },
    { subject: 'Recepción', player: 78, reference: 70 },
    { subject: 'Ataque', player: 75, reference: 72 },
    { subject: 'Bloqueo', player: 68, reference: 65 },
    { subject: 'Defensa', player: 71, reference: 68 }
  ];

  const rotationData = [
    { rotation: 1, sideOut: 72.5, color: '#2563EB' },
    { rotation: 2, sideOut: 68.2, color: '#3B82F6' },
    { rotation: 3, sideOut: 65.8, color: '#60A5FA' },
    { rotation: 4, sideOut: 71.3, color: '#93C5FD' },
    { rotation: 5, sideOut: 69.7, color: '#DBEAFE' },
    { rotation: 6, sideOut: 74.1, color: '#1D4ED8' }
  ];

  const heatmapData = [
    { zone: 1, intensity: 35, count: 42 },
    { zone: 2, intensity: 85, count: 127 },
    { zone: 3, intensity: 45, count: 68 },
    { zone: 4, intensity: 90, count: 142 },
    { zone: 5, intensity: 55, count: 89 },
    { zone: 6, intensity: 25, count: 38 }
  ];

  const fundamentalsData = [
    { name: 'Saque', aciertos: 156, errores: 28 },
    { name: 'Recepción', aciertos: 284, errores: 45 },
    { name: 'Ataque', aciertos: 198, errores: 67 },
    { name: 'Bloqueo', aciertos: 89, errores: 12 },
    { name: 'Defensa', aciertos: 167, errores: 23 }
  ];

  const trendData = [
    { date: '2024-01-01', saltoPromedio: 58.2, recepcionPerfecta: 45.5 },
    { date: '2024-01-08', saltoPromedio: 59.1, recepcionPerfecta: 47.2 },
    { date: '2024-01-15', saltoPromedio: 58.8, recepcionPerfecta: 46.8 },
    { date: '2024-01-22', saltoPromedio: 60.3, recepcionPerfecta: 48.9 },
    { date: '2024-01-29', saltoPromedio: 61.0, recepcionPerfecta: 49.2 }
  ];

  return (
    <div className="container-grid py-32">
      {/* Header */}
      <div className="col-span-12 mb-24">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-16">
          <div>
            <h1 className="display text-neutral-900 mb-8">Dashboard del Equipo</h1>
            <p className="body text-neutral-500">Análisis integral del rendimiento del equipo</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-12">
            <Select value={selectedTournament} onValueChange={setSelectedTournament}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="liga-2024">Liga 2024</SelectItem>
                <SelectItem value="copa-nacional">Copa Nacional</SelectItem>
                <SelectItem value="internacional">Internacional</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedPosition} onValueChange={setSelectedPosition}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las posiciones</SelectItem>
                <SelectItem value="OH">Opuesto (OH)</SelectItem>
                <SelectItem value="OPP">Punta (OPP)</SelectItem>
                <SelectItem value="MB">Central (MB)</SelectItem>
                <SelectItem value="S">Colocador (S)</SelectItem>
                <SelectItem value="L">Líbero (L)</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-8" />
              Fecha
            </Button>
          </div>
        </div>
      </div>

      {/* KPIs Globales */}
      <div className="col-span-12 mb-32">
        <h2 className="title text-neutral-900 mb-16">KPIs Globales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-16">
          <KPIStat 
            label="Side-Out %" 
            value={teamKPIs.sideOut.value} 
            format="percentage" 
            trend={teamKPIs.sideOut.trend}
            trendValue={teamKPIs.sideOut.trendValue}
          />
          <KPIStat 
            label="Eficiencia Recepción" 
            value={teamKPIs.receptionEff.value} 
            format="decimal" 
            trend={teamKPIs.receptionEff.trend}
            trendValue={teamKPIs.receptionEff.trendValue}
          />
          <KPIStat 
            label="Hitting %" 
            value={teamKPIs.hitting.value} 
            format="percentage" 
            trend={teamKPIs.hitting.trend}
            trendValue={teamKPIs.hitting.trendValue}
          />
          <KPIStat 
            label="Aces %" 
            value={teamKPIs.aces.value} 
            format="percentage" 
            trend={teamKPIs.aces.trend}
          />
          <KPIStat 
            label="Stuffs/Set" 
            value={teamKPIs.stuffs.value} 
            format="decimal" 
            trend={teamKPIs.stuffs.trend}
            trendValue={teamKPIs.stuffs.trendValue}
          />
        </div>
      </div>

      {/* Distribución por Posición */}
      <div className="col-span-12 mb-32">
        <h2 className="title text-neutral-900 mb-16">Rendimiento por Posición</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-16">
          {positionData.map((pos) => (
            <Card key={pos.position} className="p-16 rounded-lg shadow-sm">
              <CardContent className="p-0">
                <div className="flex items-center justify-between mb-12">
                  <PositionBadge position={pos.position} />
                  <span className="caption text-neutral-500">{pos.players} jugadores</span>
                </div>
                
                <div className="space-y-8">
                  {Object.entries(pos.kpis).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="caption text-neutral-500 capitalize">
                        {key === 'hitting' ? 'Hitting%' :
                         key === 'reception' ? 'Recepción' :
                         key === 'digs' ? 'Digs/Set' :
                         key === 'aces' ? 'Aces/Set' :
                         key === 'stuffs' ? 'Stuffs/Set' :
                         key === 'quickAttack' ? 'Rápidas%' :
                         key === 'sideOut' ? 'Side-Out%' :
                         key === 'distribution' ? 'Distribución%' :
                         key === 'dumps' ? 'Dumps/Set' :
                         key === 'organization' ? 'Organización%' : key}
                      </span>
                      <span className="body font-medium text-neutral-900">
                        {typeof value === 'number' ? 
                          (value < 10 ? value.toFixed(1) : Math.round(value)) : value}
                        {key.includes('%') || key === 'hitting' || key === 'quickAttack' || 
                         key === 'sideOut' || key === 'distribution' || key === 'organization' ? '%' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Radar y Rotación */}
      <div className="col-span-6 mb-32">
        <Card className="p-24 rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="title text-neutral-900">Radar Equipo vs Referencia</CardTitle>
          </CardHeader>
          <CardContent>
            <RadarChart 
              data={radarData}
              playerName="Equipo"
              referenceName="Liga Promedio"
              height={350}
            />
          </CardContent>
        </Card>
      </div>

      <div className="col-span-6 mb-32">
        <Card className="p-24 rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="title text-neutral-900">Side-Out por Rotación</CardTitle>
          </CardHeader>
          <CardContent>
            <RotationPie data={rotationData} height={350} />
          </CardContent>
        </Card>
      </div>

      {/* Heatmap */}
      <div className="col-span-12 mb-32">
        <Card className="p-24 rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="title text-neutral-900">Heatmap de Ataques del Equipo</CardTitle>
          </CardHeader>
          <CardContent>
            <HeatmapCourt 
              data={heatmapData}
              title="Distribución de Ataques por Zona"
            />
          </CardContent>
        </Card>
      </div>

      {/* Barras por Fundamento */}
      <div className="col-span-6 mb-32">
        <Card className="p-24 rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="title text-neutral-900">Aciertos vs Errores por Fundamento</CardTitle>
          </CardHeader>
          <CardContent>
            <BarStacked data={fundamentalsData} height={350} />
          </CardContent>
        </Card>
      </div>

      {/* Tendencias */}
      <div className="col-span-6 mb-32">
        <Card className="p-24 rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="title text-neutral-900">Tendencias Semanales</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendLine 
              data={trendData}
              lines={[
                { key: 'saltoPromedio', name: 'Salto Promedio (cm)', color: '#2563EB' },
                { key: 'recepcionPerfecta', name: 'Recepción Perfecta (%)', color: '#16A34A' }
              ]}
              height={350}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}