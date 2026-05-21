// Edge Function: Manage Substitution
// Handles player substitutions with volleyball rules validation
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface SubstitutionRequest {
  set_id: string;
  equipo_id: string;
  entra_jugador_id: string;
  sale_jugador_id: string;
  posicion: number; // 1-6
  rally_numero?: number;
  motivo?: 'tactical' | 'injury' | 'performance' | 'rotation' | 'disciplinary';
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body: SubstitutionRequest = await req.json();

    // Validate substitution rules
    const validation = await validateSubstitution(supabase, body);
    if (!validation.valid) {
      return new Response(JSON.stringify({ 
        error: validation.error,
        warnings: validation.warnings 
      }), { status: 400 });
    }

    // Get current rotations to update
    const { data: rotacionActual } = await supabase
      .from("rotacion_inicial")
      .select("*")
      .eq("set_id", body.set_id)
      .eq("equipo_id", body.equipo_id)
      .single();

    if (!rotacionActual) {
      return new Response(JSON.stringify({ error: "No rotation found for this set" }), { status: 404 });
    }

    // Check if it's a libero substitution
    const { data: jugadores } = await supabase
      .from("jugador_equipo")
      .select("jugador_id, es_libero")
      .in("jugador_id", [body.entra_jugador_id, body.sale_jugador_id])
      .eq("equipo_id", body.equipo_id);

    const entraJugador = jugadores?.find(j => j.jugador_id === body.entra_jugador_id);
    const saleJugador = jugadores?.find(j => j.jugador_id === body.sale_jugador_id);
    const esLibero = entraJugador?.es_libero || saleJugador?.es_libero || false;

    // Create substitution record
    const { data: sustitucion, error: subError } = await supabase
      .from("sustituciones")
      .insert({
        set_id: body.set_id,
        equipo_id: body.equipo_id,
        rally_numero: body.rally_numero,
        entra_jugador_id: body.entra_jugador_id,
        sale_jugador_id: body.sale_jugador_id,
        posicion: body.posicion,
        es_libero: esLibero,
        motivo: body.motivo
      })
      .select()
      .single();

    if (subError) {
      return new Response(JSON.stringify({ error: subError.message }), { status: 400 });
    }

    // Update rotation
    const positionField = `p${body.posicion}_jugador_id` as keyof typeof rotacionActual;
    const updateData = {
      [positionField]: body.entra_jugador_id
    };

    // If it's a libero, also update libero field
    if (esLibero) {
      updateData.libero_jugador_id = entraJugador?.es_libero ? body.entra_jugador_id : body.sale_jugador_id;
    }

    const { error: rotacionError } = await supabase
      .from("rotacion_inicial")
      .update(updateData)
      .eq("rotacion_inicial_id", rotacionActual.rotacion_inicial_id);

    if (rotacionError) {
      return new Response(JSON.stringify({ error: rotacionError.message }), { status: 400 });
    }

    // Update substitution count in set
    const { data: setActual } = await supabase
      .from("sets")
      .select("sustituciones_local, sustituciones_visitante, partido_id")
      .eq("set_id", body.set_id)
      .single();

    if (setActual) {
      const { data: partidoInfo } = await supabase
        .from("partidos")
        .select("equipo_local_id")
        .eq("partido_id", setActual.partido_id)
        .single();

      const isLocal = body.equipo_id === partidoInfo?.equipo_local_id;
      const currentSubs = isLocal ? setActual.sustituciones_local : setActual.sustituciones_visitante;
      
      const updateField = isLocal ? 'sustituciones_local' : 'sustituciones_visitante';
      await supabase
        .from("sets")
        .update({ [updateField]: currentSubs + 1 })
        .eq("set_id", body.set_id);
    }

    // Get updated rotation info for response
    const { data: rotacionActualizada } = await supabase
      .from("rotacion_inicial")
      .select(`
        *,
        p1_jugador:jugadores!rotacion_inicial_p1_jugador_id_fkey(jugador_id, nombre),
        p2_jugador:jugadores!rotacion_inicial_p2_jugador_id_fkey(jugador_id, nombre),
        p3_jugador:jugadores!rotacion_inicial_p3_jugador_id_fkey(jugador_id, nombre),
        p4_jugador:jugadores!rotacion_inicial_p4_jugador_id_fkey(jugador_id, nombre),
        p5_jugador:jugadores!rotacion_inicial_p5_jugador_id_fkey(jugador_id, nombre),
        p6_jugador:jugadores!rotacion_inicial_p6_jugador_id_fkey(jugador_id, nombre),
        libero_jugador:jugadores!rotacion_inicial_libero_jugador_id_fkey(jugador_id, nombre)
      `)
      .eq("rotacion_inicial_id", rotacionActual.rotacion_inicial_id)
      .single();

    return new Response(JSON.stringify({ 
      success: true, 
      sustitucion,
      rotacion_actualizada: rotacionActualizada,
      warnings: validation.warnings
    }), {
      headers: { "content-type": "application/json" },
    });

  } catch (error) {
    console.error("Error managing substitution:", error);
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: error.message 
    }), { status: 500 });
  }
});

async function validateSubstitution(
  supabase: any, 
  req: SubstitutionRequest
): Promise<ValidationResult> {
  const warnings: string[] = [];

  // Check substitution count for the set
  const { data: setInfo } = await supabase
    .from("sets")
    .select("sustituciones_local, sustituciones_visitante, partido_id")
    .eq("set_id", req.set_id)
    .single();

  if (!setInfo) {
    return { valid: false, error: "Set not found" };
  }

  const { data: partidoInfo } = await supabase
    .from("partidos")
    .select("equipo_local_id")
    .eq("partido_id", setInfo.partido_id)
    .single();

  const isLocal = req.equipo_id === partidoInfo?.equipo_local_id;
  const currentSubs = isLocal ? setInfo.sustituciones_local : setInfo.sustituciones_visitante;

  // Maximum 6 substitutions per team per set
  if (currentSubs >= 6) {
    return { valid: false, error: "Maximum substitutions (6) reached for this set" };
  }

  // Check if players exist in team
  const { data: jugadoresEquipo } = await supabase
    .from("jugador_equipo")
    .select("jugador_id, es_libero, activo")
    .eq("equipo_id", req.equipo_id)
    .in("jugador_id", [req.entra_jugador_id, req.sale_jugador_id]);

  if (!jugadoresEquipo || jugadoresEquipo.length !== 2) {
    return { valid: false, error: "One or both players not found in team" };
  }

  const entraJugador = jugadoresEquipo.find(j => j.jugador_id === req.entra_jugador_id);
  const saleJugador = jugadoresEquipo.find(j => j.jugador_id === req.sale_jugador_id);

  if (!entraJugador?.activo || !saleJugador?.activo) {
    return { valid: false, error: "One or both players are not active" };
  }

  // Check if incoming player is already on court
  const { data: rotacionActual } = await supabase
    .from("rotacion_inicial")
    .select("*")
    .eq("set_id", req.set_id)
    .eq("equipo_id", req.equipo_id)
    .single();

  if (rotacionActual) {
    const jugadoresEnCancha = [
      rotacionActual.p1_jugador_id,
      rotacionActual.p2_jugador_id,
      rotacionActual.p3_jugador_id,
      rotacionActual.p4_jugador_id,
      rotacionActual.p5_jugador_id,
      rotacionActual.p6_jugador_id
    ];

    if (jugadoresEnCancha.includes(req.entra_jugador_id)) {
      return { valid: false, error: "Incoming player is already on court" };
    }

    const positionField = `p${req.posicion}_jugador_id` as keyof typeof rotacionActual;
    if (rotacionActual[positionField] !== req.sale_jugador_id) {
      return { valid: false, error: "Outgoing player is not in the specified position" };
    }
  }

  // Libero special rules
  if (entraJugador?.es_libero || saleJugador?.es_libero) {
    // Libero can only substitute back court players (positions 1, 6, 5)
    if (![1, 5, 6].includes(req.posicion)) {
      return { valid: false, error: "Libero can only substitute back court players (positions 1, 5, 6)" };
    }
    
    warnings.push("Libero substitution - special rules apply");
  }

  // Check substitution history for re-entry rules
  const { data: sustitucionesAnteriores } = await supabase
    .from("sustituciones")
    .select("entra_jugador_id, sale_jugador_id")
    .eq("set_id", req.set_id)
    .eq("equipo_id", req.equipo_id);

  if (sustitucionesAnteriores) {
    // A player can only re-enter for the player they substituted for
    const jugadorSustituido = sustitucionesAnteriores.find(
      s => s.entra_jugador_id === req.sale_jugador_id
    );
    
    if (jugadorSustituido && jugadorSustituido.sale_jugador_id !== req.entra_jugador_id) {
      return { 
        valid: false, 
        error: "Player can only return to substitute for the player they originally replaced" 
      };
    }
  }

  return { valid: true, warnings };
}