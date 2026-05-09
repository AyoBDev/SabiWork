# whatsapp-bot/Dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
VOLUME ["/app/auth_state"]
CMD ["npm", "start"]
