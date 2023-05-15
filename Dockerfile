FROM node:14.18.3-alpine3.15 AS development

WORKDIR /usr/src/app

COPY package*.json ./
COPY yarn.lock ./

RUN yarn add glob rimraf

RUN yarn install --only=development

COPY . .

RUN yarn run build

FROM node:14.18.3-alpine3.15 as production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY package*.json ./

RUN yarn install --only=production

COPY . .

COPY --from=development /usr/src/app/dist ./dist

CMD ["node", "dist/src/main"]