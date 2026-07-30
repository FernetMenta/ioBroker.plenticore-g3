// ioBroker eslint template configuration file for js and ts files
// Please note that esm or react based modules need additional modules loaded.
import config, { reactConfig } from '@iobroker/eslint-config';
import globals from "globals";

export default [
    ...config,

    {
        // specify files to exclude from linting here
        ignores: [
            'build/**',
            'node_modules/**',
            '*.config.mjs',
        ] 
    },

    {
        files: ['**/*.jsx'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.browser,
            },
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        rules: {
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
        },
    },

    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.node,
            }
        }
    },

    {
        rules: {
            // 'jsdoc/require-jsdoc': 'off',
        }
    },

    ...reactConfig,
];
