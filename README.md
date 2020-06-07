# Deprecated

This project is being archived since YGG remove Cloudflare protection.
See: https://github.com/Jackett/Jackett/issues/8840#issuecomment-640291006
It may be unarchive in the future if YGG re-enable cloudflare protection.



# yggfetch

Bypass YGGTorrent cloudflare challenge (does not solve the captcha).

### How it works

It use [puppeteer](https://github.com/puppeteer/puppeteer) to create an headless browser and then redirect the output to local http server
If the environment variable `YGG_USERNAME` is detected, the script will login with the provided credentials before fetching the requested page.
This does not solve the captcha, The captcha only appear if your IP has a bad reputation.
It works for the RSS and RSS download, not tested elsewhere.

## Getting started

### Installation

#### Variable

Name | Default value
|--|--|
DOWNLOADS_FOLDER | `/etc/yggRSS/downloads`
YGG_BASE_URL | `https://www2.yggtorrent.se`
YGG_USERNAME | 
YGG_PASSWORD | 
PORT | 8091
HOST | 0.0.0.0

#### Docker

You can edit `YGG_USERNAME` and `YGG_USERNAME` environment variable in `./Dockerfile`

```
git clone https://github.com/Guisch/yggfetch.git
cd yggfetch
docker build -t yggfetch:latest .
docker run --restart=always --name yggfetch -p 8091:8091 -d yggfetch:latest
```

#### NodeJS

Require Node.JS. Tested on Ubuntu and Alpine
make sure that your current user has access to `DOWNLOADS_FOLDER`

```
apt update -y && apt install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget libgbm1
git clone https://github.com/Guisch/yggfetch.git
cd yggfetch
npm install
node index.js
```

## Usage

Once the server is started, the usage is really simple. Just change the yggtorrent.se domain to yours to fetch the page:

```
https://www2.yggtorrent.se/rss?action=generate&type=subcat&id=2171&passkey=XXXX

become

http://localhost:8091/rss?action=generate&type=subcat&id=2171&passkey=XXXX
```