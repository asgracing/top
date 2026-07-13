import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const pageNames = ["home", "races", "driver", "cars", "fun-stats", "community", "news", "bans"];

test("page modules do not import sibling page implementations", async () => {
  const violations = [];
  for (const page of pageNames) {
    const directory = resolve(root, "src/pages", page);
    for (const file of await readdir(directory)) {
      if (!file.endsWith(".js")) continue;
      const source = await readFile(resolve(directory, file), "utf8");
      for (const sibling of pageNames.filter(name => name !== page)) {
        if (source.includes(`../${sibling}/`)) violations.push(`${page}/${file} -> ${sibling}`);
      }
    }
  }
  assert.deepEqual(violations, []);
});

test("shared modules do not import page implementations", async () => {
  const violations = [];
  for (const file of await readdir(resolve(root, "src/shared"))) {
    if (!file.endsWith(".js")) continue;
    const source = await readFile(resolve(root, "src/shared", file), "utf8");
    if (source.includes("../pages/")) violations.push(file);
  }
  assert.deepEqual(violations, []);
});
