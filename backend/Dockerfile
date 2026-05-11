FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production

COPY src/ ./src/
COPY shared/ ./shared/
COPY migrations/ ./migrations/
COPY seed.js ./seed.js

EXPOSE 3000

CMD ["node", "src/index.js"]
