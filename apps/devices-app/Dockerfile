# syntax=docker/dockerfile:1
FROM node:18-alpine

WORKDIR /usr/src/app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar código fuente
COPY . .

# Exponer puerto
EXPOSE 3002

# Comando para ejecutar la aplicación
CMD ["node", "server.js"]