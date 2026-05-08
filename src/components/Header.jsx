export function Header() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();

  return (
    <div className="app-header">
      <div className="brand">
        <div className="brand-logo">IRON<span className="brand-accent">/</span>LOG</div>
        <div className="brand-tag">{dateStr}</div>
      </div>
    </div>
  );
}
