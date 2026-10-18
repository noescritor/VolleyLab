import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { PlayerCard } from './PlayerCard';
import { PositionBadge } from './PositionBadge';
import { KPIStat } from './KPIStat';
import { ProgressRing } from './ProgressRing';
import { RadarChart } from './RadarChart';
import { BarStacked } from './BarStacked';
import { HeatmapCourt } from './HeatmapCourt';

export function UIKit() {
  const mockRadarData = [
    { subject: 'Saque', player: 75, reference: 60 },
    { subject: 'Recepción', player: 85, reference: 70 },
    { subject: 'Ataque', player: 68, reference: 75 },
    { subject: 'Bloqueo', player: 72, reference: 65 },
    { subject: 'Defensa', player: 80, reference: 68 }
  ];

  const mockBarData = [
    { name: 'Saque', aciertos: 15, errores: 3 },
    { name: 'Recepción', aciertos: 42, errores: 8 },
    { name: 'Ataque', aciertos: 28, errores: 12 },
    { name: 'Bloqueo', aciertos: 8, errores: 2 }
  ];

  const mockHeatmapData = [
    { zone: 1, intensity: 45, count: 8 },
    { zone: 2, intensity: 80, count: 15 },
    { zone: 3, intensity: 30, count: 5 },
    { zone: 4, intensity: 90, count: 18 },
    { zone: 5, intensity: 65, count: 12 },
    { zone: 6, intensity: 25, count: 4 }
  ];

  return (
    <div className="container-grid py-32">
      {/* Typography Scale */}
      <div className="col-span-12">
        <Card className="p-24 rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="display text-neutral-900">Escala Tipográfica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-24">
            <div>
              <h1 className="display text-neutral-900">Display 24/700 - Títulos principales</h1>
              <h2 className="title text-neutral-900">Title 18/700 - Títulos de sección</h2>
              <p className="body text-neutral-700">Body 14/500 - Texto de contenido y etiquetas</p>
              <p className="caption text-neutral-500">Caption 12/500 - Texto auxiliar y metadatos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Color Palette */}
      <div className="col-span-12">
        <Card className="p-24 rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="title text-neutral-900">Paleta de Colores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-16">
              <div className="space-y-8">
                <div className="w-full h-16 bg-primary rounded-lg"></div>
                <div className="caption text-neutral-700">Primary #A191FF</div>
              </div>
              <div className="space-y-8">
                <div className="w-full h-16 bg-success rounded-lg"></div>
                <div className="caption text-neutral-700">Success #91FFB0</div>
              </div>
              <div className="space-y-8">
                <div className="w-full h-16 bg-warning rounded-lg"></div>
                <div className="caption text-neutral-700">Warning #FFD391</div>
              </div>
              <div className="space-y-8">
                <div className="w-full h-16 bg-destructive rounded-lg"></div>
                <div className="caption text-neutral-700">Danger #FF919F</div>
              </div>
              <div className="space-y-8">
                <div className="w-full h-16 bg-neutral-500 rounded-lg"></div>
                <div className="caption text-neutral-700">Neutral Scale</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Buttons */}
      <div className="col-span-6">
        <Card className="p-24 rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="title text-neutral-900">Botones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-16">
            <div className="flex flex-wrap gap-12">
              <Button className="bg-primary text-primary-foreground">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <div className="flex flex-wrap gap-12">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form Controls */}
      <div className="col-span-6">
        <Card className="p-24 rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="title text-neutral-900">Controles de Formulario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-16">
            <Input placeholder="Input field" />
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="option1">Opción 1</SelectItem>
                <SelectItem value="option2">Opción 2</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-8">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Position Badges */}
      <div className="col-span-12">
        <Card className="p-24 rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="title text-neutral-900">Position Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-12">
              <PositionBadge position="OH" />
              <PositionBadge position="OPP" />
              <PositionBadge position="MB" />
              <PositionBadge position="S" />
              <PositionBadge position="L" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Stats */}
      <div className="col-span-4">
        <KPIStat 
          label="Side-Out %" 
          value={67.5} 
          format="percentage" 
          trend="up" 
          trendValue={2.3} 
        />
      </div>
      <div className="col-span-4">
        <KPIStat 
          label="Hitting %" 
          value={0.285} 
          format="decimal" 
          trend="down" 
          trendValue={0.015} 
        />
      </div>
      <div className="col-span-4">
        <KPIStat 
          label="Aces/Set" 
          value={1.2} 
          format="decimal" 
          trend="neutral" 
        />
      </div>

      {/* Progress Rings */}
      <div className="col-span-3">
        <Card className="p-24 rounded-lg shadow-sm flex justify-center">
          <ProgressRing value={75} label="CMJ" color="primary" />
        </Card>
      </div>
      <div className="col-span-3">
        <Card className="p-24 rounded-lg shadow-sm flex justify-center">
          <ProgressRing value={82} label="Recepción" color="success" />
        </Card>
      </div>
      <div className="col-span-3">
        <Card className="p-24 rounded-lg shadow-sm flex justify-center">
          <ProgressRing value={45} label="Saque" color="warning" />
        </Card>
      </div>
      <div className="col-span-3">
        <Card className="p-24 rounded-lg shadow-sm flex justify-center">
          <ProgressRing value={91} label="Defensa" color="destructive" />
        </Card>
      </div>

      {/* Player Card */}
      <div className="col-span-12">
        <PlayerCard
          name="Luis M."
          position="OH"
          dominantHand="R"
          height={180}
          wingspan={200}
          reachBlock={295}
          reachAttack={315}
        />
      </div>

      {/* Charts */}
      <div className="col-span-6">
        <Card className="p-24 rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="title text-neutral-900">Radar Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <RadarChart 
              data={mockRadarData}
              playerName="Luis M."
              referenceName="Promedio Equipo"
            />
          </CardContent>
        </Card>
      </div>

      <div className="col-span-6">
        <Card className="p-24 rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="title text-neutral-900">Bar Stacked</CardTitle>
          </CardHeader>
          <CardContent>
            <BarStacked data={mockBarData} />
          </CardContent>
        </Card>
      </div>

      <div className="col-span-12">
        <Card className="p-24 rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="title text-neutral-900">Heatmap Court</CardTitle>
          </CardHeader>
          <CardContent>
            <HeatmapCourt 
              data={mockHeatmapData}
              title="Destinos de Ataque"
            />
          </CardContent>
        </Card>
      </div>

      {/* Status Tags */}
      <div className="col-span-12">
        <Card className="p-24 rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="title text-neutral-900">Tags de Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-12">
              <Badge className="bg-success text-success-foreground">Excelente</Badge>
              <Badge className="bg-primary text-primary-foreground">Bueno</Badge>
              <Badge className="bg-warning text-warning-foreground">Promedio</Badge>
              <Badge className="bg-destructive text-destructive-foreground">Mejorar</Badge>
              <Badge variant="outline" className="text-neutral-500">Sin datos</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}