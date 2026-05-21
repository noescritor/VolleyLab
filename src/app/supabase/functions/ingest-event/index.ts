// Edge Function: Ingest Event
// Inserts rally events and automatically creates analytical facts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface IngestEventRequest {
  rally_id: string;
  secuencia: number;
  tipo_evento: "saque" | "recepcion" | "colocacion" | "ataque" | "bloqueo" | "defensa" | "error" | "falta";
  equipo_id?: string;
  jugador_id?: string;
  zona_origen?: string;
  zona_objetivo?: string;
  resultado?: string;
  velocidad_kmh?: number;
  recepcion_calidad?: number;
  altura_red_cm?: number;
  tiempo_contacto_ms?: number;
  coordenada_x?: number;
  coordenada_y?: number;
  tags?: Record<string, unknown>;
}

interface EndRallyRequest {
  rally_id: string;
  equipo_anota_id: string;
  causa_punto: string;
  duracion_seg?: number;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "event";

    if (action === "event") {
      // Insert event
      const body: IngestEventRequest = await req.json();

      const { data: evento, error: evError } = await supabase
        .from("eventos")
        .insert({
          rally_id: body.rally_id,
          secuencia: body.secuencia,
          tipo_evento: body.tipo_evento,
          equipo_id: body.equipo_id,
          jugador_id: body.jugador_id,
          zona_origen: body.zona_origen,
          zona_objetivo: body.zona_objetivo,
          resultado: body.resultado,
          velocidad_kmh: body.velocidad_kmh,
          recepcion_calidad: body.recepcion_calidad,
          altura_red_cm: body.altura_red_cm,
          tiempo_contacto_ms: body.tiempo_contacto_ms,
          coordenada_x: body.coordenada_x,
          coordenada_y: body.coordenada_y,
          tags: body.tags ?? null,
        })
        .select()
        .single();

      if (evError) {
        return new Response(JSON.stringify({ error: evError.message }), { status: 400 });
      }

      // If it's a serve, insert into hechos_saque for analytics
      if (body.tipo_evento === "saque") {
        const { data: rallyInfo } = await supabase
          .from("rallies")
          .select(`
            rally_id, 
            rotacion_local, 
            rotacion_visitante,
            punto_local,
            punto_visitante,
            sets(numero, partido_id)
          `)
          .eq("rally_id", body.rally_id)
          .single();

        if (rallyInfo) {
          const setData = rallyInfo.sets as any;
          
          await supabase.from("hechos_saque").insert({
            partido_id: setData.partido_id,
            set_num: setData.numero,
            rally_id: body.rally_id,
            equipo_id: body.equipo_id,
            jugador_id: body.jugador_id,
            tipo_saque: body.tags?.["tipo_saque"] as string ?? null,
            zona_origen: body.zona_origen,
            zona_objetivo: body.zona_objetivo,
            velocidad_kmh: body.velocidad_kmh,
            recepcion_calidad: body.recepcion_calidad,
            resultado: body.resultado,
            rotacion_propia: rallyInfo.rotacion_local,
            rotacion_rival: rallyInfo.rotacion_visitante,
            marcador_local: rallyInfo.punto_local,
            marcador_visitante: rallyInfo.punto_visitante,
            p_ganar_rally_post_saque: null, // Calculate later
            punto_para_nosotros: null // Calculate when rally ends
          });
        }
      }

      return new Response(JSON.stringify({ success: true, evento }), {
        headers: { "content-type": "application/json" },
      });

    } else if (action === "end-rally") {
      // End rally and update score
      const body: EndRallyRequest = await req.json();

      // Get current rally and set info
      const { data: rallyInfo } = await supabase
        .from("rallies")
        .select(`
          rally_id,
          numero,
          equipo_saca_id,
          jugador_saca_id,
          sets(set_id, numero, puntos_local, puntos_visitante, partido_id)
        `)
        .eq("rally_id", body.rally_id)
        .single();

      if (!rallyInfo) {
        return new Response(JSON.stringify({ error: "Rally not found" }), { status: 404 });
      }

      const setData = rallyInfo.sets as any;
      
      // Determine new score
      const { data: partidoInfo } = await supabase
        .from("partidos")
        .select("equipo_local_id, equipo_visitante_id")
        .eq("partido_id", setData.partido_id)
        .single();

      const isLocalPoint = body.equipo_anota_id === partidoInfo?.equipo_local_id;
      const newPuntoLocal = setData.puntos_local + (isLocalPoint ? 1 : 0);
      const newPuntoVisitante = setData.puntos_visitante + (isLocalPoint ? 0 : 1);

      // Update rally with final info
      await supabase
        .from("rallies")
        .update({
          equipo_anota_id: body.equipo_anota_id,
          causa_punto: body.causa_punto,
          punto_local: newPuntoLocal,
          punto_visitante: newPuntoVisitante,
          duracion_seg: body.duracion_seg
        })
        .eq("rally_id", body.rally_id);

      // Update set score
      await supabase
        .from("sets")
        .update({
          puntos_local: newPuntoLocal,
          puntos_visitante: newPuntoVisitante
        })
        .eq("set_id", setData.set_id);

      // Check if set is won
      const targetScore = setData.numero === 5 ? 15 : 25;
      let ganadorEquipoId = null;
      
      if (newPuntoLocal >= targetScore && newPuntoLocal - newPuntoVisitante >= 2) {
        ganadorEquipoId = partidoInfo?.equipo_local_id;
      } else if (newPuntoVisitante >= targetScore && newPuntoVisitante - newPuntoLocal >= 2) {
        ganadorEquipoId = partidoInfo?.equipo_visitante_id;
      }

      if (ganadorEquipoId) {
        await supabase
          .from("sets")
          .update({ 
            ganador_equipo_id: ganadorEquipoId,
            finalizado_at: new Date().toISOString()
          })
          .eq("set_id", setData.set_id);

        // Update match sets won count
        const { data: setsGanados } = await supabase
          .from("sets")
          .select("ganador_equipo_id")
          .eq("partido_id", setData.partido_id)
          .not("ganador_equipo_id", "is", null);

        const setsLocal = setsGanados?.filter(s => s.ganador_equipo_id === partidoInfo?.equipo_local_id).length || 0;
        const setsVisitante = setsGanados?.filter(s => s.ganador_equipo_id === partidoInfo?.equipo_visitante_id).length || 0;

        await supabase
          .from("partidos")
          .update({
            sets_ganados_local: setsLocal,
            sets_ganados_visitante: setsVisitante
          })
          .eq("partido_id", setData.partido_id);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        rally_finalizado: true,
        set_ganado: !!ganadorEquipoId,
        ganador_equipo_id: ganadorEquipoId,
        score: { local: newPuntoLocal, visitante: newPuntoVisitante }
      }), {
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });

  } catch (error) {
    console.error("Error in ingest-event:", error);
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: error.message 
    }), { status: 500 });
  }
});