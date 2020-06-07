const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
const http = require('http');
const fs = require('fs');
const path = require('path');

const downloadPath = process.env.DOWNLOADS_FOLDER || '/etc/yggRSS/downloads';
const yggBaseUrl = process.env.YGG_BASE_URL || 'https://www2.yggtorrent.se';
const username = process.env.YGG_USERNAME;
const password = process.env.YGG_PASSWORD;

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({
  blockTrackers: true
}))

if (!fs.existsSync(downloadPath)) {
  fs.mkdirSync(downloadPath);
}


http.createServer(function(req, res) {
  console.log('Launching headless browser...');
  puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  }).then(async browser => {
    console.log('Incomming request for', req.url);

    if (req.url == "/user/login")
      return res.end();

    const page = await browser.newPage();

    var cookies;
    if (fs.existsSync('./cookies.json')) {
      const cookiesString = await fs.readFileSync('./cookies.json');
      cookies = JSON.parse(cookiesString);
      await page.setCookie(...cookies);
    }

    if (username != null && username != '') {
      await page.goto(yggBaseUrl);
      try {
        console.log('Waiting for Cloudflare challenge');
        await page.waitFor(() => !document.querySelector('.ray_id'));
        await page.waitFor('img[src="/static/img/footer.png"]', {
          timeout: 60000
        });
      } catch (e) {
        console.log('Error', e)
        await browser.close();
        res.end();
        return;
      }

      const loginBodyHandle = await page.$('body');
      const loginResHTML = await page.evaluate(body => body.outerHTML, loginBodyHandle);
      await loginBodyHandle.dispose();

      // If user is not already logged in
      if (!/user\/logout/i.test(loginResHTML)) {
        console.log('Logging with creddentials');
        await page.evaluate(`document.querySelector('#user-login input[name=id]').value='${username}'`);
        await page.evaluate(`document.querySelector('#user-login input[name=pass]').value='${password}'`);
        await page.evaluate(() => document.querySelector('#user-login').submit());
        await page.waitForResponse(function(response) {
          return /user\/login/i.test(response.url()) &&
            response.status() === 200;
        });
        console.log('User successfully logged-in');
      } else {
        console.log('User already logged-in');
      }
    }

    console.log('Fetching requested URL');
    const url = yggBaseUrl + req.url;
    await page.goto(url);

    if (/download/i.test(req.url)) {
      page._client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadPath,
      });

      var finalResponse;
      try {
        console.log("Waiting for Cloudflare challenge");
        finalResponse = await page.waitForResponse(function(response) {
          return /download/i.test(response.url()) &&
            response.status() === 200 &&
            response.headers()['content-disposition'] != null;
        });
      } catch (e) {
        console.log('Error', e)
        await browser.close();
        res.end();
        return;
      }

      console.log('Downloading file');
      const contentDisposition = finalResponse.headers()['content-disposition'];
      const fileName = contentDisposition.slice(contentDisposition.indexOf('"') + 1, contentDisposition.length - 1);
      const filePath = path.join(downloadPath, fileName);

      var i = 0;
      while (!fs.existsSync(filePath)) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (i++ > 10)
          break;
      }

      const fileStream = fs.createReadStream(filePath);

      res.writeHead(200, {
        'Content-Type': 'application/x-bittorrent',
        'Content-Length': fs.statSync(filePath).size,
        'content-disposition': contentDisposition
      });
      fileStream.pipe(res);

    } else {
      try {
        console.log('Waiting for Cloudflare challenge');
        await page.waitFor(() => !document.querySelector('.ray_id'));
        await page.waitFor(/rss/i.test(req.url) ? '.line' : 'img[src="/static/img/footer.png"]', {
          timeout: 60000
        });
      } catch (e) {
        console.log('Error', e);
        res.end();
        await browser.close();
        return;
      }

      console.log('Extracting html');
      const bodyHandle = await page.$('body');
      const resHTML = await page.evaluate(body => body.outerHTML, bodyHandle);
      await bodyHandle.dispose();

      if (/rss/i.test(req.url)) {
        res.writeHead(200, {
          'Content-Type': 'application/rss+xml'
        });
      }
      res.write(resHTML);
      res.end();
    }

    console.log('Saving cookies');
    cookies = await page.cookies();
    await fs.writeFileSync('./cookies.json', JSON.stringify(cookies, null, 2));

    await browser.close();
    console.log('Done');
  });
}).listen(process.env.PORT || 8091, process.env.HOST || '0.0.0.0', function() {
  console.log('ygg fetcher running');
});
