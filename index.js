const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const http = require('http');
const fs = require('fs');
const path = require('path');

const downloadPath = process.env.DOWNLOADS_FOLDER || '/etc/yggRSS/downloads';
const yggBaseUrl = process.env.YGG_BASE_URL || 'https://www2.yggtorrent.se';
const username = process.env.YGG_USERNAME;
const password = process.env.YGG_PASSWORD;

puppeteer.use(StealthPlugin());
if (!fs.existsSync(downloadPath)){
    fs.mkdirSync(downloadPath);
}

http.createServer(function(req, res) {
  console.log('Incomming request for', req.url);
  console.log('Launching headless browser...');
  puppeteer.launch({
    headless: true,
    args: [ '--no-sandbox' ]
  }).then(async browser => {
    const page = await browser.newPage();
    
    if (username != null && username != '') {
      console.log('Logging with creddentials');
      await page.goto(yggBaseUrl);
      await page.waitFor('#register');
      await page.click('#register');
      await page.type("input[name='id']", username);
      await page.type("input[name='pass']", password);
      await page.keyboard.press('Enter');
    }

    console.log('Fetching requested URL');
    const url = yggBaseUrl + req.url;
    await page.goto(url);

    if (/download/i.test(req.url)) {
      console.log("Waiting for Cloudflare challenge");
      page._client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadPath,
      });
      const finalResponse = await page.waitForResponse(function(response) {
        return /download/i.test(response.url()) &&
          response.status() === 200 &&
          response.headers()['content-disposition'] != null;
      });

      const contentDisposition = finalResponse.headers()['content-disposition'];
      const fileName = contentDisposition.slice(contentDisposition.indexOf('"') + 1, contentDisposition.length - 1);
      const filePath = path.join(downloadPath, fileName);
      const fileStream = fs.createReadStream(filePath);

      res.writeHead(200, {
        'Content-Type': 'application/x-bittorrent',
        'Content-Length': fs.statSync(filePath).size,
        'content-disposition': contentDisposition
      });
      fileStream.pipe(res);
    } else {
      console.log('Waiting for Cloudflare challenge');
      await page.waitFor(() => !document.querySelector('.ray_id'));
      await page.waitFor('.line');

      const bodyHandle = await page.$('body');
      const resHTML = await page.evaluate(body => body.outerHTML, bodyHandle);
      await bodyHandle.dispose();

      res.writeHead(200, {
        'Content-Type': 'application/rss+xml'
      });
      res.write(resHTML);
      res.end();
    }

    await browser.close()
    console.log('Done');
  });
}).listen(process.env.PORT || 8091, process.env.HOST || '0.0.0.0', function() {
  console.log('RSS Server running');
});