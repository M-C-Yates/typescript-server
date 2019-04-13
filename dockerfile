FROM node:latest

WORKDIR /usr/src/server/auth

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 4000

CMD ["node", "server.js"]