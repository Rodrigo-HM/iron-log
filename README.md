# Iron Log

App PWA para registrar entrenos de gimnasio con progresión inteligente. Construida con React + Vite, persistencia en IndexedDB, instalable como app nativa en Android.

## Características

- **5 entrenos en secuencia** (Push, Pull, Piernas, Hombro/Brazos, Máquinas) — no atados a días concretos.
- **Sugerencias automáticas de progresión** según RPE, reps completadas y fase (volumen/definición).
- **Persistencia robusta** en IndexedDB (no se pierden los datos al limpiar caché).
- **Importación de Jefit** desde el CSV de backup nativo.
- **Exportación a Claude** con un botón que copia al portapapeles un resumen estructurado de las últimas sesiones.
- **Funciona offline** una vez instalada.

## Setup local

```bash
# Instalar dependencias
npm install

# Lanzar en modo desarrollo
npm run dev

# Build de producción
npm run build

# Previsualizar build
npm run preview
```

El servidor de desarrollo se levanta en `http://localhost:5173`. Si lo ejecutas en una red local, también podrás acceder desde el móvil con la IP del PC (Vite muestra ambas URLs al arrancar).

## Estructura del proyecto

```
iron-log/
├── public/
│   └── icons/              Iconos de la PWA
├── src/
│   ├── components/         Componentes reutilizables (Header, TabBar, Toast)
│   ├── views/              Vistas principales (Home, Session, History, Settings)
│   ├── lib/
│   │   ├── workouts.js     Definición de los 5 entrenos
│   │   ├── progression.js  ⚡ REGLAS DE PROGRESIÓN (¡EDITAR AQUÍ!)
│   │   ├── storage.js      Persistencia IndexedDB
│   │   ├── jefit-import.js Parser CSV de Jefit
│   │   └── claude-export.js Generador del resumen para Claude
│   ├── styles/styles.css   Estilos globales
│   ├── App.jsx             Componente principal
│   └── main.jsx            Punto de entrada
├── index.html
├── package.json
└── vite.config.js          Config Vite + PWA
```

## Modificar las reglas de progresión

El archivo `src/lib/progression.js` contiene **toda** la lógica del "agente" que decide cuándo subir/mantener/bajar peso. Está exhaustivamente documentado y diseñado para que puedas modificarlo sin tocar el resto.

Puntos clave:
- `INCREMENTS` al inicio: cuánto sube/baja según el tipo de ejercicio.
- `suggestTopSet()`, `suggestBackOffs()`, `suggestCompound()`, `suggestIsolation()`: una función por cada tipo de ejercicio.
- `generateSuggestion()`: dispatcher que llama a la función correcta.

## Modificar la rutina

`src/lib/workouts.js` contiene la definición de los 5 entrenos. Para cambiar ejercicios, rangos de reps o series, edita ahí.

## Despliegue en Vercel

1. Crea cuenta en https://vercel.com (gratis).
2. Sube este proyecto a un repo de GitHub.
3. En Vercel: "New Project" → conecta tu repo → deploy.
4. Vercel detecta Vite automáticamente, no hace falta configurar nada.

Alternativa sin Git: desde la CLI de Vercel
```bash
npm install -g vercel
vercel
```

## Instalación como app en Android

1. Abre la URL de tu deploy en Chrome Android.
2. Menú (3 puntos) → "Instalar app" o "Añadir a pantalla de inicio".
3. Tendrás un icono en tu pantalla. Se abre en pantalla completa, sin barra del navegador.

## Importar histórico de Jefit

1. En Jefit: Settings → Backup/Restore → Backup → Email me the backup.
2. Recibes un CSV en tu correo.
3. En Iron Log: tab **Más → Importar histórico Jefit (CSV)** → seleccionas el archivo.

La app:
- Convierte automáticamente libras a kg.
- Traduce los nombres de ejercicios al español.
- Detecta el tipo de entreno (1-5) según los ejercicios presentes.
- Marca el primer set de los básicos como `top set`.

## Workflow con Claude

1. Terminas un entreno y lo registras en Iron Log.
2. Vas a **Más → Copiar resumen para Claude**.
3. Abres Claude (web o app), pegas el resumen.
4. Claude tiene contexto completo (últimas 3 sesiones + progresión de los 4 básicos) para sugerirte ajustes, responder dudas técnicas, o evaluar si toca cambiar algo del programa.

## Notas técnicas

- IndexedDB en Chrome Android tiene límite teórico altísimo (% del disco), en la práctica nunca llegarás.
- Los datos NO se sincronizan entre dispositivos. Si quieres pasar datos del móvil al ordenador (o viceversa), usa **Más → Exportar todos los datos (JSON)** y luego **Importar datos (JSON)** en el otro dispositivo.
- Si limpias datos de navegación específicamente para esta web, perderás los datos. Por eso es recomendable exportar JSON periódicamente como backup.
