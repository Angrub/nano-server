import globals from "globals";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import pluginPrettier from "eslint-plugin-prettier";
import { defineConfig } from "eslint/config";

export default defineConfig([
	{
		files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
		languageOptions: { globals: globals.browser },
		plugins: {
			prettier: pluginPrettier,
		},
		rules: {
			"no-console": "warn",
			"no-debugger": "error",
		},
	},
	tseslint.configs.recommended,
	prettier,
]);
