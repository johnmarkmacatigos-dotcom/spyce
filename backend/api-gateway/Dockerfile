FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    openssl \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 4000
CMD ["node", "dist/main.js"]