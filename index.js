#!/usr/bin/env node

const process = require('process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const args = process.argv;

const filenameIndex = args.findIndex(a => a.endsWith('index.js'));

if (filenameIndex == -1) {
    console.error("I don't know how this happens. Submit an issue at github.com/prosif/glob");
    console.error(args);
    process.exit(1);
}

if (args.length < filenameIndex + 2) {
    console.error("Invalid params. Input and output directory required");
    process.exit(1);
}

const inDir = args[filenameIndex + 1];
const outDir = args[filenameIndex + 2];

fs.readdir(inDir, (err, entries) => {
    const times = new Array();
    const entryMap = {};

    entries.forEach(entry => {
        const contentPath = path.join(inDir, path.join(entry, 'content.txt'));
        const imageBasePath = path.join(inDir, path.join(entry, 'image'));
        const hasJpg = fs.existsSync(imageBasePath + '.jpg'); 
        const hasPng = fs.existsSync(imageBasePath + '.png'); 
        const hasSvg = fs.existsSync(imageBasePath + '.svg'); 

        const hasContent = fs.existsSync(contentPath);

        if (hasContent) {
            const info = fs.statSync(contentPath);
            times.push(info.birthtimeMs);

            const hasImage = hasJpg || hasPng || hasSvg;
            let imagePath = null;
            if (hasJpg) {
                imagePath = imageBasePath + '.jpg';
            }
    
            if (hasPng) {
                if (hasJpg) {
                    console.warn("Multiple images found for " + entry + ". Ignoring png");
                } else {
                    imagePath = imageBasePath + '.png';
                }
            }
    
            if (hasSvg) {
                if (hasJpg || hasPng) {
                    console.warn("Multiple images found for " + entry + ". Ignoring svg");
                } else {
                    imagePath = imageBasePath + '.svg';
                }
            }

            entryMap['' + info.birthtimeMs] = {entry, info, imagePath, contentPath};
        } else {
            console.warn('Unable to find content at ' + contentPath);
        }
    });

    const sortedEntries = new Array();
    times.sort().forEach(time => {
        const entry = entryMap['' + time];
        sortedEntries.push(entry);
    });

    writeOutput(sortedEntries, outDir);
});


const writeOutput = (entries, outDir) => {
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir);
    }

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const title = entry.entry;

        const header = `<h1>${entry.entry}</h1>`;
        const mainContent = fs.readFileSync(entry.contentPath).toString().replaceAll(os.EOL, `</p><p>`);
        const content = `<p>${mainContent}</p>`;
        let imageDiv = '';
        if (entry.imagePath) {
            // lol this sucks
            const fileExtension = entry.imagePath.split('.')[entry.imagePath.split('.').length - 1]; 
            fs.copyFileSync(entry.imagePath, path.join(outDir, `${i + 1}.${fileExtension}`));
            imageDiv = `<div id="image"><img src="/${i + 1}.${fileExtension}"></img></div>`;
        }

        const prevLink = i === 0 ? '' : `<a class='prev' href="/${i}.html">${i} - ${entries[i - 1].entry}</a>`;
        const nextLink = i === entries.length - 1 ? '' : `<a class='next' href="/${i + 2}.html">${i + 2} - ${entries[i + 1].entry}</a>`;

        const createdText = `Created ${new Date(entry.info.birthtimeMs).toUTCString()}`;
        const updatedText = `Last updated ${new Date(entry.info.mtimeMs).toUTCString()}`;

        const meta = `<div><div><strong>${createdText}</strong></div><div><strong>${updatedText}</strong></div></div>`;

        const links = `<div>${prevLink}${nextLink}</div>`;

        const outputHtml = `<!DOCTYPE HTML><html><head><link rel="stylesheet" href="style.css"><title>${title}</title></head><body>${links}${header}${imageDiv}${meta}${content}</body></html>`;
        fs.writeFileSync(path.join(outDir, '' + (i + 1) + '.html'), outputHtml);

        if (i === entries.length - 1) {
            fs.writeFileSync(path.join(outDir, 'index.html'), outputHtml);
        }
    };
    
    fs.copyFileSync(path.join(__dirname, 'style.css'), path.join(outDir, 'style.css'));
}
