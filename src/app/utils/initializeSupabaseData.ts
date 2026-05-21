// Initialize demo data in Supabase with proper UUID schema
import { supabaseService } from './supabaseService';
import { UUID } from './match-types';

export async function initializeSupabaseData() {
  try {
    console.log('🚀 Initializing Supabase demo data...');

    // Check if organization exists
    let org = await supabaseService.getOrganization();
    
    if (!org) {
      console.log('📋 Creating demo organization...');
      org = await supabaseService.createOrganization({
        nombre: 'Club Voleibol Búfalos',
        descripcion: 'Club profesional de voleibol femenino',
        logo_url: null
      });
    }

    // Check if teams exist
    const teams = await supabaseService.getTeams();
    let bufalosTeam;

    if (teams.length === 0) {
      console.log('🏐 Creating demo team...');
      bufalosTeam = await supabaseService.createTeam({
        nombre: 'Búfalos Femenil',
        temporada: '2024-2025',
        categoria: 'Primera División',
        division: 'Liga Nacional',
        entrenador_principal: 'Ana María González',
        color_primario: '#2563EB',
        color_secundario: '#ffffff'
      });
    } else {
      bufalosTeam = teams[0];
    }

    // Check if players exist
    const existingPlayers = await supabaseService.getPlayersByTeam(bufalosTeam.equipo_id);

    if (existingPlayers.length === 0) {
      console.log('👥 Creating demo players...');
      
      const demoPlayers = [
        // 2 Centrales
        {
          nombre: 'Sofia',
          apellidos: 'Martínez López',
          altura_cm: 185,
          peso_kg: 72.5,
          alcance_mano_alzada_cm: 245,
          alcance_bloqueo_cm: 315,
          alcance_ataque_cm: 330,
          mano_habil: 'DER' as const,
          fecha_nac: '2001-03-15',
          posicion: 'Central',
          dorsal: 1,
          es_libero: false,
          es_capitan: true
        },
        {
          nombre: 'Isabella',
          apellidos: 'Rodriguez Vega',
          altura_cm: 188,
          peso_kg: 75.0,
          alcance_mano_alzada_cm: 250,
          alcance_bloqueo_cm: 320,
          alcance_ataque_cm: 335,
          mano_habil: 'DER' as const,
          fecha_nac: '2000-07-22',
          posicion: 'Central',
          dorsal: 2,
          es_libero: false,
          es_capitan: false
        },
        // 2 Puntas
        {
          nombre: 'Camila',
          apellidos: 'Fernández Torres',
          altura_cm: 178,
          peso_kg: 65.0,
          alcance_mano_alzada_cm: 230,
          alcance_bloqueo_cm: 295,
          alcance_ataque_cm: 310,
          mano_habil: 'IZQ' as const,
          fecha_nac: '2002-01-10',
          posicion: 'Punta',
          dorsal: 3,
          es_libero: false,
          es_capitan: false
        },
        {
          nombre: 'Valeria',
          apellidos: 'López Herrera',
          altura_cm: 180,
          peso_kg: 68.0,
          alcance_mano_alzada_cm: 235,
          alcance_bloqueo_cm: 300,
          alcance_ataque_cm: 315,
          mano_habil: 'DER' as const,
          fecha_nac: '2001-11-05',
          posicion: 'Punta',
          dorsal: 4,
          es_libero: false,
          es_capitan: false
        },
        // 1 Opuesto
        {
          nombre: 'Antonella',
          apellidos: 'Silva Ramírez',
          altura_cm: 182,
          peso_kg: 70.0,
          alcance_mano_alzada_cm: 240,
          alcance_bloqueo_cm: 305,
          alcance_ataque_cm: 325,
          mano_habil: 'DER' as const,
          fecha_nac: '2000-09-18',
          posicion: 'Opuesto',
          dorsal: 5,
          es_libero: false,
          es_capitan: false
        },
        // 2 Líberos
        {
          nombre: 'Martina',
          apellidos: 'González Castro',
          altura_cm: 168,
          peso_kg: 58.0,
          alcance_mano_alzada_cm: 215,
          alcance_bloqueo_cm: 270,
          alcance_ataque_cm: 285,
          mano_habil: 'DER' as const,
          fecha_nac: '2002-04-30',
          posicion: 'Líbero',
          dorsal: 6,
          es_libero: true,
          es_capitan: false
        },
        {
          nombre: 'Renata',
          apellidos: 'Torres Morales',
          altura_cm: 165,
          peso_kg: 55.0,
          alcance_mano_alzada_cm: 210,
          alcance_bloqueo_cm: 265,
          alcance_ataque_cm: 280,
          mano_habil: 'IZQ' as const,
          fecha_nac: '2003-02-14',
          posicion: 'Líbero',
          dorsal: 7,
          es_libero: true,
          es_capitan: false
        },
        // 1 Colocador
        {
          nombre: 'Bianca',
          apellidos: 'Herrera Jiménez',
          altura_cm: 175,
          peso_kg: 62.0,
          alcance_mano_alzada_cm: 225,
          alcance_bloqueo_cm: 285,
          alcance_ataque_cm: 300,
          mano_habil: 'DER' as const,
          fecha_nac: '2001-12-08',
          posicion: 'Colocador',
          dorsal: 8,
          es_libero: false,
          es_capitan: false
        }
      ];

      // Create players and assign to team
      for (const playerData of demoPlayers) {
        const { posicion, dorsal, es_libero, es_capitan, ...playerInfo } = playerData;
        
        // Create player
        const newPlayer = await supabaseService.createPlayer(playerInfo);
        
        // Assign to team
        await supabaseService.assignPlayerToTeam(newPlayer.jugador_id, bufalosTeam.equipo_id, {
          dorsal,
          posicion_principal: posicion as any,
          es_libero,
          es_capitan,
          activo: true
        });

        console.log(`  ✅ Created player: ${playerInfo.nombre} ${playerInfo.apellidos} (#${dorsal})`);
      }
    }

    // Create some sample physical tests
    const players = await supabaseService.getPlayersByTeam(bufalosTeam.equipo_id);
    const existingTests = await supabaseService.getPhysicalTests();

    if (existingTests.length === 0 && players.length > 0) {
      console.log('📊 Creating sample physical tests...');
      
      const testTypes = [
        { tipo: 'salto_vertical', unidad: 'cm', range: [45, 65] },
        { tipo: 'velocidad_20m', unidad: 'seg', range: [3.0, 3.8] },
        { tipo: 'agilidad_t', unidad: 'seg', range: [9.5, 11.5] },
        { tipo: 'fuerza_piernas', unidad: 'kg', range: [80, 120] }
      ];

      for (const player of players.slice(0, 4)) { // First 4 players
        for (const testType of testTypes) {
          const randomValue = testType.range[0] + Math.random() * (testType.range[1] - testType.range[0]);
          const roundedValue = testType.unidad === 'seg' ? Math.round(randomValue * 100) / 100 : Math.round(randomValue);

          await supabaseService.createPhysicalTest({
            jugador_id: player.jugador_id,
            tipo_test: testType.tipo,
            valor: roundedValue,
            unidad: testType.unidad,
            fecha_test: '2024-01-15',
            condiciones: 'pre_temporada',
            evaluador: 'Dr. Juan Pérez'
          });
        }
      }
    }

    // Create a sample competition
    const { supabase } = supabaseService as any;
    const { data: existingCompetition } = await supabase
      .from('competencias')
      .select('*')
      .limit(1)
      .single();

    let competition;
    if (!existingCompetition) {
      console.log('🏆 Creating sample competition...');
      const orgId = await supabaseService.getUserOrg();
      
      const { data, error } = await supabase
        .from('competencias')
        .insert({
          org_id: orgId,
          nombre: 'Liga Nacional Femenil 2024-2025',
          tipo: 'Liga',
          nivel: 'Primera División',
          temporada: '2024-2025',
          fecha_inicio: '2024-09-01',
          fecha_fin: '2025-05-31',
          formato: 'Mejor de 5 sets'
        })
        .select()
        .single();

      if (error) throw error;
      competition = data;
    } else {
      competition = existingCompetition;
    }

    console.log('✅ Demo data initialization completed!');
    console.log(`📋 Organization: ${org.nombre}`);
    console.log(`🏐 Team: ${bufalosTeam.nombre} (${players.length} players)`);
    console.log(`🏆 Competition: ${competition?.nombre || 'Liga Nacional'}`);

    return {
      organization: org,
      team: bufalosTeam,
      players,
      competition
    };

  } catch (error) {
    console.error('❌ Error initializing demo data:', error);
    throw error;
  }
}

// Utility function to create a sample match
export async function createSampleMatch() {
  try {
    const teams = await supabaseService.getTeams();
    if (teams.length === 0) {
      throw new Error('No teams found. Initialize demo data first.');
    }

    const bufalosTeam = teams[0];
    const players = await supabaseService.getPlayersByTeam(bufalosTeam.equipo_id);

    if (players.length < 6) {
      throw new Error('Not enough players to create a match. Need at least 6 players.');
    }

    // Create a fictional opponent team
    const opponentTeam = await supabaseService.createTeam({
      nombre: 'Águilas Doradas',
      temporada: '2024-2025',
      categoria: 'Primera División',
      color_primario: '#DC2626',
      color_secundario: '#FCD34D'
    });

    // Create starting rotations
    const startingPlayers = players.slice(0, 6);
    const libero = players.find(p => p.es_libero);

    const rotacionLocal = {
      p1_jugador_id: startingPlayers[0].jugador_id,
      p2_jugador_id: startingPlayers[1].jugador_id,
      p3_jugador_id: startingPlayers[2].jugador_id,
      p4_jugador_id: startingPlayers[3].jugador_id,
      p5_jugador_id: startingPlayers[4].jugador_id,
      p6_jugador_id: startingPlayers[5].jugador_id,
      libero_jugador_id: libero?.jugador_id
    };

    // Create match
    const match = await supabaseService.createMatch({
      equipo_local_id: bufalosTeam.equipo_id,
      equipo_visitante_id: opponentTeam.equipo_id,
      fecha: new Date().toISOString(),
      sede: 'Gimnasio Municipal',
      mejor_de: 5,
      arbitro_principal: 'María Elena Rodríguez',
      rotacion_inicial_local: rotacionLocal,
      rotacion_inicial_visitante: rotacionLocal, // Same for demo
      equipo_que_saca: 'local'
    });

    console.log('✅ Sample match created:', match.partido_id);
    return match;

  } catch (error) {
    console.error('❌ Error creating sample match:', error);
    throw error;
  }
}