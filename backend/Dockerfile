FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Instalar las dependencias (solo las necesarias para producción si quieres, aunque omitiremos el flag para evitar problemas)
RUN npm install

# Copiar el resto del código del backend
COPY . .

# Exponer el puerto del servidor Node
EXPOSE 3001

# Iniciar la aplicación
CMD ["npm", "start"]
