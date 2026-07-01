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
        // Physical key -> DOM-style "code" string, mirroring KeyboardEvent.code.
        // Full alphabet/digits/punctuation are captured (not just the shortcut
        // keys) so remote note/bug bubbles can be typed into while unfocused.
        const KEY_MAP: Record<number, string> = {
          [UiohookKey.ArrowUp]:    'ArrowUp',
          [UiohookKey.ArrowDown]:  'ArrowDown',
          [UiohookKey.ArrowLeft]:  'ArrowLeft',
          [UiohookKey.ArrowRight]: 'ArrowRight',
          [UiohookKey.ScrollLock]: 'ScrollLock',
          [UiohookKey.Escape]:     'Escape',
          [UiohookKey.Enter]:      'Enter',
          [UiohookKey.Backspace]:  'Backspace',
          [UiohookKey.Delete]:     'Delete',
          [UiohookKey.Space]:      'Space',
          [UiohookKey.A]: 'KeyA', [UiohookKey.B]: 'KeyB', [UiohookKey.C]: 'KeyC', [UiohookKey.D]: 'KeyD',
          [UiohookKey.E]: 'KeyE', [UiohookKey.F]: 'KeyF', [UiohookKey.G]: 'KeyG', [UiohookKey.H]: 'KeyH',
          [UiohookKey.I]: 'KeyI', [UiohookKey.J]: 'KeyJ', [UiohookKey.K]: 'KeyK', [UiohookKey.L]: 'KeyL',
          [UiohookKey.M]: 'KeyM', [UiohookKey.N]: 'KeyN', [UiohookKey.O]: 'KeyO', [UiohookKey.P]: 'KeyP',
          [UiohookKey.Q]: 'KeyQ', [UiohookKey.R]: 'KeyR', [UiohookKey.S]: 'KeyS', [UiohookKey.T]: 'KeyT',
          [UiohookKey.U]: 'KeyU', [UiohookKey.V]: 'KeyV', [UiohookKey.W]: 'KeyW', [UiohookKey.X]: 'KeyX',
          [UiohookKey.Y]: 'KeyY', [UiohookKey.Z]: 'KeyZ',
          [UiohookKey[0]]: 'Digit0', [UiohookKey[1]]: 'Digit1', [UiohookKey[2]]: 'Digit2',
          [UiohookKey[3]]: 'Digit3', [UiohookKey[4]]: 'Digit4', [UiohookKey[5]]: 'Digit5',
          [UiohookKey[6]]: 'Digit6', [UiohookKey[7]]: 'Digit7', [UiohookKey[8]]: 'Digit8',
          [UiohookKey[9]]: 'Digit9',
          [UiohookKey.Comma]:        'Comma',
          [UiohookKey.Period]:       'Period',
          [UiohookKey.Slash]:        'Slash',
          [UiohookKey.Semicolon]:    'Semicolon',
          [UiohookKey.Quote]:        'Quote',
          [UiohookKey.Minus]:        'Minus',
          [UiohookKey.Equal]:        'Equal',
          [UiohookKey.BracketLeft]:  'BracketLeft',
          [UiohookKey.BracketRight]: 'BracketRight',
          [UiohookKey.Backslash]:    'Backslash',
          [UiohookKey.Backquote]:    'Backquote',
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
          const code = KEY_MAP[e.keycode]
          if (!code) return
          const msg = JSON.stringify({ code, shift: e.shiftKey })
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
