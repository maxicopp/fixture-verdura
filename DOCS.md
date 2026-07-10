# 📖 Documentación del Proyecto — Torneo Los Verduras

## Índice

1. [Resumen General](#resumen-general)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Base de Datos](#base-de-datos)
5. [API Routes](#api-routes)
6. [Componentes Frontend](#componentes-frontend)
7. [Lógica de Negocio](#lógica-de-negocio)
8. [Sistema de Autenticación](#sistema-de-autenticación)
9. [Diseño y Estilos](#diseño-y-estilos)
10. [Configuración y Deployment](#configuración-y-deployment)
11. [Scripts Disponibles](#scripts-disponibles)

---

## Resumen General

**Torneo Los Verduras** es una aplicación web full-stack para gestionar un torneo de fútbol (videojuego) entre amigos. Participan 6 jugadores fijos: **Max, Gayco, Vulvega, Nacho, Kevin y Negro**.

La app soporta **3 tipos de competición**:

| Competición | Formato | Descripción |
|---|---|---|
| **Liga** | Round-robin (ida y vuelta) | Todos contra todos, 10 fechas, tabla de posiciones |
| **Copa** | Eliminación directa | Bracket de 6 jugadores: Cuartos → Semis → Final |
| **Recopa** | Partido único | Campeón de Liga vs Campeón de Copa |

### Flujo principal

```
Jugadores → Liga (10 fechas) → Se definen posiciones
                                    ↓
                            Copa (bracket por posiciones)
                                    ↓
                     Recopa (campeón liga vs campeón copa)
```

---

## Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router) | 15.3+ |
| UI | React | 19.2+ |
| Lenguaje | TypeScript | 5.9+ |
| Base de datos | Turso (libSQL/SQLite) | @libsql/client 0.17+ |
| Gráficos | Recharts | 3.8+ |
| Estilos | CSS puro (custom properties) | — |
| Fuente | Inter (Google Fonts) | — |
| Analytics | Vercel Analytics | 2.0+ |
| Deploy | Vercel | — |

### Sin dependencias de:
- Tailwind CSS
- CSS Modules
- ORM (Prisma, Drizzle)
- Frameworks de componentes (shadcn, MUI, etc.)

---

## Estructura del Proyecto

```
fixture-verdura/
├── app/
│   ├── api/                    # API Routes (backend)
│   │   ├── admin/              # Endpoints protegidos por auth
│   │   │   ├── auth/           # Login/logout/verify
│   │   │   ├── save-result/    # Guardar resultado de liga
│   │   │   └── reset-match/    # Resetear partido de liga
│   │   ├── copa/               # CRUD Copa (bracket)
│   │   │   ├── save-result/    # Guardar resultado de copa
│   │   │   └── reset-match/    # Resetear partido de copa (cascada)
│   │   ├── recopa/             # CRUD Recopa
│   │   │   └── save-result/    # Guardar resultado de recopa
│   │   ├── tournaments/        # CRUD Torneos genérico
│   │   │   ├── [id]/           # Detalle de torneo por ID
│   │   │   ├── active/         # Torneo activo (público)
│   │   │   └── latest/         # Último torneo (admin)
│   │   ├── head-to-head/       # Comparativa jugador vs jugador
│   │   ├── historical-stats/   # Estadísticas históricas acumuladas
│   │   ├── hall-of-fame/       # Salón de la gloria (campeones)
│   │   └── quote/              # Frase motivacional random
│   │
│   ├── components/             # Componentes React (client-side)
│   │   ├── TorneoApp.tsx       # Orquestador principal
│   │   ├── Standings.tsx       # Tabla de posiciones
│   │   ├── Fixture.tsx         # Fixture (admin, editable)
│   │   ├── MatchDay.tsx        # Partidos de una fecha
│   │   ├── Stats.tsx           # Estadísticas con gráficos
│   │   ├── CopaBracket.tsx     # Bracket visual de Copa
│   │   ├── RecopaBracket.tsx   # Bracket visual de Recopa
│   │   ├── Champion.tsx        # Celebración de campeón
│   │   ├── HallOfFame.tsx      # Salón de la gloria
│   │   ├── HeadToHead.tsx      # Comparación directa
│   │   ├── HistoricalStats.tsx # Estadísticas históricas
│   │   ├── Confetti.tsx        # Animación de confetti (canvas)
│   │   ├── Skeleton.tsx        # Primitivas de loading
│   │   └── ThemeToggle.tsx     # Switch dark/light mode
│   │
│   ├── lib/                    # Lógica compartida
│   │   ├── db.ts              # Conexión y helpers de DB
│   │   ├── auth.ts            # Tokens, rate limiting, middleware
│   │   ├── fixture.ts         # Generación de fixture, standings, copa
│   │   ├── seed.ts            # Script de seed desde data.json
│   │   └── disabled-players.ts # Lista de jugadores inactivos
│   │
│   ├── types/index.ts         # Definiciones de tipos TypeScript
│   ├── verdura-admin/page.tsx  # Panel de administración
│   ├── page.tsx               # Página principal (público)
│   ├── layout.tsx             # Layout root (HTML, meta, theme)
│   └── globals.css            # Todos los estilos (~2500+ líneas)
│
├── public/
│   ├── data.json              # Datos del torneo (fallback/seed)
│   ├── frases.json            # Frases motivacionales
│   ├── players/               # Avatares de jugadores (PNG)
│   ├── favicon.svg            # Ícono del sitio
│   └── football.svg           # Ícono decorativo
│
├── .env.example               # Variables de entorno requeridas
├── package.json               # Dependencias y scripts
└── next.config.mjs            # Configuración de Next.js
```

---

## Base de Datos

### Motor

- **Producción**: Turso (libSQL cloud)
- **Desarrollo**: SQLite local (`file:torneo.db`)

La conexión se decide automáticamente según `TURSO_DATABASE_URL`:
- Si existe → usa Turso remoto con `TURSO_AUTH_TOKEN`
- Si no existe → crea archivo SQLite local

### Esquema (3 tablas)

#### `tournaments`
| Columna | Tipo | Descripción |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| name | TEXT | "Torneo Los Verduras" |
| season | TEXT | "Clausura 2026" |
| year | INTEGER | 2026 |
| type | TEXT | `league` / `copa` / `recopa` |
| status | TEXT | `active` / `finished` |
| champion | TEXT | Nombre del campeón (o NULL) |
| top_scorer | TEXT | Goleador del torneo |
| top_scorer_goals | INTEGER | Goles del goleador |
| created_at | TEXT | Fecha de creación |
| finished_at | TEXT | Fecha de finalización |

#### `tournament_players`
| Columna | Tipo | Descripción |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| tournament_id | INTEGER FK | Referencia a tournaments |
| name | TEXT | Nombre del jugador |
| disabled | INTEGER | 0=activo, 1=inactivo |
| seed_position | INTEGER | Posición en el bracket de Copa |

#### `matches`
| Columna | Tipo | Descripción |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| tournament_id | INTEGER FK | Referencia a tournaments |
| match_key | TEXT | Identificador único del partido (`0-0`, `qf1`, `final`, etc.) |
| round | INTEGER | Número de fecha/ronda |
| stage | TEXT | Etapa en copa: `quarterfinal`, `semifinal`, `final` |
| home | TEXT | Jugador local |
| away | TEXT | Jugador visitante |
| home_goals | INTEGER | Goles del local (NULL si no jugado) |
| away_goals | INTEGER | Goles del visitante |
| played | INTEGER | 0=pendiente, 1=jugado |
| penalty_winner | TEXT | Ganador por penales (copa/recopa) |
| home_penalties | INTEGER | Goles de penal del local |
| away_penalties | INTEGER | Goles de penal del visitante |

### Migraciones

Se ejecutan automáticamente en `initSchema()` al iniciar cualquier request. Usa `ALTER TABLE ... ADD COLUMN` con catch para columnas que ya existen (compatible con SQLite).

---

## API Routes

### Públicas (sin autenticación)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/tournaments` | Lista todos los torneos |
| GET | `/api/tournaments/active` | Torneo activo con fixture, jugadores e historial |
| GET | `/api/tournaments/latest` | Último torneo (activo o finalizado) |
| GET | `/api/tournaments/[id]` | Detalle completo de un torneo específico |
| GET | `/api/copa` | Copa activa o más reciente con bracket resuelto |
| GET | `/api/recopa` | Recopa activa o más reciente |
| GET | `/api/head-to-head?p1=X&p2=Y` | Historial directo entre 2 jugadores |
| GET | `/api/historical-stats` | Tabla histórica acumulada + puntos por torneo |
| GET | `/api/hall-of-fame` | Campeones, palmarés y goleadores históricos |
| GET | `/api/quote` | Frase motivacional aleatoria |

### Protegidas (requieren sesión admin)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/admin/auth` | Login (genera token httpOnly) |
| GET | `/api/admin/auth` | Verificar sesión activa |
| DELETE | `/api/admin/auth` | Logout (elimina cookie) |
| POST | `/api/admin/save-result` | Guardar resultado de liga (auto-finaliza torneo) |
| POST | `/api/admin/reset-match` | Resetear un partido de liga |
| POST | `/api/tournaments` | Crear torneo nuevo |
| PATCH | `/api/tournaments/[id]` | Modificar torneo (finish, result, reset) |
| POST | `/api/copa` | Crear copa basada en standings |
| POST | `/api/copa/save-result` | Guardar resultado de copa (propaga ganadores) |
| POST | `/api/copa/reset-match` | Resetear partido de copa (resetea dependientes) |
| POST | `/api/recopa` | Crear recopa (auto-otorga si mismo campeón) |
| POST | `/api/recopa/save-result` | Guardar resultado de recopa |

### Detalles de las APIs clave

#### POST `/api/admin/save-result`
```json
{ "match_key": "0-0", "home_goals": 2, "away_goals": 1 }
```
- Guarda resultado del partido
- Si todos los partidos del torneo están jugados → finaliza automáticamente el torneo, calcula campeón y goleador

#### POST `/api/copa/save-result`
```json
{
  "match_key": "qf1",
  "home_goals": 1,
  "away_goals": 1,
  "penalty_winner": "Max",
  "home_penalties": 4,
  "away_penalties": 3
}
```
- En **cuartos**: empate → clasifica el mejor posicionado en liga (por seed)
- En **semis/final**: empate → obligatorio indicar `penalty_winner`
- Propaga ganador al siguiente partido automáticamente
- Si es la final → finaliza la copa

#### POST `/api/copa/reset-match`
```json
{ "match_key": "qf1", "tournament_id": 5 }
```
- Resetea el partido y **todos los partidos dependientes en cascada** (qf1 → sf1 → final)

#### POST `/api/recopa`
```json
{
  "name": "Recopa Los Verduras",
  "season": "Clausura 2026",
  "year": 2026,
  "league_champion": "Nacho",
  "copa_champion": "Gayco"
}
```
- Si `league_champion === copa_champion` → se otorga automáticamente sin jugar

---

## Componentes Frontend

### `TorneoApp.tsx` — Orquestador principal

**Responsabilidad**: Maneja toda la navegación, carga datos del torneo activo, renderiza la sección y sub-tab correcta.

**Navegación (2 niveles)**:
- Nivel 1 (secciones): Liga | Copa | Recopa | Historial | Duelos
- Nivel 2 (sub-tabs): Solo en Liga (Posiciones/Fixture/Stats) e Historial (Tabla/Salón)

**URL params**: `?s=current&t=standings` — permite deep-linking a cualquier sección.

**Datos que carga**: `/api/tournaments/active` → players, fixture, disabledPlayers, histStats

**Fallback**: Si la API falla, carga `/data.json` como respaldo estático.

---

### `Standings.tsx` — Tabla de posiciones

Muestra la tabla de posiciones con: PJ, PG, PE, PP, GF, GC, DG, PTS. Incluye medallas (🥇🥈🥉), indicador de jugadores inactivos, y una frase motivacional debajo de la tabla.

---

### `Stats.tsx` — Estadísticas con gráficos

Componente más complejo. Incluye:

1. **Filtro de jugadores**: Chips seleccionables para mostrar/ocultar jugadores
2. **KPIs**: Goles totales, partidos jugados, goleador, mejor defensa, mayor goleada
3. **Salud del equipo (PES-style)**: Últimos 3 resultados ponderados → flechas ⇈ ↑ → ↓ ⇊
4. **5 gráficos Recharts**:
   - Barras: Goles a favor / en contra / diferencia
   - Líneas: Puntos acumulados por jornada
   - Barras apiladas: Goles por jornada por jugador
   - Barras apiladas: Victorias / Empates / Derrotas
   - Radar: Rendimiento normalizado (Goles, %Victorias, Local, Visitante, Defensa)
5. **Rendimiento por jugador**: Forma reciente (G/E/P), stats casa/visitante
6. **Historial directo (mini)**: Tabla H2H con balance +/- entre todos

---

### `CopaBracket.tsx` — Bracket de Copa

Visualización del bracket eliminatorio:
- **Cuartos**: 3° vs 6° y 4° vs 5° (empate → clasifica por tabla)
- **Semis**: 1° vs ganador QF1, 2° vs ganador QF2 (con penales)
- **Final**: ganador SF1 vs ganador SF2 (con penales)
- **Byes**: 1° y 2° van directo a semis

Muestra seeds, avatares, resultados, notas de penales, y banner de campeón con confetti.

---

### `RecopaBracket.tsx` — Bracket de Recopa

Partido único entre campeón de Liga (⚽) y campeón de Copa (🏆). Tres estados:
1. **Pendiente**: Muestra quién falta para poder crearla
2. **En curso**: Match card con los dos participantes
3. **Finalizada**: Banner de campeón + confetti
4. **Auto-win**: Si el mismo ganó ambos, se otorga sin jugar

---

### `Champion.tsx` — Celebración de campeón

Se muestra al tope de la página cuando la liga termina. Incluye:
- Animación de entrada con glow y estrellas
- Avatar del campeón con corona 👑
- Estadísticas (puntos, victorias, goles, diferencia)
- Podio con top 3
- Confetti canvas
- Botón "Ver tabla completa ↓" para dismissar

---

### `HallOfFame.tsx` — Salón de la Gloria

Sección histórica con:
- **Palmarés**: Ranking de títulos por jugador con estrellas ⭐
- **Historial de campeones**: Timeline vertical con cada torneo ganado
- **Goleadores históricos**: Top 6 con barras de progreso proporcionales

---

### `HeadToHead.tsx` — Duelos directos

Comparación entre 2 jugadores seleccionables:
- Score card: Victorias de cada uno + empates
- Barra de dominio (% visual)
- Stats comparativos: Goles totales, goles/partido, % victorias
- Lista de todos los enfrentamientos con torneo, fecha y resultado

---

### `HistoricalStats.tsx` — Estadísticas Históricas

- **Tabla acumulada**: Todos los puntos sumados de todas las ligas
- **Gráfico de evolución**: Puntos acumulados a lo largo del tiempo (LineChart)
- **Puntos por torneo**: Rendimiento individual por campeonato (BarChart)
- **Explorador de torneos**: Cards expandibles con tabla y fixture de cada torneo pasado (con prefetch on hover)

---

### `MatchDay.tsx` — Partidos individuales

Card de partido con dos estados:
- **Pendiente**: Inputs numéricos para cargar resultado + cuotas estimadas
- **Jugado**: Score final con indicador de ganador + botones editar/resetear

**Sistema de cuotas (odds)**: Calcula probabilidades basadas en:
- Stats históricos (torneos anteriores): peso 1.0
- Puntos del torneo actual: peso 1.5
- Últimos 3 resultados (forma): peso 2.0
- Diferencia de gol: peso 0.5

---

### `Confetti.tsx` — Animación de confetti

Canvas HTML5 con partículas que caen. Configurable:
- `active`: boolean para activar/desactivar
- `duration`: duración en ms (default 6000)
- 180 partículas iniciales con spawning continuo
- Formas: rectángulos y círculos con rotación y wave senoidal

---

### `Skeleton.tsx` — Loading states

Primitivas reutilizables: `Sk` (base), `SkPlayerRow`, `SkTableRow`, `SkChart`, `SkKpiCard`, `SkSectionTitle`, `SkMatchCard`. Todas con `aria-hidden="true"`.

---

### `ThemeToggle.tsx` — Toggle de tema

Botón fijo en top-right. Persiste en `localStorage`. Respeta `prefers-color-scheme` del sistema como default.

---

## Lógica de Negocio

### `app/lib/fixture.ts`

#### `generateFixture(players: string[]): Round[]`
Genera fixture round-robin con ida y vuelta. Los jugadores se mezclan aleatoriamente para cada torneo.
- 6 jugadores → 5 fechas de ida + 5 de vuelta = 10 fechas totales
- 3 partidos por fecha

#### `calcStandings(players, fixture): Standing[]`
Calcula tabla de posiciones a partir del fixture:
- 3 pts por victoria, 1 por empate
- Orden: Puntos → Diferencia de gol → Goles a favor

#### `generateCopaBracket(standings): CopaBracketMatch[]`
Genera bracket de 5 partidos:
- QF1: 3° vs 6°
- QF2: 4° vs 5°
- SF1: 1° vs Ganador QF1
- SF2: 2° vs Ganador QF2
- Final: Ganador SF1 vs Ganador SF2

#### `resolveCopaBracket(matches, seedMap): CopaBracketMatch[]`
Propaga ganadores a través del bracket. Reglas de empate:
- Cuartos: avanza el mejor posicionado (seed más bajo)
- Semis/Final: se define por penales (`penaltyWinner`)

#### `getCopaChampion(matches): string | null`
Retorna el ganador de la final (o null si no se jugó).

### `app/lib/disabled-players.ts`

Array exportable de jugadores inactivos. Se muestran en gris en toda la app. Los partidos de jugadores inactivos se consideran "suspendidos".

---

## Sistema de Autenticación

### `app/lib/auth.ts`

| Función | Descripción |
|---|---|
| `generateToken(username)` | Crea token HMAC-SHA256 con timestamp |
| `verifyToken(token)` | Verifica firma y expiración (8 horas) |
| `isAuthed()` | Lee cookie `verdura-admin-session` y valida |
| `requireAuth()` | Middleware — retorna Response 401 o null |
| `isRateLimited(ip)` | Bloquea tras 5 intentos en 15 minutos |
| `recordFailedAttempt(ip)` | Registra intento fallido |
| `clearAttempts(ip)` | Limpia intentos tras login exitoso |
| `isValidGoals(value)` | Valida que sea entero entre 0 y 99 |

### Flujo de autenticación

```
1. POST /api/admin/auth { username, password }
2. Si coinciden con ADMIN_USER/ADMIN_PASS:
   → Genera token HMAC-SHA256
   → Setea cookie httpOnly 'verdura-admin-session' (8h, sameSite lax)
3. Cada request protegido:
   → requireAuth() lee la cookie
   → Verifica firma + expiración
   → Si inválido → 401
```

### Rate limiting
- Máximo 5 intentos fallidos por IP
- Ventana de 15 minutos
- Se guarda en memoria (se resetea con deploy)
- Se limpia tras login exitoso

---

## Diseño y Estilos

### Sistema de diseño

Inspirado en Linear/Vercel/Stripe. Todo en `globals.css` con CSS custom properties.

### Tokens principales

```css
/* Espaciado (base 4px) */
--space-1: 4px → --space-16: 64px

/* Superficies */
--bg, --surface, --surface-elevated, --surface2

/* Texto */
--text, --text-secondary, --text-muted

/* Accent (azul) */
--accent: #2563eb (light) / #6388f8 (dark)

/* Semánticos */
--success, --danger, --warning, --gold

/* Sombras (layered) */
--shadow-xs → --shadow-xl

/* Radius */
--radius: 12px, --radius-sm: 8px, --radius-full: 9999px
```

### Tema oscuro

Se activa con `data-theme="dark"` en el `<html>`. Se detecta automáticamente por:
1. `localStorage.getItem('theme')`
2. `prefers-color-scheme: dark`

Script inline en `<head>` evita flash of unstyled content (FOUC).

### Colores por jugador

```typescript
const PLAYER_COLORS = {
  Max:     '#4f6df5', // azul
  Gayco:   '#d97706', // ámbar
  Vulvega: '#10b981', // teal
  Nacho:   '#ef6c6c', // rojo suave
  Kevin:   '#6388f8', // azul claro
  Negro:   '#64748b', // slate
}
```

---

## Configuración y Deployment

### Variables de entorno (`.env`)

```env
# Base de datos Turso (producción)
TURSO_DATABASE_URL=libsql://tu-db.turso.io
TURSO_AUTH_TOKEN=tu-token-aqui

# Credenciales admin (OBLIGATORIO)
ADMIN_USER=tu-usuario
ADMIN_PASS=tu-password

# Secret para tokens (opcional, usa ADMIN_PASS si no se define)
ADMIN_SECRET=openssl-rand-hex-32
```

### Desarrollo local

```bash
npm install
npm run dev          # Inicia en http://localhost:3000
npm run seed         # Carga data.json en SQLite local (torneo.db)
```

Sin `TURSO_DATABASE_URL`, la app usa `file:torneo.db` automáticamente.

### Producción (Vercel + Turso)

1. Crear DB en Turso: `turso db create torneo-verdura`
2. Obtener URL y token: `turso db tokens create torneo-verdura`
3. Configurar env vars en Vercel
4. Deploy con `vercel --prod` o push a main

---

## Scripts Disponibles

| Script | Comando | Descripción |
|---|---|---|
| `dev` | `next dev` | Servidor de desarrollo |
| `build` | `next build` | Build de producción |
| `start` | `next start` | Servidor de producción |
| `lint` | `next lint` | Linter |
| `seed` | `npx tsx app/lib/seed.ts` | Carga `data.json` a la DB |
| `seed-clausura` | `npx tsx scripts/seed-clausura.ts` | Seed específico del Clausura |
| `sync` | `npx tsx scripts/sync-from-turso.ts` | Sync desde Turso remoto |

---

## Panel de Administración (`/verdura-admin`)

### Acceso
URL: `/verdura-admin` — requiere login con ADMIN_USER/ADMIN_PASS.

### Funcionalidades

1. **Liga (Fixture editable)**
   - Ver todas las fechas con partidos
   - Cargar resultados (goles local/visitante)
   - Editar resultados existentes
   - Resetear partidos individuales
   - El torneo se finaliza automáticamente cuando se juegan todos los partidos

2. **Copa (Crear y gestionar)**
   - Crear copa basada en posiciones actuales de la liga
   - Cargar resultados con soporte para penales
   - Resetear partidos (cascada automática)
   - La copa se finaliza al cargar el resultado de la final

3. **Recopa (Crear y gestionar)**
   - Crear recopa entre campeón de liga y copa
   - Si mismo campeón → se otorga automáticamente
   - Cargar resultado con penales si empate
   - Se finaliza inmediatamente al cargar resultado

4. **Tabla de posiciones** (solo lectura, se actualiza en tiempo real)

---

## Notas para desarrolladores / IAs

### Convenciones
- Idioma de la UI: **español** (Argentina)
- Idioma del código: **inglés** (variables, funciones, tipos)
- Componentes: `'use client'` — todo client-side rendering
- API: Server-side con `initSchema()` al inicio de cada handler
- No hay middleware de Next.js — auth se verifica dentro de cada route

### Patrones importantes
- **Optimistic UI**: El admin actualiza estado local inmediatamente, luego sincroniza con API
- **Cascade reset**: Resetear un partido de copa resetea todos los posteriores
- **Auto-finish**: Guardar el último resultado de liga/copa/recopa finaliza el torneo automáticamente
- **Fallback graceful**: Si la API falla, el frontend carga `data.json` estático
- **Prefetch on hover**: En HistoricalStats, los detalles de torneos se prefetchean al hacer hover

### Agregar un nuevo jugador
1. Agregarlo al array de `data.json`
2. Correr `npm run seed`
3. Agregar avatar en `public/players/nombre.png`
4. (Opcional) Agregar color en `PLAYER_COLORS` de Stats.tsx y CopaBracket.tsx

### Desactivar un jugador
1. Agregar su nombre al array en `app/lib/disabled-players.ts`
2. O marcarlo como `disabled=1` en `tournament_players` via DB
