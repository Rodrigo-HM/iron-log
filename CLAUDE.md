# iron-log — Contexto del proyecto

## Qué es
App PWA de tracking de gimnasio. Diseñada para usarse desde el móvil añadida a la pantalla de inicio. Dark theme, orientada a uso personal.

## Stack
- **React + Vite** — frontend
- **Supabase** — base de datos (PostgreSQL) y autenticación (email/contraseña)
- **Vercel** — hosting y despliegue automático

## Repositorio y despliegue
- **GitHub:** https://github.com/Rodrigo-HM/iron-log
- **Rama principal:** `master`
- **Despliegue:** automático — cada `git push` a `master` actualiza Vercel

## Supabase
- **Project URL:** `https://gjyfttaymjefvzulrbia.supabase.co`
- **Región:** EU West (Ireland)
- **Tablas:** `sessions`, `settings`
- **Auth:** email/contraseña con RLS activado — cada usuario solo ve sus propios datos
- **Keys:** en `src/lib/supabase.js` (publishable key, segura para el frontend con RLS)

## Estructura del proyecto
```
src/
  App.jsx              — raíz, gestión de auth y navegación
  views/
    LoginView.jsx      — pantalla de login/registro
    HomeView.jsx       — siguiente entreno + stats
    SessionView.jsx    — registro de una sesión
    HistoryView.jsx    — historial y gráficas
    SettingsView.jsx   — configuración, datos, cerrar sesión
  components/
    Header.jsx
    TabBar.jsx
    Toast.jsx
  lib/
    supabase.js        — cliente de Supabase
    storage.js         — todas las operaciones de datos (usa Supabase)
    workouts.js        — definición de los 5 entrenamientos y lógica de secuencia
    progression.js     — lógica de sugerencia de peso
    jefit-import.js    — importar histórico desde Jefit CSV
    claude-export.js   — exportar resumen para Claude
  styles/
    styles.css         — estilos globales, dark theme
```

## Rutina
5 entrenamientos en secuencia (1→2→3→4→5→1...):
1. **Push** — Pecho, Hombro, Tríceps
2. **Pull** — Espalda, Bíceps
3. **Piernas** — Cuádriceps, Femoral, Gemelo
4. **Hombro · Brazos** — Press militar + brazos
5. **Máquinas** — Espalda, Pecho (volumen)

## Convenciones
- Español en la UI
- Sin comentarios innecesarios en el código
- CSS con variables en `:root`, sin CSS-in-JS
- Actualizar este fichero cuando se añadan features relevantes, cambios de arquitectura o decisiones importantes
