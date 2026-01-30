FROM node:20-slim

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Install dependencies including native modules
RUN npm ci

COPY . .

# Build the Astro app
RUN npm run build

# Expose port (Railway will map the random external port to this if PORT is set)
ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.mjs"]
