import { join } from "node:path";

const root = join(import.meta.dir, "..");

const server = Bun.spawn(["bun", "run", "dev"], {
  cwd: join(root, "server"),
  stdout: "inherit",
  stderr: "inherit",
  stdin: "inherit",
  env: process.env,
});

await Bun.sleep(400);

const web = Bun.spawn(["bun", "run", "dev"], {
  cwd: join(root, "web"),
  stdout: "inherit",
  stderr: "inherit",
  stdin: "inherit",
  env: process.env,
});

function shutdown(code = 0) {
  try {
    server.kill();
  } catch {
    /* ignore */
  }
  try {
    web.kill();
  } catch {
    /* ignore */
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const [serverCode, webCode] = await Promise.all([server.exited, web.exited]);
shutdown(serverCode !== 0 || webCode !== 0 ? 1 : 0);
