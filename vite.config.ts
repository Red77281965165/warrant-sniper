import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 載入當前環境變數
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    build: {
      outDir: 'build',
    },
    // 重要：這段設定讓你的前端程式碼可以讀取 process.env.API_KEY
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    }
  }
})