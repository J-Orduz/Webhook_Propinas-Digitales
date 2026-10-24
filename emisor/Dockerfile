FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Mantenemos el contenedor vivo esperando ejecuciones manuales
CMD ["node", "-e", "setInterval(() => {}, 1000)"]