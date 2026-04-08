const fs = require('fs');
const path = require('path');

const directories = ['c:\\MyFile\\workspace\\clothing-mall\\wx-mini'];

const replacements = [
  { regex: /#BA8D59/gi, replacement: '#FF8096' },
  { regex: /%23BA8D59/gi, replacement: '%23FF8096' },
  { regex: /#006699/gi, replacement: '#FF8096' },
  { regex: /%23006699/gi, replacement: '%23FF8096' },
  { regex: /#BCA68E/gi, replacement: '#FF8096' },
  { regex: /%23BCA68E/gi, replacement: '%23FF8096' },
  { regex: /#F1D4A5/gi, replacement: '#FFB6C1' },
  { regex: /#b4282d/gi, replacement: '#FF8096' },
  { regex: /%23b4282d/gi, replacement: '%23FF8096' },
  { regex: /#ab956d/gi, replacement: '#FF8096' },
  { regex: /%23ab956d/gi, replacement: '%23FF8096' },
  { regex: /#cfa568/gi, replacement: '#FF8096' },
  { regex: /#e3bf79/gi, replacement: '#FFB6C1' },
  { regex: /#a48143/gi, replacement: '#FF8096' }
];

function processDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        processDirectory(filePath);
      }
    } else {
      if (/\.(wxss|wxml|js|json)$/.test(file)) {
        let content = fs.readFileSync(filePath, 'utf8');
        let newContent = content;
        for (const { regex, replacement } of replacements) {
          newContent = newContent.replace(regex, replacement);
        }
        if (content !== newContent) {
          fs.writeFileSync(filePath, newContent, 'utf8');
          console.log(`Updated ${filePath}`);
        }
      }
    }
  }
}

for (const dir of directories) {
  processDirectory(dir);
}
console.log('Done!');
