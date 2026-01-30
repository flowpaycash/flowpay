FROM node:20-alpine

WORKDIR /app

COPY package.json ./
#COPY package-lock.json ./ 

# Instalar deps (vazio agora, mas preparado)
# RUN npm ci --omit=dev  <-- comentado pois nao temos deps

COPY server-simple.js ./

# Variáveis padrão (Railway sobrescreve PORT, mas bom ter check)
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server-simple.js"]
