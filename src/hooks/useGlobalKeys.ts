import { useEffect, useRef } from 'react'

type Handlers = {
  onMoveUp: () => void
  onMoveDown: () => void
  onToggleCrossed: () => void
  onCycleMode: (dir: 'prev' | 'next') => void
}

const WS_URL = 'ws://localhost:9001'

export function useGlobalKeys(enabled: boolean, handlers: Handlers) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (!enabled) return

    let ws: WebSocket
    let closed = false

    function connect() {
      ws = new WebSocket(WS_URL)

      ws.onopen = () => {
        // Tell the server our current focus state immediately on connect
        ws.send(JSON.stringify({ type: document.hasFocus() ? 'focus' : 'blur' }))
      }

      ws.onmessage = (e) => {
        const { key } = JSON.parse(e.data) as { key: string }
        const h = handlersRef.current
        if      (key === 'ArrowUp')    h.onMoveUp()
        else if (key === 'ArrowDown')  h.onMoveDown()
        else if (key === 'x')          h.onToggleCrossed()
        else if (key === 'ArrowLeft')  h.onCycleMode('prev')
        else if (key === 'ArrowRight') h.onCycleMode('next')
      }

      ws.onclose = () => {
        // Reconnect after a short delay if still enabled and not explicitly closed
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
  }, [enabled])
}
