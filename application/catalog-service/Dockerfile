
FROM node:20-alpine

RUN apk update && apk upgrade --no-cache

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev \
    && rm -rf /usr/local/lib/node_modules/npm \
              /usr/local/bin/npm \
              /usr/local/bin/npx

COPY src ./src

ENV NODE_ENV=production

EXPOSE 4001

USER node

CMD ["node", "src/server.js"]

