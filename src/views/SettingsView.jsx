import { useState, useRef } from 'react';
import { parseJefitCSV } from '../lib/jefit-import';
import { generateClaudeSummary } from '../lib/claude-export';
import { exportAllData, importAllData, clearAllSessions, bulkAddSessions } from '../lib/storage';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function SettingsView({ sessions, settings, onSettingsChange, onDataChange, showToast }) {
  const [exportPreview, setExportPreview] = useState('Toca el botón para generar el resumen…');
  const fileInputRef = useRef(null);
  const importDataRef = useRef(null);

  const handleExportClaude = async () => {
    const summary = generateClaudeSummary(sessions, settings);
    setExportPreview(summary);
    try {
      await navigator.clipboard.writeText(summary);
      showToast('Copiado al portapapeles ✓');
    } catch {
      showToast('Selecciona y copia manualmente');
    }
  };

  const handleImportJefit = () => {
    fileInputRef.current?.click();
  };

  const handleJefitFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const sessions = parseJefitCSV(text);
      const added = await bulkAddSessions(sessions);
      showToast(`Importadas ${added} sesiones ✓`);
      onDataChange();
    } catch (err) {
      console.error(err);
      showToast('Error: ' + err.message);
    }
    e.target.value = '';
  };

  const handleExportData = async () => {
    const data = await exportAllData();
    const json = JSON.stringify(data, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      showToast('Datos copiados al portapapeles ✓');
    } catch {
      // Fallback: descargar
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `iron-log-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    }
  };

  const handleImportData = () => {
    importDataRef.current?.click();
  };

  const handleImportDataFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('Esto SOBRESCRIBIRÁ todos tus datos actuales. ¿Continuar?')) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importAllData(data);
      showToast('Datos importados ✓');
      onDataChange();
    } catch (err) {
      showToast('Error: ' + err.message);
    }
    e.target.value = '';
  };

  const handleReset = async () => {
    if (!confirm('¿Borrar TODAS las sesiones? Esto no se puede deshacer.')) return;
    if (!confirm('Última confirmación: ¿seguro?')) return;
    await clearAllSessions();
    showToast('Datos borrados');
    onDataChange();
  };

  const sortedDates = sessions.length > 0
    ? [...sessions].sort((a, b) => a.date.localeCompare(b.date))
    : [];

  return (
    <div className="page">
      <input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        onChange={handleJefitFile}
        style={{ display: 'none' }}
      />
      <input
        type="file"
        accept=".json"
        ref={importDataRef}
        onChange={handleImportDataFile}
        style={{ display: 'none' }}
      />

      <div className="section-label">Para Claude</div>
      <button className="primary-btn" onClick={handleExportClaude}>
        Copiar resumen para Claude
      </button>
      <div className="export-preview">{exportPreview}</div>

      <div className="section-label" style={{ marginTop: 28 }}>Configuración</div>
      <div className="setting-card">
        <div className="setting-row">
          <div className="setting-label">Peso corporal</div>
          <input
            type="number"
            className="setting-input"
            value={settings.bodyWeight}
            onChange={e => onSettingsChange({ ...settings, bodyWeight: parseFloat(e.target.value) || 0 })}
            step="0.1"
          />
        </div>
        <div className="setting-row">
          <div className="setting-label">Fase actual</div>
          <select
            className="setting-select"
            value={settings.phase}
            onChange={e => onSettingsChange({ ...settings, phase: e.target.value })}
          >
            <option value="bulk">Volumen</option>
            <option value="cut">Definición</option>
          </select>
        </div>
        <div className="setting-row">
          <div className="setting-label">Inicio definición</div>
          <input
            type="date"
            className="setting-input"
            style={{ width: 140 }}
            value={settings.cutStart}
            onChange={e => onSettingsChange({ ...settings, cutStart: e.target.value })}
          />
        </div>
      </div>

      <div className="section-label" style={{ marginTop: 28 }}>Datos</div>
      <button className="secondary-btn" onClick={handleImportJefit}>
        Importar histórico Jefit (CSV)
      </button>
      <button className="secondary-btn" onClick={handleExportData}>
        Exportar todos los datos (JSON)
      </button>
      <button className="secondary-btn" onClick={handleImportData}>
        Importar datos (JSON)
      </button>
      <button className="secondary-btn danger-btn" onClick={handleReset}>
        Borrar todos los datos
      </button>

      <div className="section-label" style={{ marginTop: 28 }}>Estado</div>
      <div className="setting-card">
        <div className="setting-row">
          <div className="setting-label">Sesiones registradas</div>
          <div className="setting-value">{sessions.length}</div>
        </div>
        <div className="setting-row">
          <div className="setting-label">Primer registro</div>
          <div className="setting-value">{sortedDates.length > 0 ? formatDate(sortedDates[0].date) : '—'}</div>
        </div>
        <div className="setting-row">
          <div className="setting-label">Último registro</div>
          <div className="setting-value">{sortedDates.length > 0 ? formatDate(sortedDates[sortedDates.length - 1].date) : '—'}</div>
        </div>
      </div>

      <div className="section-label" style={{ marginTop: 28 }}>Reglas de progresión</div>
      <div className="setting-card" style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--text-dim)' }}>
        <div style={{ marginBottom: 10 }}><strong style={{ color: 'var(--text)' }}>Top set (1×4-6 reps):</strong></div>
        <div>RPE ≤7 → +2.5kg próxima sesión</div>
        <div>RPE 8 → +1.25kg</div>
        <div>RPE 8.5-9 → mantener</div>
        <div>RPE 9.5-10 o reps&lt;4 → -2.5kg</div>
        <div style={{ margin: '12px 0 10px' }}><strong style={{ color: 'var(--text)' }}>Back offs (3×6-8 reps):</strong></div>
        <div>3 series a 8 reps → +2.5kg</div>
        <div>Alguna serie &lt;6 reps → -2.5kg</div>
        <div>Resto → mantener</div>
        <div style={{ margin: '12px 0 10px' }}><strong style={{ color: 'var(--text)' }}>Compuestos (RIR 0-1):</strong></div>
        <div>Todas las series al techo → +2.5kg</div>
        <div>Alguna por debajo del rango → -2.5kg</div>
        <div style={{ margin: '12px 0 10px' }}><strong style={{ color: 'var(--text)' }}>Aislamiento (al fallo):</strong></div>
        <div>Todas las series al techo → +1.25kg</div>
        <div style={{ margin: '12px 0 10px' }}><strong style={{ color: 'var(--text)' }}>En definición:</strong></div>
        <div>Todos los ejercicios mantienen peso (prioridad: no perder masa)</div>
      </div>
    </div>
  );
}
