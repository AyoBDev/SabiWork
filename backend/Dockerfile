FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production

COPY src/ ./src/
COPY shared/ ./shared/
COPY migrations/ ./migrations/
COPY seed.js ./seed.js
COPY seed-data/ ./seed-data/

EXPOSE 3000

CMD ["sh", "-c", "npx knex migrate:latest --knexfile src/database/knexfile.js && node seed.js && node src/index.js"]
