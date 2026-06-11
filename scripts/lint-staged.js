const { spawn } = require("child_process");

const files = process.argv.slice(2);

// If no files are passed, just exit
if (files.length === 0) {
  process.exit(0);
}

const args = ["--fix", "--no-error-on-unmatched-pattern", ...files];

console.log(`Running eslint on ${files.length} files...`);

const child = spawn("npx", ["eslint", ...args], {
  stdio: "inherit",
  shell: true,
});

child.on("close", (code) => {
  if (code !== 0) {
    console.error("\n\x1b[31mLinting failed! Please fix the errors above.\x1b[0m");
    process.exit(code);
  }
  process.exit(0);
});
