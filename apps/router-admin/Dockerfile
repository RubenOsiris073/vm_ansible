# syntax=docker/dockerfile:1
FROM node:18-alpine AS base
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --production

COPY . .
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
