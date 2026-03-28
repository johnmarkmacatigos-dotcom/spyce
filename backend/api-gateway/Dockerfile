FROM node:20-alpine
RUN apk add --no-cache ffmpeg python3 py3-pip
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 4000
CMD ["npm", "run", "dev"]
