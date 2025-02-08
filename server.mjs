
import { chromium } from "playwright";
import fs from "fs";
import express from "express";

function cleanGraphLatex(input) {
  // console.log(parse)
  // Parse LaTeX input into an AST
  let openAbs = false; // Track open `|` for `\left|` and `\right|`

  let output = input;
  // Check if an assignment (`=`, `<`, `>`, `<=`, `>=`) already exists
  if (!/[=<>]/.test(input)) {
    if (input.includes("y") && !input.includes("x")) {
      output = "x=" + output
    } else {
      output = "y=" + output
    }
  }

  // Add backslash before trigonometric functions if missing
  const trigFuncs = ['sin', 'cos', 'tan', 'csc', 'sec', 'cot', 'arcsin', 'arccos', 'arctan'];
  for (const func of trigFuncs) {
    const regex = new RegExp(`(?<!\\\\)${func}`, 'g');
    output = output.replace(regex, `\\${func}`);
  }

  output = output.replace(/\|/g, (match, offset, fullString) => {
    // Get the surrounding text to check for \left| or \right|

    let beforeLeft = fullString.slice(Math.max(0, offset - 5), offset);
    let beforeRight = fullString.slice(Math.max(0, offset - 6), offset);

    console.log(beforeLeft, beforeRight)
    if (beforeLeft === "\\left" || beforeRight === "\\right") {
      return match; // Already correct, leave it
    }

    if (!openAbs) {
      openAbs = true;
      return "\\left|";
    } else {
      openAbs = false;
      return "\\right|";
    }
  });

  output = output.replace(/[\(\)]/g, (match, offset, fullString) => {
    // Get the surrounding text to check for \left| or \right|
    let beforeLeft = fullString.slice(Math.max(0, offset - 5), offset);
    let beforeRight = fullString.slice(Math.max(0, offset - 6), offset);

    console.log(beforeLeft, beforeRight)
    if (beforeLeft === "\\left" || beforeRight === "\\right") {
      return match; // Already correct, leave it
    }

    if (match === "(") {
      return "\\left" + match;
    } else {
      return "\\right" + match;
    }
  });

  return output

}


function isDeepEqual(obj1, obj2) {
  if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
    return obj1 === obj2;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (let key of keys1) {
    if (!obj2.hasOwnProperty(key) || !isDeepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }

  return true;
}

function getImageAsHtml(imageLink) {
  return `
      <!DOCTYPE html>
      <html style="height:100%">

        <head>
          <title>LaTeX Vision Output</title>
          <link rel="icon" type="image/png" href="/favicon.png" />
        </head>

        <body style="height:100%;display:flex;align-items:center;justify-content:center;background:rgb(14,14,14)">
          <img src="${imageLink}"/>
        </body>

      </html>
      `
}

const app = express();
//any middleware that should be used for safety or cors or anything, should eb open to all api, and only the one method
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  next();
});


const defaultGraph = ["y=x^2"];
const defaultBounds = {
  left: -20,
  right: 20,
  bottom: -20,
  top: 20,
};

app.get("/", async (req, res) => {
  res.sendFile(process.cwd() + '/index.html');

});

app.get("/defaultGraph.png", async (req, res) => {
  res.sendFile(process.cwd() + '/defaultGraph.png');
});

app.get("/favicon.png", async (req, res) => {
  res.sendFile(process.cwd() + '/favicon.png');
});
//express app, like the http server, but takes only get request, with params graph, and bounds. it uses default values if not provided, and then if so for bounds it is a json object with left, right, top, bottom stringifued, and graph is a string 
app.get("/api/v1/", async (req, res) => {
  let startTime = Date.now()
  console.log("Request received", req.query);

  let graphsList = defaultGraph;

  let overridedGraph = false;
  if (req.query.graph && req.query.graph.length > 0 && req.query.graph.length < 1000) {
    let output = cleanGraphLatex(req.query.graph);
    overridedGraph = true;
    graphsList = [output];
  }
  if (req.query.graphs && req.query.graphs.length > 0 && req.query.graphs.length < 1000) {
    try {
      let output = JSON.parse(req.query.graphs);
      if (!Array.isArray(output)) {
        throw new Error("Invalid graphs input");
      }
      output = output.map((graph) => cleanGraphLatex(graph));
      if (overridedGraph) {
        graphsList = graphsList.concat(output);
      } else {
        graphsList = output;
      }
    } catch (error) {
      console.error("Invalid graphs input:", req.query.graphs);
    }
  }

  let graphBounds = { ...defaultBounds };
  try {
    let bounds = JSON.parse(req.query.bounds || "{}");
    if (bounds.left !== undefined && bounds.right !== undefined && bounds.top !== undefined && bounds.bottom !== undefined) {
      graphBounds = bounds;
    }
  } catch (error) {
    console.error("Invalid bounds input:", req.query.bounds);
  }
  if (req.query.left !== undefined) {
    graphBounds.left = parseFloat(req.query.left) ?? graphBounds.left;
  }
  if (req.query.right !== undefined) {
    graphBounds.right = parseFloat(req.query.right) ?? graphBounds.right;
  }
  if (req.query.top !== undefined) {
    graphBounds.top = parseFloat(req.query.top) ?? graphBounds.top;
  }
  if (req.query.bottom !== undefined) {
    graphBounds.bottom = parseFloat(req.query.bottom) ?? graphBounds.bottom;
  }

  function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
  }

  let graphWidth = clamp(((graphBounds.right - graphBounds.left) * 10), 20, 800);
  if (req.query.width !== undefined) {
    graphWidth = clamp(parseInt(req.query.width), 20, 800) || graphWidth;
  }
  let graphHeight = clamp(((graphBounds.top - graphBounds.bottom) * 10), 20, 800);
  if (req.query.height !== undefined) {
    graphHeight = clamp(parseInt(req.query.height), 20, 800) || graphHeight;
  }

  if (isDeepEqual(graphBounds, defaultBounds) && graphsList === defaultGraph && graphWidth === 400 && graphHeight === 400) {
    if (req.headers.accept && req.headers.accept.includes("image/*")) {
      res.writeHead(200, { "Content-Type": "image/png" });
      res.end(fs.readFileSync(process.cwd() + '/defaultGraph.png'));
    } else {
      res.send(getImageAsHtml("/defaultGraph.png"));
    }
    return
  }

  const screenshot = await generateGraphImage(startTime, graphsList, graphBounds, graphWidth, graphHeight);
  if (req.headers.accept && req.headers.accept.includes("image/*")) {
    res.writeHead(200, { "Content-Type": "image/png" });
    res.end(screenshot);
  } else {
    res.send(getImageAsHtml("data:image/png;base64," + screenshot.toString("base64")));
  }
});

// app listen on port env port or 3000
app.listen(process.env.PORT || 3000);

console.log("Listening on main port", process.env.PORT || 3000);

function resetBrowser() {
  if (_browser) {
    _browser.close();
    _browser = null;
    console.log("BROWSER CLOSED")

  }
}

const _browserResetTime = 1000 * 60; // 1000ms * XXs * Xm 

let _browser
let _browserTimeout

async function getBrowser() {
  if (_browser) {
    if (_browserTimeout) clearTimeout(_browserTimeout)
    _browserTimeout = setTimeout(resetBrowser, _browserResetTime);
    return _browser
  };

  let chromiumPath = chromium.executablePath();
  // console.log("Using Chromium executable path:", chromiumPath);

  if (!fs.existsSync(chromiumPath)) {
    console.error("Chromium executable not found:", chromiumPath);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server Error." }),
    };
  }

  try {
    _browser = await chromium.launch({
      executablePath: chromiumPath,
      headless: true,
      args: [
        // "--single-process",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-background-timer-throttling"
      ]
    });
  } catch (error) {
    console.error("Error starting browser:", error);
    return false;
  }

  if (!_browser) {
    console.error("Error Browser not created correctly");
    return false
  }

  console.log("BROWSER LAUNCHED")
  _browserTimeout = setTimeout(resetBrowser, _browserResetTime);

  return _browser
}


async function generateGraphImage(startTime, graphsList, graphBounds, graphWidth = 400, graphHeight = 400) {
  const browser = await getBrowser();

  if (!browser) {
    console.error("Error starting browser _ext");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server Error." }),
    };
  }

  const page = await browser.newPage();

  // page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

  console.log("Generating graph image for graphs:", graphsList, graphBounds);
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://www.desmos.com/api/v1.10.1/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6"></script>
      <style>
      .dcg-graphpaper-branding {
        height:min-content  !important;
        padding-bottom:5px  !important;
        margin: 0  !important;
        right: -12px !important;
        left:unset !important;

        .dcg-powered-by {
          visibility: hidden !important;
        }
        i {
          display:block !important;
          height:min-content !important;
        }
      }
      </style>
    </head>
    <body>
      <div id="graph" style="width: ${graphWidth}px; height: ${graphHeight}px;"></div>
      <script>
        const elt = document.getElementById('graph');
        let MainCalculator = Desmos.GraphingCalculator(elt, { expressions: false, settingsMenu: false,zoomButtons:false });

        // Add your function
        const graphColors = ['#284ab8', '#b82828', '#28b828', '#b828b8', '#28b8b8', '#b8b828'];
        let graphs = ${JSON.stringify(graphsList)};

        let usedColors = [];
        graphs.forEach((graph, i) => {
          const incremColor = graphColors[i % graphColors.length];
          const funcId = 'func_' + i;
          MainCalculator.setExpression({ 
            id: funcId, 
            latex: graph.trim(), 
            lineWidth: 3.5, 
            color: incremColor 
          });
        });
        // MainCalculator.setExpression({ id: 'func', latex: $/{JSON.stringify(graphsList)}, lineWidth: 3.5,color: "#284ab8" });

        MainCalculator.setMathBounds(${JSON.stringify(graphBounds)});
      </script>
    </body>
    </html>
  `);
  await page.waitForTimeout(200);
  const graph = await page.$("#graph");
  const screenshot = await graph.screenshot();

  await page.close();

  // if (req.headers.accept && req.headers.accept.includes("image/*")) {
  // fix the if statement to check if the request is for an image like in an img tag
  // console.log(req.headers.accept)
  console.log("Graph Complete. -", Date.now() - startTime + "ms")
  return screenshot;
}