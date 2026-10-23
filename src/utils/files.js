const fs = require('fs');
const path = require('path');
const config = require('../config');

function storedPath(storedName) {
  return path.join(config.uploadDir, path.basename(storedName));
}

function removeStoredFiles(storedNames = []) {
  for (const name of storedNames) {
    fs.unlink(storedPath(name), () => {});
  }
}

function decodeOriginalName(name) {
  return Buffer.from(name, 'latin1').toString('utf8');
}

module.exports = { storedPath, removeStoredFiles, decodeOriginalName };
