FROM node:20-alpine AS user-app
WORKDIR /app
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
COPY fabweb0-master/package*.json ./
RUN npm ci
COPY fabweb0-master/ ./
RUN npm run build

FROM node:20-alpine AS admin-app
WORKDIR /app
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
COPY admin-main/package*.json ./
RUN npm ci
COPY admin-main/ ./
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=user-app /app/dist /usr/share/nginx/html/user
COPY --from=admin-app /app/dist /usr/share/nginx/html/admin
COPY deploy/nginx/templates/default.conf.template /etc/nginx/templates/default.conf.template
