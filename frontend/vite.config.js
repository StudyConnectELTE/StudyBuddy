// HELYES v4 plugin sorrend:
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),  // ELŐBB Tailwind!
    react()
  ],
})
