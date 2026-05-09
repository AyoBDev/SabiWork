FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production

COPY src/ ./src/
COPY migrations/ ./migrations/
COPY seed.js ./seed.js

# Shared constants mounted via docker-compose volume at /app/shared

EXPOSE 3000

CMD ["node", "src/index.js"]
