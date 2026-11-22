ARG NODE_IMAGE=node:22-alpine
ARG NGINX_IMAGE=nginx:alpine
ARG VITE_APP_FEATURE_MODE=resume-only
ARG VITE_RESUME_STORAGE_MODE=local
ARG VITE_AI_PROVIDER_MODE=auto
ARG VITE_AI_PROXY_PATH=/api/ai-proxy/chat/completions
ARG VITE_CLOUDFLARE_SHARE_API=/api/shares

# author: Bob

# 构建阶段只生成前端静态资源。
FROM ${NODE_IMAGE} AS build

ARG VITE_APP_FEATURE_MODE=resume-only
ARG VITE_RESUME_STORAGE_MODE=local
ARG VITE_AI_PROVIDER_MODE=auto
ARG VITE_AI_PROXY_PATH=/api/ai-proxy/chat/completions
ARG VITE_CLOUDFLARE_SHARE_API=/api/shares

WORKDIR /app

ENV VITE_APP_FEATURE_MODE=${VITE_APP_FEATURE_MODE}
ENV VITE_RESUME_STORAGE_MODE=${VITE_RESUME_STORAGE_MODE}
ENV VITE_AI_PROVIDER_MODE=${VITE_AI_PROVIDER_MODE}
ENV VITE_AI_PROXY_PATH=${VITE_AI_PROXY_PATH}
ENV VITE_CLOUDFLARE_SHARE_API=${VITE_CLOUDFLARE_SHARE_API}

# 先复制依赖清单，提升 Docker 层缓存命中率。
COPY package.json package-lock.json ./

RUN npm ci

# 再复制前端源码并执行构建。
COPY . .

RUN npm run build-only

# 运行阶段使用 Nginx 托管静态资源并代理后端。
FROM ${NGINX_IMAGE}

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
