import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { WebSocketServer } from 'ws'
import type { Plugin } from 'vite'

const WS_PORT = 9001

function globalKeysPlugin(): Plugin {
  return {
    name: 'global-keys',
    apply: 'serve',
    configureServer() {
      // Dynamically import so build mode never loads native bindings
      import('uiohook-napi').then(({ UiohookKey, uIOhook }) => {
        const KEY_MAP: Record<number, string> = {
          [UiohookKey.ArrowUp]:    'ArrowUp',
          [UiohookKey.ArrowDown]:  'ArrowDown',
          [UiohookKey.ArrowLeft]:  'ArrowLeft',
          [UiohookKey.ArrowRight]: 'ArrowRight',
          [UiohookKey.X]:          'x',
        }

        const wss = new WebSocketServer({ port: WS_PORT })
        // Track which connections are currently blurred (unfocused)
        const blurred = new Set<import('ws').WebSocket>()

        wss.on('connection', (ws) => {
          // Assume focused until told otherwise
          ws.on('message', (raw) => {
            try {
              const { type } = JSON.parse(raw.toString()) as { type: string }
              if (type === 'blur')  blurred.add(ws)
              if (type === 'focus') blurred.delete(ws)
            } catch { /* ignore malformed messages */ }
          })
          ws.on('close', () => blurred.delete(ws))
        })

        uIOhook.on('keydown', (e) => {
          const key = KEY_MAP[e.keycode]
          if (!key) return
          const msg = JSON.stringify({ key })
          for (const ws of blurred) {
            if (ws.readyState === ws.OPEN) ws.send(msg)
          }
        })

        uIOhook.start()

        // Cleanup on dev server close
        process.on('exit', () => { uIOhook.stop(); wss.close() })
      }).catch((err) => {
        console.warn('[global-keys] Failed to load uiohook-napi:', err.message)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), globalKeysPlugin()],
})
