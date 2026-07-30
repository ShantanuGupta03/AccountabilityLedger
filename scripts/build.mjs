import { cp, mkdir, rm } from "node:fs/promises";

const output = "dist";
const publicPaths = ["index.html", "404.html", "_headers", "assets", "dashboard", "review", "submit"];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const path of publicPaths) {
  await cp(path, `${output}/${path}`, { recursive: true });
}
