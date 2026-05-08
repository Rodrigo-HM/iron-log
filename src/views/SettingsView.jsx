import { useRef } from 'react';
import { parseJefitCSV } from '../lib/jefit-import';
import { exportAllData, importAllData, clearAllSessions, bulkAddSessions } from '../lib/storage';
import { supabase } from '../lib/supabase';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function SettingsView({ sessions, settings, onSettingsChange, onDataChange, showToast }) {
  const importRef = useRef(null);

  const handleImport = () => importRef.current?.click();

  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (file.name.endsWith('.csv')) {
        const parsed = parseJefitCSV(text);
        const added = await bulkAddSessions(parsed);
        showToast(`Importadas ${added} sesiones ✓`);
      } else {
        if (!confirm('Esto SOBRESCRIBIRÁ todos tus datos actuales. ¿Continuar?')) return;
        const data = JSON.parse(text);
        await importAllData(data);
        showToast('Datos importados ✓');
      }
      onDataChange();
    } catch (err) {
      console.error(err);
      showToast('Error: ' + err.message);
    }
    e.target.value = '';
  };

  const handleExport = async () => {
    const data = await exportAllData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iron-log-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
        accept=".csv,.json"
        ref={importRef}
        onChange={handleImportFile}
        style={{ display: 'none' }}
      />

      <div className="section-label">Configuración</div>
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
      <button className="secondary-btn" onClick={handleImport}>
        Importar datos (CSV Jefit o JSON)
      </button>
      <button className="secondary-btn" onClick={handleExport}>
        Exportar datos (JSON)
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

      <div className="section-label" style={{ marginTop: 28 }}>Cuenta</div>
      <button className="secondary-btn danger-btn" onClick={() => supabase.auth.signOut()}>
        Cerrar sesión
      </button>

      <div className="section-label" style={{ marginTop: 28 }}>Reglas de progresión</div>
      <div className="setting-card" style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--text-dim)' }}>
        <div style={{ marginBottom: 8 }}><strong style={{ color: 'var(--accent)' }}>ESCALA DE ESFUERZO</strong></div>
        <div>💪 Fácil (≤7) · 😐 Regular (8) · 😤 Justo (8.5-9) · 💀 Al límite (9.5-10)</div>
        <div style={{ fontSize: 11, marginTop: 2 }}>Aislamientos no usan esfuerzo, solo reps.</div>

        <div style={{ margin: '14px 0 8px' }}><strong style={{ color: 'var(--text)' }}>BÁSICOS — Top set</strong></div>
        <div>💪 o 😐 (sin back off 💀) → +incremento</div>
        <div>😐 con algún back off 💀 → mantener</div>
        <div>😤 → mantener, +1 rep objetivo</div>
        <div>💀 primera vez → mantener · 💀 dos seguidas → −incremento</div>

        <div style={{ margin: '14px 0 8px' }}><strong style={{ color: 'var(--text)' }}>BÁSICOS — Back offs</strong></div>
        <div>Peso = top set × (1 − reducción según esfuerzo)</div>
        <div style={{ fontSize: 11 }}>💪 8% · 😐 10% · 😤 12.5% · 💀 15%</div>
        <div>Back off 1 sale 💀 → −2.5kg automático en los siguientes</div>
        <div>💀 dos sesiones seguidas → −incremento</div>

        <div style={{ margin: '14px 0 8px' }}><strong style={{ color: 'var(--text)' }}>COMPUESTOS</strong></div>
        <div>Todas al techo + última no fue 💀 → +incremento</div>
        <div>Todas al techo pero última 💀 → mantener</div>
        <div>Por debajo del mínimo dos sesiones seguidas → −incremento</div>

        <div style={{ margin: '14px 0 8px' }}><strong style={{ color: 'var(--text)' }}>AISLAMIENTOS</strong></div>
        <div>Todas al techo en UNA sesión → +incremento</div>
        <div>Por debajo del mínimo DOS sesiones → −incremento</div>

        <div style={{ margin: '14px 0 8px' }}><strong style={{ color: 'var(--text)' }}>INCREMENTOS</strong></div>
        <div>Barra +2.5kg · Mancuernas +2kg · Máquina +5kg</div>

        <div style={{ margin: '14px 0 8px' }}><strong style={{ color: 'var(--text)' }}>DELOAD</strong></div>
        <div>💀 dos veces seguidas o peso bajando 3 sesiones → sugerencia automática</div>
        <div style={{ fontSize: 11 }}>80% del peso habitual, −1 serie, sin llegar al fallo.</div>

        <div style={{ margin: '14px 0 8px' }}><strong style={{ color: 'var(--text)' }}>DEFINICIÓN</strong></div>
        <div>Las mismas reglas. Se puede subir si el esfuerzo lo justifica. No aumentar series.</div>
      </div>
    </div>
  );
}
