/**
 * Copyright 2024 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 */
'use strict';

const fs = require('node:fs');
const { execSync } = require('node:child_process');
const { deleteFoldersRecursive, npmInstall, copyFiles } = require('@iobroker/build-tools');

const SRC = 'src-admin';

function buildVite() {
    console.log(`[${new Date().toISOString()}] Building admin UI with Vite...`);
    execSync('npx vite build', {
        cwd: `${__dirname}/${SRC}`,
        stdio: 'inherit',
    });
    console.log(`[${new Date().toISOString()}] Build completed.`);
}

function copyAllFiles() {
    deleteFoldersRecursive('admin', ['.png', '.json', 'i18n']);

    copyFiles(
        [
            `${SRC}/build/**`,
            `!${SRC}/build/index.html`,
            `!${SRC}/build/static/media/*.svg`,
            `!${SRC}/build/static/media/*.txt`,
            `!${SRC}/build/i18n/*`,
            `!${SRC}/build/i18n`,
        ],
        'admin',
    );

    copyFiles(`${SRC}/build/index.html`, 'admin');
    fs.renameSync('admin/index.html', 'admin/index_m.html');
}

function clean() {
    deleteFoldersRecursive('admin', ['.png', '.json', 'i18n']);
    deleteFoldersRecursive(`${SRC}/build`);
}

function installNpmLocal() {
    if (fs.existsSync(`${SRC}/node_modules`)) {
        return Promise.resolve();
    }
    return npmInstall(`${__dirname.replace(/\\/g, '/')}/${SRC}/`);
}

function patchFiles() {
    const adminIndex = `${__dirname}/admin/index_m.html`;
    if (fs.existsSync(adminIndex)) {
        let code = fs.readFileSync(adminIndex).toString('utf8');
        code = code.replace(
            /\s*<script>\s*const script = document\.createElement[\s\S]*?<\/script>/,
            '\n    <script type="text/javascript" src="./../../lib/js/socket.io.js"></script>',
        );
        fs.writeFileSync(adminIndex, code);
    }
}

if (process.argv.find(arg => arg === '--0-clean')) {
    clean();
} else if (process.argv.find(arg => arg === '--1-npm')) {
    npmInstall(`${__dirname.replace(/\\/g, '/')}/${SRC}/`).catch(e => {
        console.error(`Cannot install: ${e}`);
        process.exit(1);
    });
} else if (process.argv.find(arg => arg === '--2-build')) {
    buildVite();
} else if (process.argv.find(arg => arg === '--3-copy')) {
    copyAllFiles();
} else if (process.argv.find(arg => arg === '--4-patch')) {
    patchFiles();
} else {
    clean();

    installNpmLocal()
        .then(() => buildVite())
        .then(() => copyAllFiles())
        .then(() => patchFiles());
}
