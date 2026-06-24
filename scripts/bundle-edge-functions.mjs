import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, ".deploy-bundles");
mkdirSync(outDir, { recursive: true });

const functions = [
  { name: "syncpay-cashin", verify_jwt: false },
  { name: "syncpay-webhook", verify_jwt: false },
  { name: "send-notification", verify_jwt: false, shared: true },
  { name: "subscription-reminders", verify_jwt: false },
];

for (const fn of functions) {
  const files = [
    {
      name: "index.ts",
      content: readFileSync(join(root, "supabase/functions", fn.name, "index.ts"), "utf8"),
    },
  ];
  if (fn.shared) {
    const indexPath = join(root, "supabase/functions", fn.name, "index.ts");
    let indexContent = readFileSync(indexPath, "utf8");
    indexContent = indexContent.replace(
      'from "../_shared/email.ts"',
      'from "./_shared/email.ts"'
    );
    files[0].content = indexContent;
    files.push({
      name: "_shared/email.ts",
      content: readFileSync(join(root, "supabase/functions/_shared/email.ts"), "utf8"),
    });
  }
  writeFileSync(
    join(outDir, `${fn.name}.json`),
    JSON.stringify({ name: fn.name, verify_jwt: fn.verify_jwt, files }, null, 0)
  );
  console.log("bundled", fn.name);
}
