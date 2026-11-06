const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const { GoogleAuth } = require("google-auth-library");

const credentials = JSON.parse(
  Buffer.from(process.env.GA_SERVICE_ACCOUNT_B64, "base64").toString("utf8")
);

const auth = new GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
});

module.exports = new BetaAnalyticsDataClient({ auth });