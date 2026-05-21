// Edge Function: Create Match
// Creates a complete match with initial setup
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CreateMatchRequest {
  equipo_local_id: string;
  equipo_visitante_id: string;
  competencia_id?: string;
  fecha: string;
  sede?: string;
  mejor_de: 3 | 5;
  arbitro_principal?: string;
  rotacion_inicial_local: {
    p1_jugador_id: string;
    p2_jugador_id: string;
    p3_jugador_id: string;
    p4_jugador_id: string;
    p5_jugador_id: string;
    p6_jugador_id: string;
    libero_jugador_id?: string;
  };
  rotacion_inicial_visitante: {
    p1_jugador_id: string;
    p2_jugador_id: string;
    p3_jugador_id: string;
    p4_jugador_id: string;
    p5_jugador_id: string;
    p6_jugador_id: string;
    libero_jugador_id?: string;
  };
  equipo_que_saca: 'local' | 'visitante';
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body: CreateMatchRequest = await req.json();

    // Get user's org_id
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401 });
    }

    const userSupabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: userData } = await userSupabase.auth.getUser();
    if (!userData.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { data: orgMember } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", userData.user.id)
      .eq("activo", true)
      .single();

    if (!orgMember) {
      return new Response("User not associated with any organization", { status: 403 });
    }

    // Start transaction
    const { data: partido, error: partidoError } = await supabase
      .from("partidos")
      .insert({
        org_id: orgMember.org_id,
        equipo_local_id: body.equipo_local_id,
        equipo_visitante_id: body.equipo_visitante_id,
        competencia_id: body.competencia_id,
        fecha: body.fecha,
        sede: body.sede,
        mejor_de: body.mejor_de,
        arbitro_principal: body.arbitro_principal,
        estado: 'programado'
      })
      .select()
      .single();

    if (partidoError) {
      return new Response(JSON.stringify({ error: partidoError.message }), { status: 400 });
    }

    // Create first set
    const { data: primerSet, error: setError } = await supabase
      .from("sets")
      .insert({
        partido_id: partido.partido_id,
        numero: 1
      })
      .select()
      .single();

    if (setError) {
      return new Response(JSON.stringify({ error: setError.message }), { status: 400 });
    }

    // Create initial rotations
    const rotacionLocalData = {
      set_id: primerSet.set_id,
      equipo_id: body.equipo_local_id,
      ...body.rotacion_inicial_local,
      equipo_que_saca: body.equipo_que_saca === 'local'
    };

    const rotacionVisitanteData = {
      set_id: primerSet.set_id,
      equipo_id: body.equipo_visitante_id,
      ...body.rotacion_inicial_visitante,
      equipo_que_saca: body.equipo_que_saca === 'visitante'
    };

    const { error: rotacionError } = await supabase
      .from("rotacion_inicial")
      .insert([rotacionLocalData, rotacionVisitanteData]);

    if (rotacionError) {
      return new Response(JSON.stringify({ error: rotacionError.message }), { status: 400 });
    }

    // Update match status to 'en_curso'
    await supabase
      .from("partidos")
      .update({ estado: 'en_curso' })
      .eq("partido_id", partido.partido_id);

    // Return complete match data
    const { data: matchCompleto } = await supabase
      .from("partidos")
      .select(`
        *,
        equipo_local:equipos!partidos_equipo_local_id_fkey(equipo_id, nombre),
        equipo_visitante:equipos!partidos_equipo_visitante_id_fkey(equipo_id, nombre),
        sets(
          *,
          rotacion_inicial(*)
        )
      `)
      .eq("partido_id", partido.partido_id)
      .single();

    return new Response(JSON.stringify({ 
      success: true, 
      partido: matchCompleto 
    }), {
      headers: { "content-type": "application/json" },
    });

  } catch (error) {
    console.error("Error creating match:", error);
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: error.message 
    }), { status: 500 });
  }
});