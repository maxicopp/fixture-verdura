# ⚽ Torneo Los Verduras

Aplicación web para gestionar torneos de fútbol entre amigos. Liga round-robin, Copa eliminatoria y Recopa, todo en una sola app con estadísticas en tiempo real, gráficos interactivos y panel de administración.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)
![Turso](https://img.shields.io/badge/DB-Turso-4FF8D2?logo=sqlite)

---

## ✨ Features

- **Liga** — Round-robin ida y vuelta (10 fechas, todos contra todos)
- **Copa** — Bracket eliminatorio con cuartos, semis y final (penales incluidos)
- **Recopa** — Partido único entre campeón de Liga y campeón de Copa
- **Estadísticas** — Gráficos interactivos (Recharts), sistema de "salud" estilo PES, cuotas estimadas
- **Historial** — Tabla acumulada de todos los torneos, explorador de campeonatos pasados
- **Salón de la Gloria** — Palmarés, timeline de campeones, goleadores históricos
- **Duelos directos** — Comparación head-to-head entre cualquier par de jugadores
- **Dark mode** — Toggle con persistencia en localStorage
- **Panel Admin** — Cargar resultados, crear copa/recopa, todo protegido con auth
- **Responsive** — Mobile-first, funciona en cualquier dispositivo

---

## 🚀 Quick Start

### Requisitos

- Node.js 18+
- npm

### Instalación

```bash
git clone <repo-url>
cd fixture-verdura
npm install
```

### Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con tus credenciales:

```env
# Obligatorio para el admin
ADMIN_USER=tu-usuario
ADMIN_PASS=tu-password

# Opcional: DB remota (sin esto usa SQLite local)
TURSO_DATABASE_URL=libsql://tu-db.turso.io
TURSO_AUTH_TOKEN=tu-token
```

### Iniciar desarrollo

```bash
npm run seed   # Carga datos iniciales en la DB local
npm run dev    # Inicia en http://localhost:3000
```

### Panel de administración

Acceder a `/verdura-admin` con las credenciales de `ADMIN_USER` / `ADMIN_PASS`.

---

## 🏗️ Tech Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19 |
| Lenguaje | TypeScript |
| Base de datos | Turso (libSQL) — SQLite en producción y desarrollo |
| Gráficos | Recharts |
| Estilos | CSS puro con custom properties (sin Tailwind) |
| Deploy | Vercel |

---

## 📁 Estructura

```
app/
├── api/            → Backend (API routes)
├── components/     → Componentes React (client-side)
├── lib/            → Lógica compartida (DB, auth, fixture, etc.)
├── types/          → Definiciones TypeScript
├── verdura-admin/  → Panel de administración
├── page.tsx        → Página principal pública
└── globals.css     → Todos los estilos
public/
├── data.json       → Datos del torneo (fallback/seed)
├── frases.json     → Frases motivacionales
└── players/        → Avatares de los jugadores (PNG)
```

Para documentación detallada de cada archivo, API, componente y flujo → ver **[DOCS.md](./DOCS.md)**

---

## 📜 Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run seed` | Carga `data.json` en la DB |
| `npm run lint` | Linter |

---

## 🎮 Competiciones

### Liga (round-robin)

Todos contra todos, ida y vuelta. 6 jugadores → 10 fechas → 30 partidos.
Se finaliza automáticamente al cargar el último resultado.

### Copa (eliminación directa)

Se crea desde el admin basándose en las posiciones de la liga:
- 1° y 2° van directo a semis (bye)
- Cuartos: 3° vs 6°, 4° vs 5°
- Empate en cuartos → clasifica el mejor posicionado
- Empate en semis/final → penales

### Recopa

Partido único entre campeón de Liga y campeón de Copa.
Si el mismo jugador ganó ambos → se le otorga automáticamente.

---

## 🔐 Autenticación

- Login en `/verdura-admin` con usuario y contraseña
- Token HMAC-SHA256 en cookie httpOnly (expira en 8 horas)
- Rate limiting: 5 intentos fallidos → bloqueado 15 minutos
- Todas las API de escritura requieren sesión activa

---

## 🌐 Deploy en Producción

1. Crear DB en [Turso](https://turso.tech): `turso db create torneo-verdura`
2. Obtener credenciales: `turso db tokens create torneo-verdura`
3. Configurar env vars en [Vercel](https://vercel.com)
4. Push a main → deploy automático

---

## 📖 Documentación completa

Para detalles sobre cada API, componente, tipo, patrón de diseño y flujo de datos → **[DOCS.md](./DOCS.md)**

---

## 👥 Jugadores

| Jugador | Color |
|---|---|
| Max | 🔵 Azul |
| Gayco | 🟠 Ámbar |
| Vulvega | 🟢 Teal |
| Nacho | 🔴 Rojo |
| Kevin | 🔵 Azul claro |
| Negro | ⚫ Slate |

---

## License

Proyecto privado.
