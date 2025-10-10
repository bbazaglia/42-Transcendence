# Stage 1: Install dependencies
FROM node:lts-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Run the application
FROM node:lts-alpine
WORKDIR /app

# Install openssl and generate self-signed certificate
RUN apk add --no-cache openssl && \
mkdir -p /etc/ssl/private && \
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
-keyout /etc/ssl/private/nginx-selfsigned.key \
-out /etc/ssl/certs/nginx-selfsigned.crt \
-subj "/C=BR/ST=Sao_Paulo/L=Sao_Paulo/O=ft_transcendence/CN=localhost"

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
