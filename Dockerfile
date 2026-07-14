# syntax=docker/dockerfile:1

# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app
# Husky's `prepare` script needs a git repo; skip it in Docker (mirrors backend Dockerfile's HUSKY=0).
ENV HUSKY=0
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Vite bakes these into the static bundle at build time — must be build ARGs, not runtime env.
ARG VITE_API_BASE_URL
ARG VITE_UMAMI_SRC
ARG VITE_UMAMI_WEBSITE_ID
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_UMAMI_SRC=$VITE_UMAMI_SRC
ENV VITE_UMAMI_WEBSITE_ID=$VITE_UMAMI_WEBSITE_ID

# `npm run build` = vite build && node scripts/prerender.mjs (Node SSR-render step, needs dist/ present).
RUN npm run build

# ---- runtime stage ----
# Pinned minor version (not floating :alpine) + unprivileged variant (runs as
# non-root by default, listens on 8080 not 80 — see nginx.conf/Caddyfile).
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
