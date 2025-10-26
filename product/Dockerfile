# product/Dockerfile
FROM node:18-alpine

RUN apk add --no-cache bash openssl python3 make g++

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only=production

COPY . .

EXPOSE 3001

CMD ["node", "index.js"]
