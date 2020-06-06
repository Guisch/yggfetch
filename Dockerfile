FROM node:10-jessie

RUN mkdir -p /home/node/yggfetch/node_modules && mkdir -p /home/node/yggfetch/downloads && chown -R node:node /home/node/yggfetch
RUN apt update -y && apt install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget libgbm1
WORKDIR /home/node/yggfetch

ENV PORT=8091
ENV HOST=0.0.0.0
ENV DOWNLOADS_FOLDER=/home/node/yggfetch/downloads
#ENV YGG_USERNAME=myusername
#ENV YGG_PASSWORD=mypassword

COPY package*.json ./
USER node
RUN npm install
COPY --chown=node:node . .
EXPOSE 8091

CMD [ "node", "index.js" ]