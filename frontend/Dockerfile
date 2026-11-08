FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Docker's own DNS and service name; Railway overrides both in the service's variables.
ENV BACKEND_HOST=backend NGINX_RESOLVER=127.0.0.11
COPY nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 80