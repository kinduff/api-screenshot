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

async function screenshot(url, format, viewportSize, dpr = 1, withJs = true) {
  const browser = await chromium.puppeteer.launch({
    executablePath: await chromium.executablePath,
    args: chromium.args,
    defaultViewport: {
      width: viewportSize.width,
      height: viewportSize.height,
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
  let pathSplit = event.path.split("/").slice(-2);
  let [url, _cache] = pathSplit;
  let format = "jpeg";
  let viewport = { width: 1200, height: 630 };
  let dpr = 1.4;

  url = decodeURIComponent(url);

  try {
    if (!isValidUrl(url)) throw new Error(`Invalid \`url\`: ${url}`);

    let output = await screenshot(url, format, viewport, dpr);

    console.log(url);

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
