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
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema=./src/schemas/schema.prisma

EXPOSE 3000

# Command to run the server for production
CMD [ "node", "src/server.js" ]