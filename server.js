const express = require("express");
const path = require("path");
const { inspectCookiePayload } = require("./src/lib/cookieInspector");

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/inspect", (req, res) => {
  try {
    const result = inspectCookiePayload(req.body ?? {});
    res.json(result);
  } catch (error) {
    res.status(400).json({
      verdict: "bad",
      title: "Inspection failed",
      message: error instanceof Error ? error.message : "Unexpected server error",
    });
  }
});

app.use((error, _req, res, _next) => {
  res.status(500).json({
    verdict: "bad",
    title: "Inspection failed",
    message: error instanceof Error ? error.message : "Unexpected server error",
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Enz staff checker listening on http://localhost:${port}`);
  });
}

module.exports = { app };
