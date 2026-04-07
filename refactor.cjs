const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') {
        walk(path.join(dir, file), fileList);
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        fileList.push(path.join(dir, file));
      }
    }
  }
  return fileList;
}

const files = walk(path.join(__dirname, 'src'));

for (const file of files) {
  // Bỏ qua axiosClient.ts
  if (file.includes('axiosClient.ts')) continue;
  
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Thay thế "import axios from 'axios';" sang "import axios from '@/src/lib/axiosClient';"
  if (content.includes("import axios from 'axios';")) {
    content = content.replace(/import axios from 'axios';/g, "import axios from '@/src/lib/axiosClient';");
    changed = true;
  }
  if (content.includes('import axios from "axios";')) {
    content = content.replace(/import axios from "axios";/g, "import axios from '@/src/lib/axiosClient';");
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated:', file);
  }
}
