import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { readdirSync } from 'fs'
import { resolve } from 'path'

export default defineConfig({
	base: '/',
	plugins: [tailwindcss()],
	build: {
		rollupOptions: {
			input: Object.fromEntries(
				readdirSync('.')
					.filter(file => file.endsWith('.html'))
					.map(file => [
						file.replace('.html', ''),
						resolve(__dirname, file)
					])
			)
		},
		sourcemap: true,
	}
});