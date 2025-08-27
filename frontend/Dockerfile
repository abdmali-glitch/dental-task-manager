# Build stage (Debian avoids Alpine/rollup native issues)
FROM node:20-bullseye-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --loglevel=warn || npm install --no-audit --no-fund --loglevel=warn
# ensure plugins present even if the lock is stale
RUN npm i -D @vitejs/plugin-react tailwindcss autoprefixer --no-audit --loglevel=warn
COPY . .
RUN npm run build

# Runtime: Nginx serving the static SPA
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80






