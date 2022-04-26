FROM ubuntu:20.04 AS build

ENV TZ=Europe/Stockholm
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN apt-get update && \
    apt-get install -y nodejs npm

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
RUN npm install
COPY . ./
RUN npm run build

FROM nginx:1.21.4
COPY --from=build /app/public /usr/share/nginx/html
EXPOSE 8080
# ENTRYPOINT npm run start
