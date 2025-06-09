# Stage 1: Build Angular App
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration=production --output-path=dist

# Stage 2: Serve App using NGINX
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Optional: Override default NGINX config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
