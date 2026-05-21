import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-08892534/health", (c) => {
  return c.json({ status: "ok" });
});

// Players endpoints
app.get("/make-server-08892534/players", async (c) => {
  try {
    const players = await kv.getByPrefix("player:");
    return c.json({ players: players || [] });
  } catch (error) {
    console.error("Error fetching players:", error);
    return c.json({ error: "Failed to fetch players" }, 500);
  }
});

app.post("/make-server-08892534/players", async (c) => {
  try {
    const playerData = await c.req.json();
    const playerId = `player:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    const player = {
      id: playerId,
      ...playerData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(playerId, player);
    return c.json({ player });
  } catch (error) {
    console.error("Error creating player:", error);
    return c.json({ error: "Failed to create player" }, 500);
  }
});

app.put("/make-server-08892534/players/:id", async (c) => {
  try {
    const playerId = c.req.param("id");
    const updatedData = await c.req.json();
    
    const existingPlayer = await kv.get(playerId);
    if (!existingPlayer) {
      return c.json({ error: "Player not found" }, 404);
    }
    
    const updatedPlayer = {
      ...existingPlayer,
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(playerId, updatedPlayer);
    return c.json({ player: updatedPlayer });
  } catch (error) {
    console.error("Error updating player:", error);
    return c.json({ error: "Failed to update player" }, 500);
  }
});

app.delete("/make-server-08892534/players/:id", async (c) => {
  try {
    const playerId = c.req.param("id");
    await kv.del(playerId);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting player:", error);
    return c.json({ error: "Failed to delete player" }, 500);
  }
});

// Matches endpoints
app.get("/make-server-08892534/matches", async (c) => {
  try {
    const matches = await kv.getByPrefix("match:");
    return c.json({ matches: matches || [] });
  } catch (error) {
    console.error("Error fetching matches:", error);
    return c.json({ error: "Failed to fetch matches" }, 500);
  }
});

app.post("/make-server-08892534/matches", async (c) => {
  try {
    const matchData = await c.req.json();
    const matchId = `match:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    const match = {
      id: matchId,
      ...matchData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(matchId, match);
    return c.json({ match });
  } catch (error) {
    console.error("Error creating match:", error);
    return c.json({ error: "Failed to create match" }, 500);
  }
});

app.put("/make-server-08892534/matches/:id", async (c) => {
  try {
    const matchId = c.req.param("id");
    const updatedData = await c.req.json();
    
    const existingMatch = await kv.get(matchId);
    if (!existingMatch) {
      return c.json({ error: "Match not found" }, 404);
    }
    
    const updatedMatch = {
      ...existingMatch,
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(matchId, updatedMatch);
    return c.json({ match: updatedMatch });
  } catch (error) {
    console.error("Error updating match:", error);
    return c.json({ error: "Failed to update match" }, 500);
  }
});

app.delete("/make-server-08892534/matches/:id", async (c) => {
  try {
    const matchId = c.req.param("id");
    await kv.del(matchId);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting match:", error);
    return c.json({ error: "Failed to delete match" }, 500);
  }
});

// Physical tests endpoints
app.get("/make-server-08892534/physical-tests", async (c) => {
  try {
    const tests = await kv.getByPrefix("test:");
    return c.json({ tests: tests || [] });
  } catch (error) {
    console.error("Error fetching physical tests:", error);
    return c.json({ error: "Failed to fetch physical tests" }, 500);
  }
});

app.post("/make-server-08892534/physical-tests", async (c) => {
  try {
    const testData = await c.req.json();
    const testId = `test:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    const test = {
      id: testId,
      ...testData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(testId, test);
    return c.json({ test });
  } catch (error) {
    console.error("Error creating physical test:", error);
    return c.json({ error: "Failed to create physical test" }, 500);
  }
});

app.put("/make-server-08892534/physical-tests/:id", async (c) => {
  try {
    const testId = c.req.param("id");
    const updatedData = await c.req.json();
    
    const existingTest = await kv.get(testId);
    if (!existingTest) {
      return c.json({ error: "Physical test not found" }, 404);
    }
    
    const updatedTest = {
      ...existingTest,
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(testId, updatedTest);
    return c.json({ test: updatedTest });
  } catch (error) {
    console.error("Error updating physical test:", error);
    return c.json({ error: "Failed to update physical test" }, 500);
  }
});

app.delete("/make-server-08892534/physical-tests/:id", async (c) => {
  try {
    const testId = c.req.param("id");
    await kv.del(testId);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting physical test:", error);
    return c.json({ error: "Failed to delete physical test" }, 500);
  }
});

// Sample data initialization endpoint
app.post("/make-server-08892534/init-sample-data", async (c) => {
  try {
    // Check if players already exist
    const existingPlayers = await kv.getByPrefix("player:");
    if (existingPlayers && existingPlayers.length > 0) {
      return c.json({ message: "Sample data already exists", players: existingPlayers });
    }

    // Sample players data - 8 jugadoras
    const samplePlayers = [
      // 2 Centrales
      {
        name: "Sofia Martínez",
        position: "Central",
        dominantHand: "Derecha",
        height: 185,
        weight: 72,
        wingspan: 195,
        reachStatic: 245,
        reachBlock: 315,
        reachAttack: 330,
        status: "Activo"
      },
      {
        name: "Isabella Rodriguez",
        position: "Central", 
        dominantHand: "Derecha",
        height: 188,
        weight: 75,
        wingspan: 198,
        reachStatic: 250,
        reachBlock: 320,
        reachAttack: 335,
        status: "Activo"
      },
      // 2 Puntas
      {
        name: "Camila Fernández",
        position: "Punta",
        dominantHand: "Izquierda",
        height: 178,
        weight: 65,
        wingspan: 185,
        reachStatic: 230,
        reachBlock: 295,
        reachAttack: 310,
        status: "Activo"
      },
      {
        name: "Valeria López",
        position: "Punta",
        dominantHand: "Derecha",
        height: 180,
        weight: 68,
        wingspan: 187,
        reachStatic: 235,
        reachBlock: 300,
        reachAttack: 315,
        status: "Activo"
      },
      // 1 Opuesto
      {
        name: "Antonella Silva",
        position: "Opuesto",
        dominantHand: "Derecha",
        height: 182,
        weight: 70,
        wingspan: 190,
        reachStatic: 240,
        reachBlock: 305,
        reachAttack: 325,
        status: "Activo"
      },
      // 2 Líberos
      {
        name: "Martina González",
        position: "Líbero",
        dominantHand: "Derecha",
        height: 168,
        weight: 58,
        wingspan: 170,
        reachStatic: 215,
        reachBlock: 270,
        reachAttack: 285,
        status: "Activo"
      },
      {
        name: "Renata Torres",
        position: "Líbero",
        dominantHand: "Izquierda",
        height: 165,
        weight: 55,
        wingspan: 168,
        reachStatic: 210,
        reachBlock: 265,
        reachAttack: 280,
        status: "Activo"
      },
      // 1 Colocador
      {
        name: "Bianca Herrera",
        position: "Colocador",
        dominantHand: "Derecha",
        height: 175,
        weight: 62,
        wingspan: 180,
        reachStatic: 225,
        reachBlock: 285,
        reachAttack: 300,
        status: "Activo"
      }
    ];

    // Create players in database
    const createdPlayers = [];
    for (const playerData of samplePlayers) {
      const playerId = `player:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
      const player = {
        id: playerId,
        ...playerData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await kv.set(playerId, player);
      createdPlayers.push(player);
      
      // Small delay to ensure unique timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Create sample matches
    const sampleMatches = [
      {
        opponent: "Club Deportivo Las Águilas",
        date: "2024-12-15",
        time: "19:00",
        venue: "Polideportivo Municipal Norte",
        matchType: "regular",
        notes: "Partido de liga regular - primera vuelta",
        result: "W",
        score: "3-1",
        sideOut: 68.5,
        transition: 52.3,
        players: createdPlayers.slice(0, 6).map(player => ({
          id: player.id,
          name: player.name,
          position: player.position,
          attacks: { 
            attempts: Math.floor(Math.random() * 30) + 15, 
            kills: Math.floor(Math.random() * 15) + 8, 
            errors: Math.floor(Math.random() * 5) + 1, 
            blocked: Math.floor(Math.random() * 3) + 1, 
            hitting: Math.random() * 40 + 20 
          },
          serves: { 
            attempts: Math.floor(Math.random() * 15) + 8, 
            aces: Math.floor(Math.random() * 4) + 1, 
            errors: Math.floor(Math.random() * 3) + 1, 
            effectiveness: Math.random() * 10 
          },
          reception: { 
            attempts: player.position === 'Líbero' || player.position === 'Punta' ? Math.floor(Math.random() * 20) + 10 : 0, 
            perfect: player.position === 'Líbero' || player.position === 'Punta' ? Math.floor(Math.random() * 12) + 6 : 0, 
            good: player.position === 'Líbero' || player.position === 'Punta' ? Math.floor(Math.random() * 6) + 2 : 0, 
            efficiency: player.position === 'Líbero' || player.position === 'Punta' ? Math.random() * 2 + 1.5 : 0 
          },
          blocks: { 
            stuffs: Math.floor(Math.random() * 3) + 1, 
            assists: Math.floor(Math.random() * 5) + 2, 
            participation: Math.floor(Math.random() * 8) + 3 
          }
        }))
      },
      {
        opponent: "Voleibol San Martín",
        date: "2024-12-20",
        time: "20:30",
        venue: "Club San Martín",
        matchType: "friendly",
        notes: "Partido amistoso de preparación",
        result: "L",
        score: "2-3",
        sideOut: 62.8,
        transition: 48.1,
        players: createdPlayers.slice(1, 7).map(player => ({
          id: player.id,
          name: player.name,
          position: player.position,
          attacks: { 
            attempts: Math.floor(Math.random() * 25) + 12, 
            kills: Math.floor(Math.random() * 12) + 6, 
            errors: Math.floor(Math.random() * 6) + 2, 
            blocked: Math.floor(Math.random() * 4) + 1, 
            hitting: Math.random() * 35 + 18 
          },
          serves: { 
            attempts: Math.floor(Math.random() * 12) + 6, 
            aces: Math.floor(Math.random() * 3) + 0, 
            errors: Math.floor(Math.random() * 4) + 1, 
            effectiveness: Math.random() * 8 
          },
          reception: { 
            attempts: player.position === 'Líbero' || player.position === 'Punta' ? Math.floor(Math.random() * 18) + 8 : 0, 
            perfect: player.position === 'Líbero' || player.position === 'Punta' ? Math.floor(Math.random() * 10) + 4 : 0, 
            good: player.position === 'Líbero' || player.position === 'Punta' ? Math.floor(Math.random() * 5) + 2 : 0, 
            efficiency: player.position === 'Líbero' || player.position === 'Punta' ? Math.random() * 2.5 + 1.2 : 0 
          },
          blocks: { 
            stuffs: Math.floor(Math.random() * 2) + 0, 
            assists: Math.floor(Math.random() * 4) + 1, 
            participation: Math.floor(Math.random() * 6) + 2 
          }
        }))
      }
    ];

    const createdMatches = [];
    for (const matchData of sampleMatches) {
      const matchId = `match:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
      const match = {
        id: matchId,
        ...matchData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await kv.set(matchId, match);
      createdMatches.push(match);
      
      // Small delay to ensure unique timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    return c.json({ 
      message: "Sample data created successfully", 
      players: createdPlayers,
      matches: createdMatches 
    });
  } catch (error) {
    console.error("Error creating sample data:", error);
    return c.json({ error: "Failed to create sample data" }, 500);
  }
});

// Live Match endpoints for Match Center
app.get("/make-server-08892534/live-matches", async (c) => {
  try {
    const liveMatches = await kv.getByPrefix("live_match:");
    return c.json({ matches: liveMatches || [] });
  } catch (error) {
    console.error("Error fetching live matches:", error);
    return c.json({ error: "Failed to fetch live matches" }, 500);
  }
});

app.get("/make-server-08892534/live-matches/:id", async (c) => {
  try {
    const matchId = c.req.param("id");
    const liveMatch = await kv.get(`live_match:${matchId}`);
    
    if (!liveMatch) {
      return c.json({ error: "Live match not found" }, 404);
    }
    
    return c.json({ match: liveMatch });
  } catch (error) {
    console.error("Error fetching live match:", error);
    return c.json({ error: "Failed to fetch live match" }, 500);
  }
});

app.post("/make-server-08892534/live-matches", async (c) => {
  try {
    const matchData = await c.req.json();
    const matchId = matchData.id || `live_match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const storedMatch = {
      id: matchId,
      name: `${matchData.match.localTeam} vs ${matchData.match.visitaTeam}`,
      match: matchData.match,
      lastUpdated: new Date().toISOString(),
      isActive: matchData.isActive || true,
      createdAt: new Date().toISOString()
    };
    
    await kv.set(`live_match:${matchId}`, storedMatch);
    return c.json({ match: storedMatch });
  } catch (error) {
    console.error("Error creating live match:", error);
    return c.json({ error: "Failed to create live match" }, 500);
  }
});

app.put("/make-server-08892534/live-matches/:id", async (c) => {
  try {
    const matchId = c.req.param("id");
    const updatedData = await c.req.json();
    
    const existingMatch = await kv.get(`live_match:${matchId}`);
    if (!existingMatch) {
      return c.json({ error: "Live match not found" }, 404);
    }
    
    const updatedMatch = {
      ...existingMatch,
      ...updatedData,
      lastUpdated: new Date().toISOString()
    };
    
    await kv.set(`live_match:${matchId}`, updatedMatch);
    return c.json({ match: updatedMatch });
  } catch (error) {
    console.error("Error updating live match:", error);
    return c.json({ error: "Failed to update live match" }, 500);
  }
});

app.delete("/make-server-08892534/live-matches/:id", async (c) => {
  try {
    const matchId = c.req.param("id");
    await kv.del(`live_match:${matchId}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting live match:", error);
    return c.json({ error: "Failed to delete live match" }, 500);
  }
});

Deno.serve(app.fetch);