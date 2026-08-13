import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // Base yo'li to'g'ri ko'rsatilgan bo'lishi shart
})