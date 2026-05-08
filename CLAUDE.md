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
- **Tablas:** `sessions`, `settings`, `routines`
- **Auth:** email/contraseña con RLS activado — cada usuario solo ve sus propios datos
- **Keys:** en `src/lib/supabase.js` (publishable key, segura para el frontend con RLS)

### Schema relevante
```sql
-- sessions: workoutId = dayIndex (0-based) dentro de la rutina activa
-- routines: days es un array JSONB de { name, focus, exercises: [...] }
-- settings: body_weight, phase, cut_start, active_routine_id
```

## Estructura del proyecto
```
src/
  App.jsx              — raíz, gestión de auth, carga de datos, navegación
  views/
    LoginView.jsx      — pantalla de login/registro
    HomeView.jsx       — siguiente entreno + stats + nombre rutina activa
    SessionView.jsx    — registro de una sesión (usa rutina dinámica)
    HistoryView.jsx    — historial y gráficas por ejercicio
    SettingsView.jsx   — configuración, importar/exportar datos, cerrar sesión
    RoutinesView.jsx   — lista de rutinas, editor de rutina (días + ejercicios)
  components/
    Header.jsx
    TabBar.jsx         — 5 pestañas: Inicio, Hoy, Progreso, Rutinas, Más
    Toast.jsx
  lib/
    supabase.js        — cliente de Supabase
    storage.js         — CRUD de sessions, settings y routines (usa Supabase)
    workouts.js        — WORKOUTS hardcodeado (plantilla), helpers de secuencia
    progression.js     — lógica de sugerencia de peso con escala de esfuerzo
    jefit-import.js    — importar histórico desde Jefit CSV
    claude-export.js   — exportar resumen de sesiones
  styles/
    styles.css         — estilos globales, dark theme
```

## Sistema de rutinas
- Las rutinas se guardan en Supabase (tabla `routines`)
- Una rutina tiene: `name` + array de `days` (cada día = nombre, focus, lista de ejercicios)
- Solo una rutina puede estar activa (`is_active = true`)
- La secuencia de días es automática: el día siguiente al último registrado (circular)
- `workoutId` en sessions = índice del día dentro de la rutina (0-based)
- `WORKOUTS` en workouts.js sigue existiendo como plantilla para "crear desde plantilla"

## Ejercicios — tipos y lógica de progresión
Cada ejercicio tiene:
- **type:** `basic` | `compound` | `iso`
- **loadType:** `bar` | `dumbbell` | `machine` → determina el incremento por defecto
- **scheme:** `topback` (solo básicos) → top set + back offs calculados automáticamente

Incrementos por defecto: barra +2.5kg · mancuernas +2kg · máquina +5kg

Escala de esfuerzo (básicos y compuestos): 💪 Fácil · 😐 Regular · 😤 Justo · 💀 Al límite

Los back offs se calculan automáticamente como % de reducción del top set según esfuerzo.

## Pendiente / próximos pasos
- **Biblioteca de ejercicios:** listado predefinido de ejercicios (con tipo y carga) para añadir al crear/editar una rutina sin escribir a mano

## Convenciones
- Español en la UI
- Sin comentarios innecesarios en el código
- CSS con variables en `:root`, sin CSS-in-JS
- Actualizar este fichero cuando se añadan features relevantes, cambios de arquitectura o decisiones importantes
