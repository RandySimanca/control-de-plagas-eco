FROM node:20-alpine

# La imagen node:alpine ya incluye el usuario/grupo "node" (uid/gid 1000).
# Lo usamos para correr el proceso sin privilegios de root.

WORKDIR /app

# --- Capa de dependencias (se cachea mientras package*.json no cambie) ---
COPY package*.json ./
RUN npm ci --omit=dev

# --- Capa de código fuente ---
COPY . .

# Crear el directorio de uploads y cederlo al usuario "node" antes de cambiar
# de usuario, para que pueda escribir aunque el bind-mount tenga uid != 0.
RUN mkdir -p /app/uploads && chown -R node:node /app

# Cambiar al usuario sin privilegios
USER node

# Exponer el puerto del servidor Node
EXPOSE 3001

# Iniciar la aplicación
CMD ["npm", "start"]
