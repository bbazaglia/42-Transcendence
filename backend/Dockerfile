# Stage 1: Install dependencies
FROM node:lts-alpine3.22 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install -g npm@latest
RUN npm install

# Stage 2: Run the application
FROM node:lts-alpine3.22
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

# Command to run the server for production
CMD [ "node", "src/server.js" ]