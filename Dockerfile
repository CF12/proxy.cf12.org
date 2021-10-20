FROM node:14-alpine

RUN apk add python make gcc g++

USER node
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app

COPY package*.json ./
RUN npm install


COPY --chown=node:node . .
RUN npm build

EXPOSE 3000
CMD [ "npm", "start" ]