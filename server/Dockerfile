FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./

RUN npm run prisma:generate && npm run build

ENV NODE_ENV=production
EXPOSE 4000
CMD ["sh", "-c", "npm run prisma:migrate:deploy && npm run start"]
