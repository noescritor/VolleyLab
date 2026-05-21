import React, { useState, useEffect, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { AlertCircle, Play, Download, Brain, TrendingUp, Target } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../utils/AppContext';

declare global {
  interface Window {
    pyodide: any;
    loadPyodide: any;
  }
}

interface AnalysisResult {
  type: string;
  data: any;
  plot?: string;
  insights: string[];
  recommendations: string[];
}

export function PythonAnalytics() {
  const { state } = useApp();
  const [pyodideReady, setPyodideReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysisType, setAnalysisType] = useState('performance_trends');
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [pythonOutput, setPythonOutput] = useState('');
  const [activeTab, setActiveTab] = useState('insights');
  const pyodideRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    const initPyodide = async () => {
      try {
        if (!window.loadPyodide) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
          script.onload = async () => {
            if (!mounted) return;
            const pyodide = await window.loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/' });
            await pyodide.loadPackage(['numpy', 'pandas', 'matplotlib', 'scipy']);
            pyodideRef.current = pyodide;
            if (mounted) { setPyodideReady(true); toast.success('Python Analytics Ready!'); }
          };
          script.onerror = () => { if (mounted) toast.error('Failed to load Python environment'); };
          document.head.appendChild(script);
        }
      } catch (error) {
        if (mounted) toast.error('Error initializing Python environment');
      }
    };
    initPyodide();
    return () => { mounted = false; };
  }, []);

  const runAnalysis = async () => {
    if (!pyodideReady || !pyodideRef.current) { toast.error('Python environment not ready'); return; }
    setLoading(true);
    setPythonOutput('');
    try {
      const pyodide = pyodideRef.current;
      const playersData = JSON.stringify(state.players);
      const matchesData = JSON.stringify(state.matches);
      const testsData = JSON.stringify(state.physicalTests);

      const pythonCode = `
import json, pandas as pd, numpy as np
players_raw = json.loads('''${playersData}''')
matches_raw = json.loads('''${matchesData}''')
tests_raw = json.loads('''${testsData}''')
print("VolleyPro Analytics - Python Analysis Engine")
print(f"Data loaded: {len(players_raw)} players, {len(matches_raw)} matches, {len(tests_raw)} physical tests")
players_df = pd.DataFrame(players_raw) if players_raw else pd.DataFrame()
tests_df = pd.DataFrame(tests_raw) if tests_raw else pd.DataFrame()
analysis_results = {"type": "${analysisType}", "insights": [], "recommendations": [], "data": {}}
${getAnalysisCode(analysisType)}
if not players_df.empty:
    total_players = len(players_df)
    positions = players_df['position'].value_counts().to_dict() if 'position' in players_df.columns else {}
    analysis_results["insights"].extend([
        f"Total de {total_players} jugadores en la base de datos",
        f"Posiciones: {', '.join([f'{pos}: {count}' for pos, count in list(positions.items())[:3]])}" if positions else "Sin datos de posiciones",
        f"Datos fisicos disponibles para {len(tests_df)} mediciones" if not tests_df.empty else "Sin datos fisicos disponibles"
    ])
    analysis_results["recommendations"].extend([
        "Considera agregar mas tests fisicos para analisis mas profundos",
        "Registra mas partidos para tendencias historicas",
        "Actualiza regularmente los datos de rendimiento"
    ])
results_json = json.dumps(analysis_results, indent=2, default=str)
print(results_json)
`;
      pyodide.runPython(`
import sys
from io import StringIO
old_stdout = sys.stdout
sys.stdout = mystdout = StringIO()
      `);
      pyodide.runPython(pythonCode);
      pyodide.runPython(`
sys.stdout = old_stdout
output = mystdout.getvalue()
      `);
      const pyOutput = pyodide.globals.get('output');
      const resultsJson = pyodide.runPython(`
try:
    results_json
except NameError:
    import json
    json.dumps({"error": "Analysis failed", "insights": [], "recommendations": []})
      `);
      setPythonOutput(pyOutput);
      try {
        const analysisResults = JSON.parse(resultsJson);
        setResults(analysisResults);
        toast.success('Análisis completado exitosamente!');
      } catch {
        setResults({ type: analysisType, data: {}, insights: ['Error procesando resultados'], recommendations: ['Revisa los datos de entrada'] });
      }
    } catch (error) {
      toast.error('Error ejecutando análisis Python');
    } finally {
      setLoading(false);
    }
  };

  const downloadResults = () => {
    if (!results) return;
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `volleyball-analysis-${analysisType}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Resultados descargados');
  };

  function getAnalysisCode(type: string): string {
    switch (type) {
      case 'performance_trends': return `
if not players_df.empty and not tests_df.empty:
    if 'position' in players_df.columns:
        analysis_results["data"]["position_distribution"] = players_df.groupby('position').size().to_dict()
    if 'playerId' in tests_df.columns and 'value' in tests_df.columns:
        analysis_results["data"]["avg_performance_by_player"] = tests_df.groupby('playerId')['value'].mean().to_dict()
    analysis_results["insights"].append("Analisis de tendencias completado")
else:
    analysis_results["insights"].append("Datos insuficientes para analisis de tendencias")
`;
      case 'physical_analysis': return `
if not tests_df.empty:
    if 'testType' in tests_df.columns and 'value' in tests_df.columns:
        analysis_results["data"]["test_statistics"] = tests_df.groupby('testType')['value'].agg(['mean', 'std', 'min', 'max']).to_dict()
    analysis_results["insights"].append("Analisis fisico avanzado completado")
else:
    analysis_results["insights"].append("No hay datos de tests fisicos disponibles")
`;
      case 'position_optimization': return `
if not players_df.empty:
    if 'position' in players_df.columns:
        position_counts = players_df['position'].value_counts()
        analysis_results["data"]["position_distribution"] = position_counts.to_dict()
        analysis_results["data"]["position_percentages"] = (position_counts / len(players_df) * 100).to_dict()
        liberos = position_counts.get('Libero', 0)
        if liberos < 2:
            analysis_results["recommendations"].append("Considera entrenar mas jugadores como liberos")
    analysis_results["insights"].append("Analisis de optimizacion completado")
else:
    analysis_results["insights"].append("No hay datos de jugadores")
`;
      default: return `analysis_results["insights"].append("Tipo de analisis no reconocido")`;
    }
  }

  const tabs = [
    { key: 'insights', label: 'Insights'      },
    { key: 'data',     label: 'Datos'         },
    { key: 'output',   label: 'Python Output' },
  ];

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <Brain size={14} className="text-[#A191FF]" />
          <p className="text-[15px] font-semibold text-white">Análisis Avanzado con Python</p>
          <span className="text-label px-2 py-0.5 rounded-full border ml-2"
            style={pyodideReady
              ? { color: '#91FFB0', backgroundColor: 'rgba(145,255,176,0.08)', borderColor: 'rgba(145,255,176,0.20)' }
              : { color: 'rgba(255,255,255,0.30)', backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)' }}>
            {pyodideReady ? 'READY' : 'LOADING'}
          </span>
        </div>
        <p className="text-[12px] text-white/40 mb-4">Análisis estadístico con Python, NumPy, Pandas y Matplotlib</p>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Select value={analysisType} onValueChange={setAnalysisType}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-[13px] text-white">
                <SelectValue placeholder="Seleccionar análisis" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/[0.08]">
                <SelectItem value="performance_trends" className="text-[13px] text-white/70">
                  <div className="flex items-center gap-2"><TrendingUp size={12} /> Tendencias de Rendimiento</div>
                </SelectItem>
                <SelectItem value="physical_analysis" className="text-[13px] text-white/70">
                  <div className="flex items-center gap-2"><Target size={12} /> Análisis Físico Avanzado</div>
                </SelectItem>
                <SelectItem value="position_optimization" className="text-[13px] text-white/70">
                  <div className="flex items-center gap-2"><Brain size={12} /> Optimización de Posiciones</div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <button onClick={runAnalysis} disabled={!pyodideReady || loading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#A191FF] hover:bg-[#B8ADFF] text-black text-label font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto">
            <Play size={13} />
            {loading ? 'Analizando…' : 'Ejecutar Análisis'}
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-5 py-6 space-y-3">
          {[3, 2, 4].map((w, i) => (
            <div key={i} className="h-3 rounded-full bg-white/[0.06] animate-pulse" style={{ width: `${w * 20}%` }} />
          ))}
          <div className="h-24 rounded-lg bg-white/[0.04] animate-pulse mt-2" />
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-white/[0.06] flex gap-0">
            {tabs.map(({ key, label }) => (
              <button key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-label border-b-2 transition-colors ${
                  activeTab === key ? 'border-[#A191FF] text-[#A191FF]' : 'border-transparent text-white/30 hover:text-white/60'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'insights' && (
            <div className="px-5 py-4 space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-semibold text-white">Insights del Análisis</p>
                <button onClick={downloadResults}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/[0.08] text-label text-white/40 hover:text-white/70 hover:border-white/20 transition-colors">
                  <Download size={11} /> Descargar
                </button>
              </div>

              <div>
                <p className="text-label text-white/40 mb-3">INSIGHTS CLAVE</p>
                <ul className="space-y-2">
                  {results.insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <AlertCircle size={13} className="mt-0.5 shrink-0" style={{ color: '#91CAFF' }} />
                      <span className="text-[13px] text-white/70">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-label text-white/40 mb-3">RECOMENDACIONES</p>
                <ul className="space-y-2">
                  {results.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Target size={13} className="mt-0.5 shrink-0" style={{ color: '#91FFB0' }} />
                      <span className="text-[13px] text-white/70">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="px-5 py-4">
              <p className="text-label text-white/40 mb-3">DATOS PROCESADOS</p>
              <pre className="bg-black/50 border border-white/[0.06] p-4 rounded-lg overflow-auto text-[11px] text-white/60 font-mono">
                {JSON.stringify(results.data, null, 2)}
              </pre>
            </div>
          )}

          {activeTab === 'output' && (
            <div className="px-5 py-4">
              <p className="text-label text-white/40 mb-3">PYTHON CONSOLE OUTPUT</p>
              <pre className="bg-black p-4 rounded-lg overflow-auto text-[11px] font-mono" style={{ color: '#91FFB0' }}>
                {pythonOutput || 'No output yet…'}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Loading status */}
      {!pyodideReady && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-5 py-4">
          <div className="flex items-center gap-2 text-white/40">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#A191FF] border-t-transparent" />
            <span className="text-[13px]">Cargando entorno Python… Esto puede tomar unos momentos.</span>
          </div>
        </div>
      )}
    </div>
  );
}
