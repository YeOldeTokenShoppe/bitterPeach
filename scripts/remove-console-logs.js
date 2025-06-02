#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get the file path from command line arguments
const filePath = process.argv[2];

if (!filePath) {
  console.error('Error: Please provide a file path as an argument.');
  process.exit(1);
}

const absolutePath = path.resolve(filePath);

fs.readFile(absolutePath, 'utf8', (err, data) => {
  if (err) {
    console.error(`Error reading file: ${absolutePath}`, err);
    process.exit(1);
  }

  // Regex to find console.log statements.
  // This regex attempts to match:
  // - console.log(...)
  // - console.log (...)
  // - lines that may start with whitespace before console.log
  // - console.log statements that might span multiple lines (basic version, won't handle complex cases perfectly)
  // - different types of quotes or no quotes for simple logs
  // It aims to remove the entire line where console.log is found.
  const regex = /^.*console\.log\s*\(.*\);?\s*$/gm;
  
  const cleanedData = data.replace(regex, '');

  // If no changes were made, don't rewrite the file
  if (cleanedData === data) {
    console.log(`No console.log statements found in ${absolutePath}. File not changed.`);
    process.exit(0);
  }

  fs.writeFile(absolutePath, cleanedData, 'utf8', (err) => {
    if (err) {
      console.error(`Error writing file: ${absolutePath}`, err);
      process.exit(1);
    }
    console.log(`Successfully removed console.log statements from ${absolutePath}`);
  });
}); 