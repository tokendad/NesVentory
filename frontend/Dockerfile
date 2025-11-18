FROM node:20 AS build

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# ------------------------ #
# PRODUCTION RUNTIME IMAGE #
# ------------------------ #
FROM nginx:stable-alpine

# Add nginx config for React Router
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Frontend build → Nginx HTML directory
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx serves on port 80 (NOT 5173)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
