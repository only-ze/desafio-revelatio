# Estágio 1: build do frontend React
FROM node:22-slim AS frontend
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npx vite build --outDir /frontend-dist --emptyOutDir

# Estágio 2: API Express servindo o frontend buildado
FROM node:22-slim
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY --from=frontend /frontend-dist ./public

ENV NODE_ENV=production \
    PORT=3000 \
    UPLOAD_DIR=/app/uploads

VOLUME ["/app/uploads"]
EXPOSE 3000

CMD ["node", "src/server.js"]
