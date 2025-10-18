# Stage 1: Build React App
FROM node:22.17.0 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . ./
RUN npm run build

# Stage 2: Nginx to serve static files
FROM nginx:1.27-alpine

# Копируем собранные файлы
COPY --from=builder /app/dist /usr/share/nginx/html

# Копируем конфигурацию nginx для frontend
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
