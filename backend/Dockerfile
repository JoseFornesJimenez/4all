# ─── Dockerfile - Backend 4all ───────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

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
