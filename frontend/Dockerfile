# NexusOps frontend — build + nginx static serve (dev reverse proxy later)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY frontend/package.json frontend/
RUN npm ci --workspace frontend --include-workspace-root
COPY . .
RUN npm run build --workspace frontend

FROM nginx:1.27-alpine AS runner
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]