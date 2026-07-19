# ── Etapa 1: Build con Node.js ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# --- Capa de dependencias (se cachea mientras package*.json no cambie) ---
COPY package*.json ./
RUN npm ci

# --- Capa de código fuente ---
COPY . .

# Pasar la URL de la API durante la compilación.
# En Docker con reverse-proxy de Nginx usa "/api" (ruta relativa).
# En desarrollo local sin Docker usa "http://localhost:3001/api".
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Etapa 2: Servidor de producción con Nginx ─────────────────────────────────
FROM nginx:alpine

# Copiar la configuración personalizada de Nginx (incluye reverse-proxy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los estáticos generados por Vite a la carpeta pública de Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
