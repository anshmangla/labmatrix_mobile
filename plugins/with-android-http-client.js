// Expo config plugin: gives React Native's Android HTTP client (OkHttp) timeouts and HTTP/2
// keep-alive pings.
//
// React Native's default client has no connect/read/write timeouts and no pings. After the app
// sits in the background or the phone changes network, its shared HTTP/2 connection to the server
// can die silently; every request then waits on it until the app's own timeout (and retries can
// pick the same dead connection again), which looks like endless loading until the app is killed.
//
// This installs a client factory through React Native's official hook
// (OkHttpClientProvider.setOkHttpClientFactory), keeping its cookie jar and cache, plus:
//  - connect timeout 10s, read/write timeouts 20s (the app's per-request timeout still applies)
//  - an HTTP/2 ping every 10s, so a dead connection is detected and replaced
//  - idle connections kept for 30s only, so after time in the background a fresh one is opened
//  - retry when a connection attempt fails
const { withMainApplication } = require("expo/config-plugins");

const MARKER = "// labmatrix: android-http-client";

const IMPORTS = [
  "com.facebook.react.modules.network.OkHttpClientProvider",
  "okhttp3.ConnectionPool",
  "java.util.concurrent.TimeUnit",
];

const SETUP = `    ${MARKER}
    OkHttpClientProvider.setOkHttpClientFactory {
      OkHttpClientProvider.createClientBuilder(applicationContext)
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .writeTimeout(20, TimeUnit.SECONDS)
        .pingInterval(10, TimeUnit.SECONDS)
        .connectionPool(ConnectionPool(5, 30, TimeUnit.SECONDS))
        .retryOnConnectionFailure(true)
        .build()
    }
`;

function addHttpClientSetup(contents) {
  if (contents.includes(MARKER)) return contents; // already applied

  const superOnCreate = /^(\s*)super\.onCreate\(\)\s*\n/m;
  if (!superOnCreate.test(contents)) {
    throw new Error("[with-android-http-client] super.onCreate() not found in MainApplication; the plugin needs updating");
  }
  let out = contents.replace(superOnCreate, (line) => `${line}${SETUP}`);

  const packageLine = /^package [^\n]+\n/m;
  if (!packageLine.test(out)) {
    throw new Error("[with-android-http-client] package declaration not found in MainApplication");
  }
  const missing = IMPORTS.filter((i) => !new RegExp(`^import ${i.replace(/\./g, "\\.")}$`, "m").test(out));
  out = out.replace(packageLine, (line) => `${line}\n${missing.map((i) => `import ${i}`).join("\n")}\n`);
  return out;
}

module.exports = function withAndroidHttpClient(config) {
  return withMainApplication(config, (cfg) => {
    if (cfg.modResults.language !== "kt") {
      throw new Error("[with-android-http-client] expected a Kotlin MainApplication");
    }
    cfg.modResults.contents = addHttpClientSetup(cfg.modResults.contents);
    return cfg;
  });
};

module.exports.addHttpClientSetup = addHttpClientSetup;
