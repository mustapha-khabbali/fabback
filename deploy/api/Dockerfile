FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY fablab-api/package*.json ./
RUN npm ci --omit=dev

COPY fablab-api/src ./src
COPY fablab-api/migrations ./migrations
COPY fablab-api/seeds ./seeds

EXPOSE 4000
CMD ["npm", "start"]
