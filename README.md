# 4all — Gestión de piso compartido

App móvil para gestionar un piso compartido: lista de la compra, incidencias y gastos.

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Node.js + Express + Prisma ORM |
| Base de datos | PostgreSQL 16 |
| Autenticación | JWT (jsonwebtoken + bcrypt) |
| Mobile | React Native + Expo SDK 54 |
| Deploy backend | Docker + Docker Compose |

---

## Estructura del proyecto

```
4all/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma       # Modelos de base de datos
│   ├── src/
│   │   ├── index.js            # Servidor Express principal
│   │   ├── middleware/
│   │   │   └── auth.middleware.js   # Verificación JWT
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── piso.controller.js
│   │   │   ├── compra.controller.js
│   │   │   ├── incidencia.controller.js
│   │   │   └── gasto.controller.js
│   │   └── routes/
│   │       ├── auth.routes.js
│   │       ├── piso.routes.js
│   │       ├── compra.routes.js
│   │       ├── incidencia.routes.js
│   │       └── gasto.routes.js
│   ├── Dockerfile
│   └── .env.example
├── mobile2/
│   ├── App.js                  # Navegación principal
│   ├── .env                    # URL del backend
│   └── screens/
│       ├── api.js              # Cliente HTTP centralizado
│       ├── LoginScreen.js
│       ├── RegisterScreen.js
│       ├── PisoScreen.js
│       └── CompraScreen.js
├── docker-compose.yml
└── .env.example
```

---

## Requisitos previos

- Docker + Docker Compose (en el servidor)
- Node.js 20+ (en el PC de desarrollo)
- Expo Go SDK 54 instalado en el móvil

---

## Poner en marcha el backend

### 1. Configura las variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus valores:

```env
POSTGRES_USER=4all
POSTGRES_PASSWORD=tu_password_seguro
POSTGRES_DB=4all
JWT_SECRET=tu_secreto_jwt
NODE_ENV=production
CORS_ORIGIN=*
```

### 2. Arranca los contenedores

```bash
docker compose up -d
```

Esto levanta:
- **db**: PostgreSQL en el puerto 5432 (solo interno)
- **backend**: API REST en el puerto 3008

### 3. Primera vez — ejecutar migraciones

```bash
docker exec -it 4all-backend npx prisma migrate dev --name init
```

### 4. Verificar que funciona

```bash
curl http://192.168.1.47:3008/api/health
# → {"status":"ok"}
```

---

## Instalar la app en el móvil (para compañeros de piso)

> Solo necesitas el móvil. No hace falta instalar nada en el ordenador.

1. Abre la **Play Store** (Android) o la **App Store** (iOS)
2. Busca **"Expo Go"** e instálala
3. Abre Expo Go y escanea el QR que te pase el administrador del piso

Listo. No necesitas cuenta de Expo ni configurar nada más.

> **Requisito:** el móvil debe estar conectado a la **misma red WiFi** que el servidor.

---

## Poner en marcha la app móvil (para desarrolladores)

### 1. Requisitos previos

- [Node.js 20+](https://nodejs.org/) instalado en el ordenador
- [Git](https://git-scm.com/) para clonar el repositorio
- **Expo Go** instalado en el móvil (SDK 54)
  - Android: [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
  - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)

### 2. Clona el repositorio

```bash
git clone <url-del-repositorio>
cd 4all/mobile2
```

### 3. Instala dependencias

```bash
npm install --legacy-peer-deps
```

### 4. Configura la URL del backend

Crea el archivo `mobile2/.env` (o edítalo si ya existe):

```env
EXPO_PUBLIC_API_URL=http://192.168.1.47:3008/api
```

> Pon la IP del servidor donde corre el backend. El móvil y el servidor deben estar en la **misma red WiFi**.

### 5. Arranca Expo

```bash
npx expo start
```

Escanea el QR con **Expo Go** (SDK 54).

---

## API REST — Endpoints

### Auth
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Registro de usuario |
| POST | `/api/auth/login` | Login, devuelve JWT |
| GET | `/api/auth/me` | Datos del usuario actual |

### Piso
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/piso/crear` | Crea un piso nuevo |
| POST | `/api/piso/unirse` | Unirse con código de invitación |
| GET | `/api/piso` | Info del piso actual |
| DELETE | `/api/piso/salir` | Abandonar el piso |

### Compra
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/compra` | Lista de items |
| POST | `/api/compra` | Añadir item |
| PATCH | `/api/compra/:id/toggle` | Marcar completado/pendiente |
| DELETE | `/api/compra/:id` | Eliminar item |

### Incidencias
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/incidencias` | Listar incidencias |
| POST | `/api/incidencias` | Crear incidencia |
| PATCH | `/api/incidencias/:id` | Actualizar incidencia |
| DELETE | `/api/incidencias/:id` | Eliminar incidencia |

### Gastos
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/gastos` | Listar gastos |
| GET | `/api/gastos/balance` | Balance por usuario |
| POST | `/api/gastos` | Registrar gasto (se divide entre todos) |
| DELETE | `/api/gastos/:id` | Eliminar gasto |

---

## Flujo de la app

```
Abrir app
    │
    ▼
[Login / Registro]
    │
    ▼ (JWT guardado en memoria)
¿Tiene piso?
    │
    ├─ NO → [Crear piso / Unirse con código]
    │
    └─ SÍ → [App principal]
                ├── 🛒 Compra
                ├── 🔧 Incidencias
                ├── 💸 Gastos
                └── 🏠 Info del piso + cerrar sesión
```

---

## Modelos de base de datos

- **User**: id, nombre, email, password (bcrypt), pisoId, pushToken
- **Piso**: id, nombre, codigo (6 chars único), miembros[]
- **ItemCompra**: id, nombre, completado, pisoId, creadoPorId
- **Incidencia**: id, titulo, descripcion, estado, prioridad, pisoId, creadoPorId
- **Gasto**: id, descripcion, monto, fecha, pisoId, pagadoPorId, deudas[]
- **Deuda**: id, gastoId, deudorId, acreedorId, monto, pagada
