const { Telegraf } = require("telegraf");
const { checkCookieBatch } = require("./checker");

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error("Missing TELEGRAM_BOT_TOKEN environment variable.");
  process.exit(1);
}

const bot = new Telegraf(token);

function getHelpText() {
  return [
    "Enz Staff Checker Bot",
    "",
    "Usage format:",
    "/check",
    "cookie: session=abc123; token=xyz",
    "method: GET",
    "timeout: 10000",
    "endpoints:",
    "https://api.example.com/me",
    "https://api.example.com/session/check",
    "",
    "Notes:",
    "- cookie: required",
    "- endpoints: required (one URL per line after 'endpoints:')",
    "- method: optional (default GET)",
    "- timeout: optional in milliseconds (default 10000)",
  ].join("\n");
}

function parseCheckInput(text) {
  const lines = text.split("\n").map((line) => line.trim());
  const payload = {
    cookie: "",
    method: "GET",
    timeoutMs: 10000,
    endpoints: [],
  };

  let inEndpoints = false;

  for (const line of lines) {
    if (!line) {
      continue;
    }

    if (line.toLowerCase() === "/check") {
      continue;
    }

    if (line.toLowerCase().startsWith("cookie:")) {
      payload.cookie = line.slice("cookie:".length).trim();
      inEndpoints = false;
      continue;
    }

    if (line.toLowerCase().startsWith("method:")) {
      payload.method = line.slice("method:".length).trim().toUpperCase() || "GET";
      inEndpoints = false;
      continue;
    }

    if (line.toLowerCase().startsWith("timeout:")) {
      const parsed = Number(line.slice("timeout:".length).trim());
      payload.timeoutMs = Number.isFinite(parsed) && parsed > 0 ? parsed : 10000;
      inEndpoints = false;
      continue;
    }

    if (line.toLowerCase() === "endpoints:") {
      inEndpoints = true;
      continue;
    }

    if (inEndpoints) {
      payload.endpoints.push(line);
    }
  }

  return payload;
}

function formatSingleResult(item) {
  const status = item.status.toUpperCase();
  const code = item.httpStatus === null ? "N/A" : String(item.httpStatus);
  const preview = item.responsePreview ? `\nPreview: ${item.responsePreview}` : "";

  return [
    `• Endpoint: ${item.endpoint}`,
    `  Result: ${status}`,
    `  HTTP: ${code} (${item.statusText})`,
    `  Time: ${item.elapsedMs}ms`,
    preview,
  ]
    .join("\n")
    .trim();
}

bot.start(async (ctx) => {
  await ctx.reply(getHelpText());
});

bot.help(async (ctx) => {
  await ctx.reply(getHelpText());
});

bot.hears(/^\/check(?:[\s\S]*)$/i, async (ctx) => {
  const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";

  try {
    const parsed = parseCheckInput(text || "");

    if (!parsed.cookie) {
      await ctx.reply("Error: cookie is required.\n\nUse /help for format.");
      return;
    }

    if (!parsed.endpoints.length) {
      await ctx.reply(
        "Error: at least one endpoint is required.\n\nUse /help for format.",
      );
      return;
    }

    await ctx.reply("Checking cookie against endpoints...");

    const data = await checkCookieBatch({
      cookie: parsed.cookie,
      endpoints: parsed.endpoints,
      method: parsed.method,
      timeoutMs: parsed.timeoutMs,
    });

    const header = [
      "Enz Staff Checker Result",
      `Valid: ${data.totals.valid}`,
      `Expired: ${data.totals.expired}`,
      `Bad: ${data.totals.bad}`,
      "",
    ].join("\n");

    const chunks = [];
    let current = header;

    for (const item of data.results) {
      const block = `${formatSingleResult(item)}\n\n`;
      if ((current + block).length > 3800) {
        chunks.push(current.trim());
        current = block;
      } else {
        current += block;
      }
    }

    if (current.trim()) {
      chunks.push(current.trim());
    }

    for (const chunk of chunks) {
      await ctx.reply(chunk);
    }
  } catch (error) {
    await ctx.reply(`Checker failed: ${error.message || "Unknown error"}`);
  }
});

bot.catch((error) => {
  console.error("Telegram bot error:", error.message);
});

console.log("Enz Staff Checker bot started.");
bot.launch();
