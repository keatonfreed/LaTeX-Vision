// import { chromium } from "playwright";
// import fs from "fs";
import http from "http";

// const defaultGraph = "y=x^2";
// const defaultBounds = {
//   left: -20,
//   right: 20,
//   bottom: -20,
//   top: 20,
// };
const app = http.createServer((req, res) => {
  console.log("Request received", req.url);
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Hello World\n");
}).listen(3030);
console.log("Listening on port 3030")

// async function generateGraphImage(req, graphData, graphBounds) {

//   let chromiumPath = chromium.executablePath();
//   console.log("Using Chromium executable path:", chromiumPath);

//   if (!fs.existsSync(chromiumPath)) {
//     console.error("Chromium executable not found:", chromiumPath);
//     return {
//       statusCode: 500,
//       body: JSON.stringify({ error: "Chromium executable not found." }),
//     };
//   }

//   let browser;
//   try {
//     browser = await chromium.launch({
//       executablePath: chromiumPath,
//       headless: true,
//     });
//   } catch (error) {
//     console.error("Error capturing graph:", error);
//     return {
//       statusCode: 500,
//       body: JSON.stringify({ error: "Failed to generate graph image.", details: error.message }),
//     };
//   }
//   const page = await browser.newPage();


//   await page.setContent(`
//     <!DOCTYPE html>
//     <html>
//     <head>
//       <script src="https://www.desmos.com/api/v1.10.1/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6"></script>
//     </head>
//     <body>
//       <div id="graph" style="width: 800px; height: 800px;"></div>
//       <script>
//         const elt = document.getElementById('graph');
//         let calculator = Desmos.GraphingCalculator(elt, { expressions: false, settingsMenu: false,zoomButtons:false });

//         // Add your function
//         calculator.setExpression({ id: 'func', latex: ${JSON.stringify(graphData)} });

//         calculator.setMathBounds(${JSON.stringify(graphBounds)});
//       </script>
//     </body>
//     </html>
//   `);

//   const graph = await page.$("#graph");
//   const screenshot = await graph.screenshot();

//   await browser.close();

//   // return {
//   //   statusCode: 200,
//   //   headers: { "Content-Type": "image/png" },
//   //   body: "data:image/png;base64," + screenshot.toString("base64"),
//   // };
//   //that works for sending json, but just rend real image
//   // return screenshot;
//   //that works for downlaodng image, but not for rendering, this is the correct way to get if its a web page asking it wil just show the image 
//   // return `<img style="max-height:100%" src="data:image/png;base64,${screenshot.toString("base64")}" />`;
//   //works great for web pages, but if called inside an image from another page it will not work, this fixes it so it detects what and send sth right one
//   if (req.headers.accept && req.headers.accept.includes("image/*")) {
//     return screenshot;
//   } else {
//     return `<img style="max-height:100%" src="data:image/png;base64,${screenshot.toString("base64")}"/>`;
//   }
// }