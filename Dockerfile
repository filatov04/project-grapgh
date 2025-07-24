FROM node:22.17.0 as build

WORKDIR /app/
ENV PATH /app/node_modules/.bin:$PATH

ADD package.json ./
ADD package-lock.json ./
ADD tsconfig.json ./

RUN npm install

ADD . /app

RUN npm run build

FROM nginx:1.19.7-alpine

COPY --from=build /app/dist /usr/share/nginx/html

RUN rm /etc/nginx/conf.d/default.conf
ADD default.conf /etc/nginx/conf.d

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]