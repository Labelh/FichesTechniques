FROM node:20-bookworm-slim
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./
ENV PORT=3000 CACHE_FILE=/data/ft_cache.json
EXPOSE 3000
CMD ["node", "server.js"]
