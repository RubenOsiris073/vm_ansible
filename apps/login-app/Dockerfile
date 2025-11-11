FROM node:18-alpine

WORKDIR /usr/src/app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar el resto de los archivos
COPY . .

# Exponer puerto 3001 (diferente al router-admin)
EXPOSE 3001

# Comando para ejecutar la aplicación
CMD ["node", "server.js"]