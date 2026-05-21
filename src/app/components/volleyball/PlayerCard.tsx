import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { PositionBadge } from './PositionBadge';

interface PlayerCardProps {
  name: string;
  position: 'OH' | 'OPP' | 'MB' | 'S' | 'L';
  dominantHand: 'L' | 'R';
  height: number;
  wingspan: number;
  reachBlock: number;
  reachAttack: number;
  avatar?: string;
  variant?: 'default' | 'compact';
}

export function PlayerCard({ 
  name, 
  position, 
  dominantHand, 
  height, 
  wingspan, 
  reachBlock, 
  reachAttack, 
  avatar,
  variant = 'default'
}: PlayerCardProps) {
  if (variant === 'compact') {
    return (
      <Card className="p-16 rounded-lg shadow-sm">
        <div className="flex items-center gap-12">
          <Avatar className="h-12 w-12">
            <AvatarImage src={avatar} />
            <AvatarFallback className="text-caption font-medium">
              {name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="title text-neutral-900">{name}</h3>
            <div className="flex items-center gap-8 mt-4">
              <PositionBadge position={position} />
              <span className="caption text-neutral-500">{dominantHand === 'L' ? 'Zurdo' : 'Diestro'}</span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-24 rounded-lg shadow-sm">
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row gap-24">
          <div className="flex items-center gap-16">
            <Avatar className="h-16 w-16 lg:h-20 lg:w-20">
              <AvatarImage src={avatar} />
              <AvatarFallback className="body font-medium">
                {name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="display text-neutral-900 mb-8">{name}</h2>
              <div className="flex items-center gap-12">
                <PositionBadge position={position} />
                <span className="body text-neutral-500">
                  {dominantHand === 'L' ? 'Zurdo' : 'Diestro'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-16 flex-1">
            <div className="text-center">
              <div className="title text-neutral-900">{(height / 100).toFixed(2)}m</div>
              <div className="caption text-neutral-500">Altura</div>
            </div>
            <div className="text-center">
              <div className="title text-neutral-900">{(wingspan / 100).toFixed(2)}m</div>
              <div className="caption text-neutral-500">Envergadura</div>
            </div>
            <div className="text-center">
              <div className="title text-neutral-900">{(reachBlock / 100).toFixed(2)}m</div>
              <div className="caption text-neutral-500">Reach Bloqueo</div>
            </div>
            <div className="text-center">
              <div className="title text-neutral-900">{(reachAttack / 100).toFixed(2)}m</div>
              <div className="caption text-neutral-500">Reach Ataque</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}