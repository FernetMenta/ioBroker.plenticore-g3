// ioBroker eslint template configuration file for js and ts files
// Please note that esm or react based modules need additional modules loaded.
import config, { reactConfig } from '@iobroker/eslint-config';
import globals from "globals";

export default [
    ...config,

    {
        // specify files to exclude from linting here
        ignores: [
            '.dev-server/*',
            '.vscode/',
            '*.test.js', 
            'test/**/*.js', 
            '*.config.mjs', 
            'build',
            'node_modules/*',
            'src/build/*',
            'src/node_modules/*',
            'admin/static/*', 
            'admin/admin.d.ts',
            '**/adapter-config.d.ts'     
        ] 
    },

    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.node,
                myCustomGlobal: "readonly"
            }
        }
        // ...other config
    },

    {
        // you may disable some 'jsdoc' warnings - but using jsdoc is highly recommended
        // as this improves maintainability. jsdoc warnings will not block buiuld process.
        rules: {
            // 'jsdoc/require-jsdoc': 'off',
        }
    },

    ...reactConfig,
];