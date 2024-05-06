/* eslint-disable @typescript-eslint/naming-convention */
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin'

export default tseslint.config(
    ...tseslint.configs.strict,
    ...tseslint.configs.stylistic,
    {
        plugins: {
            '@stylistic': stylistic
        },
        rules: {
            "@typescript-eslint/no-explicit-any": 'off',
            "@typescript-eslint/no-dynamic-delete": 'off',
            "@typescript-eslint/no-unused-vars": 'off',
            "@typescript-eslint/no-empty-interface": 'off',
            "@typescript-eslint/no-var-requires": "error",
            "@typescript-eslint/explicit-module-boundary-types": ["error", {
                "allowArgumentsExplicitlyTypedAsAny": true
            }],
            "@typescript-eslint/naming-convention": ["error", {
                "selector": "default",
                "format": ["camelCase"],
                "leadingUnderscore": "allow"
            }, {
                "selector": "typeLike",
                "format": ["PascalCase"]
            }, {
                "selector": "objectLiteralProperty",
                "format": ["PascalCase", "camelCase", "snake_case"],
                "leadingUnderscore": "allow"
            }, {
                "selector": "typeProperty",
                "format": ["PascalCase", "camelCase"],
                "leadingUnderscore": "allow"
            }, {
                "selector": "enumMember",
                "format": ["UPPER_CASE"]
            }, {
                "selector": "property",
                "modifiers": ["readonly", "static"],
                "format": ["UPPER_CASE"]
            }],
            "@stylistic/indent": ["error", 4, { "MemberExpression": 1, "SwitchCase": 1 }],
            "@stylistic/brace-style": ["error", "allman", { "allowSingleLine": false }],
            "@stylistic/linebreak-style": ["error", "unix"],
            "@stylistic/max-len": ["error", {
                "code": 120,
                "tabWidth": 4,
                "ignoreComments": true,
                "ignoreTrailingComments": true,
                "ignoreUrls": true,
                "ignoreStrings": true,
                "ignoreTemplateLiterals": true,
                "ignoreRegExpLiterals": true
            }],
            "@stylistic/multiline-ternary": ["error", "always-multiline"],
            "@stylistic/new-parens": "error",
            "@stylistic/newline-per-chained-call": ["error", { "ignoreChainWithDepth": 3 }],
            "@stylistic/no-extra-semi": "error",
            "@stylistic/no-floating-decimal": "error",
            "@stylistic/no-multiple-empty-lines": ["error", { "max": 2, "maxEOF": 1 }],
            "@stylistic/switch-colon-spacing": "error",
            "@stylistic/type-annotation-spacing": "error",
            "@stylistic/type-generic-spacing": ["error"],
            "@stylistic/type-named-tuple-spacing": ["error"],
            "@stylistic/wrap-regex": "error",
            "@stylistic/yield-star-spacing": ["error", "both"],
        }
    }, {
        "files": ["src/di/**/*.ts"],
        "rules": {
            "@typescript-eslint/no-extraneous-class": 'off',
        }
    }, {
        "files": ["src/loaders/**/*.ts"],
        "rules": {
            "@typescript-eslint/no-var-requires": "off"
        }
    }
);
