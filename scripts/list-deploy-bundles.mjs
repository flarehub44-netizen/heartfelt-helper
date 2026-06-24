import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bundleDir = join(root, ".deploy-bundles");
const projectId = "yqevjcrypxepzzbrmqhb";

for (const file of readdirSync(bundleDir).filter((f) => f.endsWith(".json"))) {
  const bundle = JSON.parse(readFileSync(join(bundleDir, file), "utf8"));
  console.log(`\n=== DEPLOY ${bundle.name} verify_jwt=${bundle.verify_jwt} ===`);
  console.log(JSON.stringify({
    project_id: projectId,
    name: bundle.name,
    entrypoint_path: "index.ts",
    verify_jwt: bundle.verify_jwt,
    file_count: bundle.files.length,
    file_names: bundle.files.map((f) => f.name),
  }));
}
