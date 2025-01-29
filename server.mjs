
import { chromium } from "playwright";
import fs from "fs";
import express from "express";


const app = express();
//any middleware that should be used for safety or cors or anything, should eb open to all api, and only the one method
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  next();
});


const defaultGraph = "y=x^2";
const defaultBounds = {
  left: -20,
  right: 20,
  bottom: -20,
  top: 20,
};

//express app, like the http server, but takes only get request, with params graph, and bounds. it uses default values if not provided, and then if so for bounds it is a json object with left, right, top, bottom stringifued, and graph is a string 
app.get("/", async (req, res) => {
  const graphData = req.query.graph || defaultGraph;
  const graphBounds = req.query.bounds ? JSON.parse(req.query.bounds) : defaultBounds;
  console.log("Request received", req.query.graph, req.query.bounds);
  const screenshot = await generateGraphImage(req, graphData, graphBounds);
  if (typeof screenshot === "string") {
    res.send(screenshot);
  } else {
    res.writeHead(200, { "Content-Type": "image/png" });
    res.end(screenshot);
  }
});

// app listen on port env port or 3000
app.listen(process.env.PORT || 3000);

console.log("Listening on main port", process.env.PORT || 3000);

async function generateGraphImage(req, graphData, graphBounds) {

  let chromiumPath = chromium.executablePath();
  // console.log("Using Chromium executable path:", chromiumPath);

  if (!fs.existsSync(chromiumPath)) {
    console.error("Chromium executable not found:", chromiumPath);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server Error." }),
    };
  }

  let browser;
  try {
    browser = await chromium.launch({
      executablePath: chromiumPath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-software-rasterizer"]
    });
  } catch (error) {
    console.error("Error capturing graph:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to generate graph image.", details: error.message }),
    };
  }
  const page = await browser.newPage();

  // page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

  console.log("Generating graph image for", graphData, JSON.stringify(graphData), graphBounds);
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://www.desmos.com/api/v1.10.1/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6"></script>
    </head>
    <body>
      <div id="graph" style="width: 800px; height: 800px;"></div>
      <script>
        const elt = document.getElementById('graph');
        let calculator = Desmos.GraphingCalculator(elt, { expressions: false, settingsMenu: false,zoomButtons:false });

        // Add your function
        calculator.setExpression({ id: 'func', latex: ${JSON.stringify(graphData)} });

        calculator.setMathBounds(${JSON.stringify(graphBounds)});
      </script>
    </body>
    </html>
  `);

  // await page.waitForTimeout(1000); // 1s delay
  const graph = await page.$("#graph");
  const screenshot = await graph.screenshot();

  await browser.close();

  // if (req.headers.accept && req.headers.accept.includes("image/*")) {
  // fix the if statement to check if the request is for an image like in an img tag
  // console.log(req.headers.accept)
  if (req.headers.accept && req.headers.accept.includes("image/*")) {
    return screenshot;
  } else {
    return `<img style="max-height:100%" src="data:image/png;base64,${screenshot.toString("base64")}"/>`;
  }
}