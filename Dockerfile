FROM node:15.6.0-alpine

WORKDIR /api

COPY . ./

RUN yarn install
RUN yarn start