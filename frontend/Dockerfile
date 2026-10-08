# build
FROM node:22-alpine AS build
WORKDIR /fe
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
# serve
FROM nginx:1.27-alpine
COPY --from=build /fe/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
