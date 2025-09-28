# Stage 1: Install dependencies
FROM node:lts-alpine3.22 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install -g npm@latest
RUN npm i --package-lock-only
RUN npm audit fix --force
RUN npm install

# Stage 2: Run the application
FROM node:lts-alpine3.22
WORKDIR /app

RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema=./src/schemas/schema.prisma

COPY backend-entrypoint.sh .
RUN chmod +x backend-entrypoint.sh
ENTRYPOINT ["./backend-entrypoint.sh"]

EXPOSE 3000

CMD [ "node", "src/server.js" ]