const lines = require('fs').readFileSync('public/index.html', 'utf8').split('\n');
let depth = 0;
for(let i=1580; i<lines.length; i++) {
  const open = (lines[i].match(/<div[^>]*>/g) || []).length;
  const close = (lines[i].match(/<\/div>/g) || []).length;
  depth += open - close;
  if (depth < -1) {
    console.log('Depth dropped below -1 at line', i+1, lines[i].trim());
    break;
  }
}
