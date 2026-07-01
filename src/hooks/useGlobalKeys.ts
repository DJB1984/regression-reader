import { useEffect, useRef } from 'react'

type Handlers = {
  onMoveUp: () => void
  onMoveDown: () => void
  onMoveUpUncross: () => void
  onStrikeAndMove: () => void
  onToggleCrossed: () => void
  onCycleMode: (dir: 'prev' | 'next') => void
  onToggleGlobalKeys: () => void
  onOpenNote: () => void
  onOpenBugBubble: () => void
  isBubbleOpen: () => boolean
  onTypeChar: (char: string) => void
  onBackspace: () => void
  onSaveBubble: () => void
  onDiscardBubble: () => void
  onDeleteBubble: () => void
}

const WS_URL = 'ws://localhost:9001'

// ScrollLock is otherwise-unused, so it doubles as the "wake up" hotkey —
// it must fire even while `enabled` is false, since that's the only way to
// turn navigation back on from outside the window.
const TOGGLE_KEY = 'ScrollLock'

// Maps a physical key code to [unshifted, shifted] characters, US QWERTY —
// lets remote note/bug editing type real text while the window is unfocused.
const CHAR_MAP: Record<string, [string, string]> = {
  Space: [' ', ' '],
  Comma: [',', '<'],
  Period: ['.', '>'],
  Slash: ['/', '?'],
  Semicolon: [';', ':'],
  Quote: ["'", '"'],
  Minus: ['-', '_'],
  Equal: ['=', '+'],
  BracketLeft: ['[', '{'],
  BracketRight: [']', '}'],
  Backslash: ['\\', '|'],
  Backquote: ['`', '~'],
}
for (let i = 0; i < 26; i++) {
  const lower = String.fromCharCode(97 + i)
  CHAR_MAP[`Key${lower.toUpperCase()}`] = [lower, lower.toUpperCase()]
}
const DIGIT_SHIFTED = [')', '!', '@', '#', '$', '%', '^', '&', '*', '(']
for (let d = 0; d <= 9; d++) {
  CHAR_MAP[`Digit${d}`] = [String(d), DIGIT_SHIFTED[d]]
}

function charFor(code: string, shift: boolean): string | null {
  const pair = CHAR_MAP[code]
  if (!pair) return null
  return shift ? pair[1] : pair[0]
}

export function useGlobalKeys(enabled: boolean, handlers: Handlers) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  useEffect(() => {
    // Connection stays open regardless of `enabled` — only the toggle
    // hotkey itself needs to work while navigation is switched off.
    let ws: WebSocket
    let closed = false

    function connect() {
      ws = new WebSocket(WS_URL)

      ws.onopen = () => {
        // Tell the server our current focus state immediately on connect
        ws.send(JSON.stringify({ type: document.hasFocus() ? 'focus' : 'blur' }))
      }

      ws.onmessage = (e) => {
        const { code, shift } = JSON.parse(e.data) as { code: string; shift: boolean }
        const h = handlersRef.current

        if (code === TOGGLE_KEY) { h.onToggleGlobalKeys(); return }
        if (!enabledRef.current) return

        if (h.isBubbleOpen()) {
          if (code === 'Escape')    { h.onDiscardBubble(); return }
          if (code === 'Delete')    { h.onDeleteBubble(); return }
          if (code === 'Backspace') { h.onBackspace(); return }
          if (code === 'Enter') {
            if (shift) h.onTypeChar('\n')
            else h.onSaveBubble()
            return
          }
          const char = charFor(code, shift)
          if (char !== null) h.onTypeChar(char)
          return
        }

        if (code === 'KeyB') { h.onOpenBugBubble(); return }
        if (code === 'KeyN') { h.onOpenNote(); return }

        if      (code === 'ArrowUp')                       h.onMoveUp()
        else if (code === 'KeyW')                          h.onMoveUpUncross()
        else if (code === 'ArrowDown')                     h.onMoveDown()
        else if (code === 'KeyS')                          h.onStrikeAndMove()
        else if (code === 'KeyC')                          h.onToggleCrossed()
        else if (code === 'ArrowLeft'  || code === 'KeyA') h.onCycleMode('prev')
        else if (code === 'ArrowRight' || code === 'KeyD') h.onCycleMode('next')
      }

      ws.onclose = () => {
        // Reconnect after a short delay unless explicitly closed
        if (!closed) setTimeout(connect, 2000)
      }
    }

    const onFocus = () => ws?.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type: 'focus' }))
    const onBlur  = () => ws?.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type: 'blur'  }))

    window.addEventListener('focus', onFocus)
    window.addEventListener('blur',  onBlur)
    connect()

    return () => {
      closed = true
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur',  onBlur)
      ws?.close()
    }
  }, [])
}
