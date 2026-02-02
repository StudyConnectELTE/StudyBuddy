# Frontend Dockerfile - Vite + React/TS development
FROM node:20-alpine

# Development függőségek
WORKDIR /app

# package.json + lockfile másolása gyorsabb cache-eléshez
COPY package*.json ./
RUN npm ci --only=development

# Source code
COPY . .

# Port expozíció (development-ben opcionális)
EXPOSE 5173

# Dev server indulás: explicit port + host binding
CMD ["sh", "-c", "npm run dev -- --host 0.0.0.0 --port 5173"]
