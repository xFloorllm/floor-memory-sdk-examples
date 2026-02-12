import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const serverDir = path.join(projectRoot, "server");

const env = { ...process.env };
if (env.MAVEN_HOME) {
  const mavenBin = path.join(env.MAVEN_HOME, "bin");
  env.PATH = env.PATH ? `${mavenBin}${path.delimiter}${env.PATH}` : mavenBin;
}

const isWindows = process.platform === "win32";
const candidates = isWindows
  ? [
      { command: "mvn.cmd", prefixArgs: [], shell: true, label: "mvn.cmd" },
      { command: "mvnw.cmd", prefixArgs: [], shell: true, label: "mvnw.cmd" },
    ]
  : [
      { command: "mvn", prefixArgs: [], shell: false, label: "mvn" },
      { command: "./mvnw", prefixArgs: [], shell: false, label: "./mvnw" },
      { command: "sh", prefixArgs: ["./mvnw"], shell: false, label: "sh ./mvnw" },
    ];

const canRun = (candidate) => {
  const probe = spawnSync(candidate.command, [...candidate.prefixArgs, "-v"], {
    cwd: serverDir,
    env,
    stdio: "ignore",
    shell: candidate.shell,
  });
  return !probe.error && probe.status === 0;
};

const selected = candidates.find(canRun);
if (!selected) {
  console.error("No Maven runtime found.");
  console.error(
    "Set MAVEN_HOME to a valid Maven installation or ensure Maven Wrapper exists under server/."
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const mvnArgs = args.length > 0 ? args : ["spring-boot:run"];

console.log(`Using ${selected.label} in server/`);
const child = spawn(selected.command, [...selected.prefixArgs, ...mvnArgs], {
  cwd: serverDir,
  env,
  stdio: "inherit",
  shell: selected.shell,
});

const forward = (signal) => {
  if (!child.killed) {
    child.kill(signal);
  }
};

process.on("SIGINT", () => forward("SIGINT"));
process.on("SIGTERM", () => forward("SIGTERM"));

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

