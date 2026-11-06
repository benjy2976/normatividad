# Stage 1: Build
FROM node:22.23.4-alpine AS builder

WORKDIR /app

# Instalar dependencias mediante el lockfile
COPY package.json package-lock.json ./
RUN npm ci

# Copiar el código fuente completo del frontend
COPY . .

# Argumentos y variables de entorno de compilación
ARG NUXT_PUBLIC_API_BASE=/resources
ENV NUXT_PUBLIC_API_BASE=${NUXT_PUBLIC_API_BASE}
ENV NODE_ENV=production

# Compilar Nuxt para producción
RUN npx nuxt build

# Stage 2: Runtime ligero de producción
FROM node:22.23.4-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV NUXT_PUBLIC_API_BASE=/resources

# Copiar exclusivamente los artefactos compilados por Nitro
COPY --from=builder --chown=node:node /app/.output /app/.output

USER node

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]

