# Stage 1: Install dependencies
FROM node:lts-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Run the application
FROM node:lts-alpine
WORKDIR /app

RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Create data directory and generate Prisma client
RUN mkdir -p ./data
RUN npx prisma generate --schema=./src/schemas/schema.prisma

COPY backend-entrypoint.sh .
RUN chmod +x backend-entrypoint.sh
ENTRYPOINT ["./backend-entrypoint.sh"]

EXPOSE 3000

CMD [ "node", "src/server.js" ]