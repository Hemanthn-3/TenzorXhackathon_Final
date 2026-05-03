const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let newContent = content.replace(/'Playfair Display',serif/g, "'Inter', sans-serif")
                                    .replace(/"'Playfair Display',serif"/g, '"\'Inter\', sans-serif"')
                                    .replace(/'DM Sans',sans-serif/g, "'Inter', sans-serif")
                                    .replace(/"'DM Sans',sans-serif"/g, '"\'Inter\', sans-serif"');
            if (content !== newContent) {
                fs.writeFileSync(fullPath, newContent);
                console.log(`Updated fonts in ${fullPath}`);
            }
        }
    }
}

processDir(path.resolve('./src'));
