// Firebase Cloud Functions deploy uploads only functions/ and runs plain `npm install`
// remotely — it doesn't understand pnpm's `workspace:*` protocol. This copies the built
// @pharmacy-os/db package into functions/vendor so it can be referenced via a `file:`
// dependency instead, which plain npm resolves fine.
const fs = require("fs");
const path = require("path");

const dbRoot = path.join(__dirname, "..", "..", "packages", "db");
const vendorRoot = path.join(__dirname, "..", "vendor", "pharmacy-os-db");

fs.rmSync(vendorRoot, { recursive: true, force: true });
fs.mkdirSync(vendorRoot, { recursive: true });

fs.cpSync(path.join(dbRoot, "dist"), path.join(vendorRoot, "dist"), { recursive: true });
fs.cpSync(path.join(dbRoot, "generated"), path.join(vendorRoot, "generated"), { recursive: true });

fs.writeFileSync(
  path.join(vendorRoot, "package.json"),
  JSON.stringify(
    {
      name: "@pharmacy-os/db",
      version: "0.0.0",
      private: true,
      main: "dist/index.js",
      types: "dist/index.d.ts",
    },
    null,
    2
  ) + "\n"
);

console.log("Vendored @pharmacy-os/db into functions/vendor/pharmacy-os-db");
