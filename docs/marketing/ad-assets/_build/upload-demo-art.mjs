// Puts the made-up demo art into the LOCAL R2 bucket under the keys the demo seed expects (scripts/tutorials/seed-demo.mjs photos.json).
// Usage: node upload-demo-art.mjs <photos.json> <artDir> <persistDir> <wranglerBin>
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const [pj, art, persist, bin] = process.argv.slice(2);
JSON.parse(readFileSync(pj, "utf8")).forEach((x, i) => {
  const r = spawnSync(bin, ["r2", "object", "put", "socal-lights-photos/" + x.key, "--local", "--persist-to", persist, "--file", `${art}/home-${(i % 6) + 1}.jpg`, "--content-type", "image/jpeg"], { encoding: "utf8" });
  console.log(x.key, r.status);
});
