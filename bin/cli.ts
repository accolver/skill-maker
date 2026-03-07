#!/usr/bin/env bun

import { existsSync, mkdirSync, cpSync, rmSync, readdirSync, statSync } from "fs";
import { join, basename, resolve } from "path";
import { homedir, tmpdir } from "os";

// ── Constants ──────────────────────────────────────────────────────────────

const REPO = "accolver/skill-maker";
const TARBALL_URL = `https://api.github.com/repos/${REPO}/tarball/main`;

const EXAMPLE_SKILLS = [
  "api-doc-generator",
  "changelog-generator",
  "code-reviewer",
  "database-migration",
  "error-handling",
  "git-conventional-commits",
  "monitoring-setup",
  "pdf-toolkit",
  "pr-description",
] as const;

const ALL_SKILLS = ["skill-maker", ...EXAMPLE_SKILLS] as const;

type SkillName = (typeof ALL_SKILLS)[number];

const CLIENT_DIRS: Record<string, string> = {
  claude: join(homedir(), ".claude"),
  opencode: join(homedir(), ".config", "opencode"),
};

const CANONICAL_SKILLS_DIR = join(homedir(), ".agents", "skills");

// ── ANSI helpers ───────────────────────────────────────────────────────────

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;

// ── CLI parsing ────────────────────────────────────────────────────────────

interface ParsedArgs {
  command: string | undefined;
  skills: string[];
  all: boolean;
  client: string | undefined;
  local: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2); // skip bun and script path
  const result: ParsedArgs = {
    command: undefined,
    skills: [],
    all: false,
    client: undefined,
    local: false,
    help: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--all") {
      result.all = true;
    } else if (arg === "--local") {
      result.local = true;
    } else if (arg === "--client" && i + 1 < args.length) {
      result.client = args[++i];
    } else if (!arg.startsWith("-")) {
      if (!result.command) {
        result.command = arg;
      } else {
        result.skills.push(arg);
      }
    } else {
      console.error(red(`Unknown flag: ${arg}`));
      process.exit(1);
    }
    i++;
  }

  return result;
}

// ── Help text ──────────────────────────────────────────────────────────────

function printHelp(): void {
  console.log(`
${bold("skill-maker")} — install Agent Skills from the skill-maker repository

${bold("USAGE")}
  ${cyan("bunx skill-maker")} ${dim("<command>")} ${dim("[options]")}

${bold("COMMANDS")}
  ${cyan("install")} ${dim("[skill-names...]")}   Install skills (always includes skill-maker)
  ${cyan("list")}                       List all available skills

${bold("INSTALL OPTIONS")}
  ${dim("--all")}          Install all available skills (skill-maker + 9 examples)
  ${dim("--client")} ${dim("<name>")}  Force install to a specific client directory
                   Supported: claude, opencode
  ${dim("--local")}        Also install to ./agents/skills/ in the current directory

${bold("EXAMPLES")}
  ${dim("# Install just skill-maker")}
  bunx skill-maker install

  ${dim("# Install skill-maker + specific example skills")}
  bunx skill-maker install pdf-toolkit code-reviewer

  ${dim("# Install everything")}
  bunx skill-maker install --all

  ${dim("# Force install for Claude Code")}
  bunx skill-maker install --client claude

  ${dim("# Also install locally in current project")}
  bunx skill-maker install pdf-toolkit --local

${bold("AVAILABLE SKILLS")}
  ${bold("skill-maker")}                ${dim("Creates other agent skills with eval-driven development")}
  ${EXAMPLE_SKILLS.map((s) => `${s}`).join("\n  ")}

${bold("INSTALL LOCATIONS")}
  Skills are always installed to ${dim("~/.agents/skills/")}
  Additionally installed to detected client directories:
    ${dim("~/.claude/skills/")}            ${dim("(if ~/.claude/ exists)")}
    ${dim("~/.config/opencode/skills/")}   ${dim("(if ~/.config/opencode/ exists)")}
`);
}

// ── List command ───────────────────────────────────────────────────────────

function listSkills(): void {
  console.log(`\n${bold("Available skills:")}\n`);
  console.log(`  ${green("skill-maker")}  ${dim("— Creates other agent skills with eval-driven development")}`);
  console.log(`  ${dim("Always installed with every install command")}\n`);
  console.log(`  ${bold("Example skills:")}`);

  const descriptions: Record<string, string> = {
    "api-doc-generator": "Generates API documentation from code",
    "changelog-generator": "Creates changelogs from git history",
    "code-reviewer": "Reviews code for quality, bugs, and best practices",
    "database-migration": "Creates safe database migration scripts",
    "error-handling": "Adds comprehensive error handling patterns",
    "git-conventional-commits": "Writes conventional commit messages",
    "monitoring-setup": "Sets up application monitoring and alerting",
    "pdf-toolkit": "Extracts text, tables, and images from PDFs with OCR",
    "pr-description": "Writes detailed pull request descriptions",
  };

  for (const skill of EXAMPLE_SKILLS) {
    console.log(`  ${cyan(skill)}  ${dim(`— ${descriptions[skill] || ""}`)}`);
  }

  console.log(`\n${dim("Install with:")} bunx skill-maker install ${dim("<skill-name>")}`);
  console.log(`${dim("Install all:")}  bunx skill-maker install --all\n`);
}

// ── GitHub download ────────────────────────────────────────────────────────

async function downloadAndExtract(): Promise<string> {
  const tmpDir = join(tmpdir(), `skill-maker-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  console.log(dim("  Downloading from GitHub..."));

  const response = await fetch(TARBALL_URL, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "skill-maker-cli",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
  }

  const tarPath = join(tmpDir, "repo.tar.gz");
  const buffer = await response.arrayBuffer();
  await Bun.write(tarPath, buffer);

  console.log(dim("  Extracting..."));

  const extractDir = join(tmpDir, "extracted");
  mkdirSync(extractDir, { recursive: true });

  const proc = Bun.spawnSync(["tar", "xzf", tarPath, "-C", extractDir], {
    stderr: "pipe",
  });

  if (proc.exitCode !== 0) {
    throw new Error(`tar extraction failed: ${proc.stderr.toString()}`);
  }

  // GitHub tarballs have a top-level directory like accolver-skill-maker-<sha>/
  const entries = readdirSync(extractDir);
  if (entries.length !== 1) {
    throw new Error(`Expected one top-level directory in tarball, found ${entries.length}`);
  }

  return join(extractDir, entries[0]);
}

// ── Skill source path resolution ───────────────────────────────────────────

function getSkillSourcePath(repoDir: string, skillName: string): string | null {
  if (skillName === "skill-maker") {
    const p = join(repoDir, "skill-maker");
    return existsSync(join(p, "SKILL.md")) ? p : null;
  }

  const p = join(repoDir, "examples", skillName);
  return existsSync(join(p, "SKILL.md")) ? p : null;
}

// ── Copy skill to target directory ─────────────────────────────────────────

function installSkillTo(sourceDir: string, skillName: string, targetBase: string): string {
  const targetDir = join(targetBase, skillName);

  mkdirSync(targetBase, { recursive: true });

  // Remove existing if present (idempotent overwrite)
  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true });
  }

  // Copy recursively, but skip node_modules, bun.lock, .DS_Store, evals/
  cpSync(sourceDir, targetDir, {
    recursive: true,
    filter: (src: string) => {
      const name = basename(src);
      if (name === "node_modules" || name === "bun.lock" || name === ".DS_Store") return false;
      if (name === "evals" && statSync(src).isDirectory()) return false;
      return true;
    },
  });

  return targetDir;
}

// ── Detect client directories ──────────────────────────────────────────────

function detectTargetDirs(client: string | undefined, local: boolean): string[] {
  const targets: string[] = [CANONICAL_SKILLS_DIR];

  if (client) {
    const clientDir = CLIENT_DIRS[client];
    if (!clientDir) {
      console.error(red(`Unknown client: ${client}`));
      console.error(dim(`Supported clients: ${Object.keys(CLIENT_DIRS).join(", ")}`));
      process.exit(1);
    }
    const skillsDir = join(clientDir, "skills");
    if (!targets.includes(skillsDir)) {
      targets.push(skillsDir);
    }
  } else {
    // Auto-detect installed clients
    for (const [name, dir] of Object.entries(CLIENT_DIRS)) {
      if (existsSync(dir)) {
        const skillsDir = join(dir, "skills");
        if (!targets.includes(skillsDir)) {
          targets.push(skillsDir);
        }
      }
    }
  }

  if (local) {
    const localDir = resolve("./agents/skills");
    if (!targets.includes(localDir)) {
      targets.push(localDir);
    }
  }

  return targets;
}

// ── Post-install message ───────────────────────────────────────────────────

function printPostInstall(): void {
  console.log(`
${bold("Getting started with skill-maker:")}

  Once installed, ask your AI coding agent to create a skill:

  ${dim('> "Create a skill for writing git commit messages"')}
  ${dim('> "Build a SKILL.md that helps with code review"')}
  ${dim('> "Package this debugging process as a skill"')}

  The agent will follow a 5-phase workflow:
    1. ${cyan("Capture intent")} — understand what the skill should do
    2. ${cyan("Draft")}          — write SKILL.md, scripts, and test cases
    3. ${cyan("Eval loop")}      — test with/without skill, grade, iterate
    4. ${cyan("Refine")}         — improve based on what failed
    5. ${cyan("Finalize")}       — validate and install

  ${dim("Learn more:")} https://github.com/accolver/skill-maker
  ${dim("Agent Skills spec:")} https://agentskills.io
`);
}

// ── Install command ────────────────────────────────────────────────────────

async function installCommand(args: ParsedArgs): Promise<void> {
  // Determine which skills to install
  const skillsToInstall = new Set<string>(["skill-maker"]); // always included

  if (args.all) {
    for (const s of ALL_SKILLS) skillsToInstall.add(s);
  } else {
    for (const s of args.skills) {
      if (!ALL_SKILLS.includes(s as SkillName)) {
        console.error(red(`Unknown skill: ${s}`));
        console.error(dim(`Available skills: ${ALL_SKILLS.join(", ")}`));
        process.exit(1);
      }
      skillsToInstall.add(s);
    }
  }

  // Determine target directories
  const targetDirs = detectTargetDirs(args.client, args.local);

  console.log(`\n${bold("skill-maker install")}\n`);
  console.log(dim(`  Skills: ${[...skillsToInstall].join(", ")}`));
  console.log(dim(`  Targets: ${targetDirs.join(", ")}`));
  console.log();

  // Download repo
  let repoDir: string;
  try {
    repoDir = await downloadAndExtract();
  } catch (err: any) {
    console.error(red(`Failed to download from GitHub: ${err.message}`));
    process.exit(2);
  }

  // Install each skill to each target
  const installed: { skill: string; paths: string[] }[] = [];

  for (const skill of skillsToInstall) {
    const sourcePath = getSkillSourcePath(repoDir, skill);
    if (!sourcePath) {
      console.error(red(`  Skill not found in repository: ${skill}`));
      process.exit(3);
    }

    const paths: string[] = [];
    for (const target of targetDirs) {
      const installedPath = installSkillTo(sourcePath, skill, target);
      paths.push(installedPath);
    }
    installed.push({ skill, paths });
  }

  // Clean up temp dir
  try {
    rmSync(join(tmpdir(), `skill-maker-${repoDir.split("skill-maker-")[1]?.split("/")[0] || ""}`), {
      recursive: true,
    });
  } catch {
    // best effort cleanup
  }

  // Print results
  console.log(green(bold("  Done!\n")));

  for (const { skill, paths } of installed) {
    console.log(`  ${green("✓")} ${bold(skill)}`);
    for (const p of paths) {
      console.log(`    ${dim(p)}`);
    }
  }

  printPostInstall();
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (args.help || !args.command) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  switch (args.command) {
    case "install":
      await installCommand(args);
      break;
    case "list":
      listSkills();
      break;
    default:
      console.error(red(`Unknown command: ${args.command}`));
      console.error(dim("Run with --help for usage information"));
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(red(`Fatal error: ${err.message}`));
  process.exit(1);
});
