// Save this as find-google-ads.js
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Keywords to search for
const keywords = [
  "googleads",
  "doubleclick",
  "g.doubleclick",
  "googlesyndication",
  "adsbygoogle",
  "googleadservices",
  "google-analytics",
  "gtag",
  "google tag manager",
  "gtm",
  "zrt_lookup",
];

// Extensions to search in
const extensions = [".js", ".jsx", ".ts", ".tsx", ".html", ".json", ".css"];

// Function to search for keywords in a file
function searchFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const matches = [];

    keywords.forEach((keyword) => {
      if (content.toLowerCase().includes(keyword.toLowerCase())) {
        matches.push(keyword);
      }
    });

    if (matches.length > 0) {
      console.log(`\x1b[33m${filePath}\x1b[0m`);
      matches.forEach((match) => {
        const lines = content.split("\n");
        lines.forEach((line, i) => {
          if (line.toLowerCase().includes(match.toLowerCase())) {
            console.log(`  Line ${i + 1}: \x1b[36m${line.trim()}\x1b[0m`);
          }
        });
      });
      console.log("");
    }
  } catch (error) {
    console.error(`Error reading ${filePath}: ${error.message}`);
  }
}

// Function to recursively search directories
function searchDirectory(dir) {
  try {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      // Skip node_modules and .git directories
      if (
        stat.isDirectory() &&
        file !== "node_modules" &&
        file !== ".git" &&
        file !== ".next" &&
        file !== "build" &&
        file !== "dist"
      ) {
        searchDirectory(filePath);
      } else if (stat.isFile() && extensions.includes(path.extname(filePath))) {
        searchFile(filePath);
      }
    }
  } catch (error) {
    console.error(`Error searching directory ${dir}: ${error.message}`);
  }
}

// Main execution
console.log("\x1b[32m=== Searching for Google Ads related code ===\x1b[0m\n");

// Check for git grep (faster if available)
try {
  console.log("\x1b[32m=== Fast search using git grep ===\x1b[0m\n");
  const grepPatterns = keywords.map((k) => `-e "${k}"`).join(" ");
  const grepCommand = `git grep -i ${grepPatterns} -- "*.js" "*.jsx" "*.ts" "*.tsx" "*.html" "*.json" "*.css"`;

  const grepResult = execSync(grepCommand, { encoding: "utf8" });
  if (grepResult) {
    console.log(grepResult);
  }
} catch (error) {
  // Fall back to manual search if git grep fails or isn't available
  console.log(
    "Git grep failed or not available, falling back to manual search...\n"
  );
  const projectRoot = process.cwd();
  searchDirectory(projectRoot);
}

// Additional specific checks
console.log(
  "\x1b[32m=== Checking package.json for ad-related dependencies ===\x1b[0m\n"
);
try {
  const packageJson = require(path.join(process.cwd(), "package.json"));
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  const suspiciousDeps = Object.keys(allDeps).filter(
    (dep) =>
      dep.toLowerCase().includes("ad") ||
      dep.toLowerCase().includes("analytics") ||
      dep.toLowerCase().includes("pixel") ||
      dep.toLowerCase().includes("track") ||
      dep.toLowerCase().includes("google") ||
      dep.toLowerCase().includes("tag")
  );

  if (suspiciousDeps.length > 0) {
    console.log("Potentially relevant dependencies:");
    suspiciousDeps.forEach((dep) => {
      console.log(`  \x1b[33m${dep}: ${allDeps[dep]}\x1b[0m`);
    });
  } else {
    console.log("No suspicious dependencies found in package.json");
  }
} catch (error) {
  console.error(`Error checking package.json: ${error.message}`);
}

console.log("\n\x1b[32m=== Checking for <head> injections ===\x1b[0m\n");
// Check common locations for head injections
[
  "./public/index.html",
  "./src/index.html",
  "./pages/_document.js",
  "./pages/_document.tsx",
  "./src/pages/_document.js",
  "./src/pages/_document.tsx",
].forEach((file) => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`Checking ${file}...`);
    searchFile(filePath);
  }
});
