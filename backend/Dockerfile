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
# Copy only specific directories instead of using COPY . . to avoid overwriting
# the clean node_modules from deps stage with potentially incomplete host node_modules
COPY package.json package-lock.json ./
COPY src/ ./src/
COPY public/ ./public/

# Set environment variables for Prisma
ENV DATABASE_PATH="file:./data/dev.db"
ENV JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
ENV NODE_ENV=production

# Create data directory and generate Prisma client
RUN mkdir -p ./data
RUN npx prisma generate --schema=./src/schemas/schema.prisma

EXPOSE 3000

# Command to run the server for production
CMD [ "node", "src/server.js" ]