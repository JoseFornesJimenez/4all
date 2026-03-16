# ─── Dockerfile - Backend 4all ───────────────────────────────────────────────
FROM node:20-slim

WORKDIR /app

# Instalar OpenSSL (requerido por Prisma)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Instalar dependencias primero (capa cacheada)
COPY package*.json ./
RUN npm install --omit=dev

# Copiar código fuente y schema de Prisma
COPY prisma ./prisma
COPY src ./src

# Generar cliente de Prisma
RUN npx prisma generate

EXPOSE 3008

# Ejecutar migraciones y arrancar el servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
