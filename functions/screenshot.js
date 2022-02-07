const { builder } = require("@netlify/functions");
const chromium = require("chrome-aws-lambda");

function isValidUrl(url) {
  try {
    const uri = new URL(url);
    if (uri.hostname != "kinduff.com") return false;
    return true;
  } catch (e) {
    return false;
  }
}

async function screenshot(url, format, width, height, dpr = 1, withJs = true) {
  const browser = await chromium.puppeteer.launch({
    executablePath: await chromium.executablePath,
    args: chromium.args,
    defaultViewport: {
      width: width,
      height: height,
      deviceScaleFactor: parseFloat(dpr),
    },
    headless: chromium.headless,
  });

  const page = await browser.newPage();

  if (!withJs) {
    page.setJavaScriptEnabled(false);
  }

  await page.goto(url, {
    waitUntil: ["load", "networkidle0"],
    timeout: 8500,
  });

  let options = {
    type: format,
    encoding: "base64",
    quality: 100,
  };

  let output = await page.screenshot(options);

  await browser.close();

  return output;
}

async function handler(event, context) {
  try {
    const rawUrl = new URL(event.rawUrl);
    const query = rawUrl.searchParams;
    const url = decodeURIComponent(rawUrl.pathname.split("/").slice(-2).shift());
    const width = parseInt(query.get("width")) || 1200;
    const height = parseInt(query.get("height")) || 630;
    const format = "jpeg";
    const dpr = 1.4;

    if (!isValidUrl(url)) throw new Error(`Invalid \`url\`: ${url}`);

    let output = await screenshot(url, format, width, height, dpr);

    console.log(width, height, format, dpr, url);

    return {
      statusCode: 200,
      headers: {
        "content-type": `image/${format}`,
      },
      body: output,
      isBase64Encoded: true,
    };
  } catch (error) {
    console.log("Error", error);

    return {
      statusCode: 400,
      headers: {
        "content-type": "plain/text",
        "x-error-message": error.message,
      },
      body: error.message,
    };
  }
}

exports.handler = builder(handler);
