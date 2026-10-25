import { Fragment, useEffect, useRef, useState } from 'react'
import { Brain, ChevronRight, MessageCircle, MessageSquarePlus, Pencil, Send, Trash2, X } from 'lucide-react'
import './AssistantWidget.css'

const configuredAssistantUrl = import.meta.env.VITE_AI_API_URL?.trim()
const assistantUrl = (configuredAssistantUrl || '').replace(/\/$/, '')
const welcomeMessage = { role: 'assistant', content: 'Chào bạn! Mình có thể tìm sản phẩm theo nhu cầu, thương hiệu và ngân sách.' }

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16)
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

function getConversationScope() {
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || 'null')
    return String(auth?.id ?? auth?.username ?? 'guest')
  } catch {
    return 'guest'
  }
}

function getOrCreateConversation(forceNew = false) {
  const scope = getConversationScope()
  const version = scope === 'guest' ? 'v2_' : ''
  const key = `ecom_assistant_conversation_${version}${scope}`
  const existing = sessionStorage.getItem(key)
  if (existing && !forceNew) return { key, id: existing }
  const id = createId()
  sessionStorage.setItem(key, id)
  return { key, id }
}

function getAssistantSessionId() {
  const key = 'ecom_assistant_guest_session'
  let sessionId = localStorage.getItem(key)
  if (!sessionId) {
    sessionId = createId()
    localStorage.setItem(key, sessionId)
  }
  return sessionId
}

function assistantHeaders(extra = {}) {
  return {
    ...extra,
    'X-Assistant-Session': getAssistantSessionId(),
  }
}

function isTransientAssistantError(item) {
  if (item?.role !== 'assistant' || typeof item.content !== 'string') return false
  return /^(NetworkError when attempting to fetch resource\.|Kết nối tới trợ lý bị gián đoạn\.|Không thể kết nối trợ lý\.)/i.test(item.content.trim())
}

async function fetchConversationMessages(conversationId) {
  const response = await fetch(`${assistantUrl}/api/v1/assistant/conversations/${conversationId}`, {
    credentials: 'include',
    headers: assistantHeaders(),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !Array.isArray(payload.messages)) return null
  return payload.messages.filter((item) => !isTransientAssistantError(item))
}

function formatVnd(value) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(value || 0))
}

function renderMessageContent(content) {
  const text = String(content || '')
  const parts = []
  // Some stored answers predate line-break preservation, so stop at the next
  // [P#] marker as well as at a newline. Each result then stays its own card.
  const productPattern = /\[P(\d+)\]\s*(.*?)\s+—\s*([\s\S]*?)(?=\s*\[P\d+\]|\n|$)/g
  let cursor = 0
  let match

  while ((match = productPattern.exec(text)) !== null) {
    if (match.index > cursor) {
      parts.push(<Fragment key={`text-${cursor}`}>{text.slice(cursor, match.index)}</Fragment>)
    }
    const [, reference, productName, price] = match
    parts.push(
      <a
        className="assistant-inline-product-link"
        href={`/products?keyword=${encodeURIComponent(productName.trim())}`}
        key={`product-${match.index}`}
        title={`Xem ${productName.trim()}`}
      >
        <span className="assistant-product-reference">P{reference}</span>
        <span className="assistant-product-details">
          <strong>{productName.trim()}</strong>
          <small>{price.trim()}</small>
        </span>
        <ChevronRight size={17} aria-hidden="true" />
      </a>,
    )
    cursor = productPattern.lastIndex
  }

  if (cursor < text.length) {
    parts.push(<Fragment key={`text-${cursor}`}>{text.slice(cursor)}</Fragment>)
  }
  return parts
}

function hasProductReferences(content) {
  return /\[P\d+\]/.test(String(content || ''))
}

export default function AssistantWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [conversation, setConversation] = useState(() => getOrCreateConversation())
  const [messages, setMessages] = useState([welcomeMessage])
  const messagesViewportRef = useRef(null)
  const [historyReady, setHistoryReady] = useState(false)
  const [savedMemories, setSavedMemories] = useState(null)
  const [memoryNotice, setMemoryNotice] = useState('')

  useEffect(() => {
    let active = true
    setHistoryReady(false)
    fetchConversationMessages(conversation.id)
      .then((messages) => {
        if (!active) return
        setMessages(messages?.length ? [welcomeMessage, ...messages] : [welcomeMessage])
        setHistoryReady(true)
      })
      .catch(() => { if (active) setHistoryReady(true) })
    return () => { active = false }
  }, [conversation.id, open])

  useEffect(() => {
    if (!open || !messagesViewportRef.current) return undefined
    const viewport = messagesViewportRef.current
    const frame = window.requestAnimationFrame(() => {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [messages, sending, historyReady, open, savedMemories, memoryNotice])

  function startNewConversation() {
    setConversation(getOrCreateConversation(true))
    setMessages([welcomeMessage])
    setHistoryReady(true)
    setSavedMemories(null)
    setMemoryNotice('')
  }

  async function loadSavedMemories() {
    setMemoryNotice('')
    try {
      const response = await fetch(`${assistantUrl}/api/v1/assistant/memory`, { credentials: 'include' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(response.status === 401 ? 'Đăng nhập để quản lý sở thích đã lưu.' : payload.detail || 'Không tải được sở thích đã lưu.')
      setSavedMemories(payload.memories || [])
    } catch (error) {
      setSavedMemories([])
      setMemoryNotice(error.message || 'Không tải được sở thích đã lưu.')
    }
  }

  async function deleteSavedMemories() {
    if (!window.confirm('Xóa tất cả sở thích AI đã ghi nhớ cho tài khoản này?')) return
    try {
      const response = await fetch(`${assistantUrl}/api/v1/assistant/memory`, { method: 'DELETE', credentials: 'include' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.detail || 'Không xóa được sở thích đã lưu.')
      setSavedMemories([])
      setMemoryNotice(`Đã xóa ${payload.deleted || 0} sở thích đã lưu.`)
    } catch (error) {
      setMemoryNotice(error.message || 'Không xóa được sở thích đã lưu.')
    }
  }

  async function deleteSavedMemory(memoryId) {
    try {
      const response = await fetch(`${assistantUrl}/api/v1/assistant/memory/${encodeURIComponent(memoryId)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: assistantHeaders(),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.detail || 'Không xóa được sở thích đã lưu.')
      setSavedMemories((current) => current.filter((memory) => memory.id !== memoryId))
    } catch (error) {
      setMemoryNotice(error.message || 'Không xóa được sở thích đã lưu.')
    }
  }

  async function editSavedMemory(memory) {
    const content = window.prompt('Cập nhật sở thích đã ghi nhớ:', memory.content)?.trim()
    if (!content || content === memory.content) return
    try {
      const response = await fetch(`${assistantUrl}/api/v1/assistant/memory/${encodeURIComponent(memory.id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: assistantHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ content }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.detail || 'Không cập nhật được sở thích đã lưu.')
      setSavedMemories((current) => current.map((item) => item.id === memory.id ? { ...item, content } : item))
    } catch (error) {
      setMemoryNotice(error.message || 'Không cập nhật được sở thích đã lưu.')
    }
  }

  async function deleteCurrentConversation() {
    if (!window.confirm('Xóa lịch sử của cuộc trò chuyện hiện tại?')) return
    try {
      const response = await fetch(`${assistantUrl}/api/v1/assistant/conversations/${conversation.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.detail || 'Không xóa được cuộc trò chuyện.')
      }
      startNewConversation()
    } catch (error) {
      setMessages((current) => [...current, { role: 'assistant', content: error.message || 'Không xóa được cuộc trò chuyện.' }])
    }
  }

  async function sendMessage(event) {
    event.preventDefault()
    const message = input.trim()
    if (!message || sending) return

    const activeConversation = getOrCreateConversation()
    if (activeConversation.id !== conversation.id) {
      setConversation(activeConversation)
      setMessages([welcomeMessage])
    }

    setInput('')
    setSending(true)
    setMessages((current) => [...current, { role: 'user', content: message }])
    try {
      const sendToConversation = async (conversationId) => {
        const response = await fetch(`${assistantUrl}/api/v1/assistant/chat`, {
          method: 'POST',
          headers: assistantHeaders({ 'Content-Type': 'application/json' }),
          credentials: 'include',
          body: JSON.stringify({ message, conversation_id: conversationId }),
        })
        const payload = await response.json().catch(() => ({}))
        return { response, payload }
      }

      let { response, payload } = await sendToConversation(activeConversation.id)
      if (response.status === 404 && payload.detail === 'Conversation not found.') {
        const freshConversation = getOrCreateConversation(true)
        setConversation(freshConversation)
        setHistoryReady(true)
        const retry = await sendToConversation(freshConversation.id)
        response = retry.response
        payload = retry.payload
      }
      if (!response.ok) throw new Error(payload.detail || 'Dịch vụ tư vấn hiện chưa kết nối được.')
      setMessages((current) => [...current.filter((item) => !isTransientAssistantError(item)), {
        role: 'assistant',
        content: payload.answer || 'Mình chưa có câu trả lời cho yêu cầu này.',
        products: payload.products || [],
        references: payload.references || [],
      }])
      if (/đã lưu sở thích|đã xóa .* sở thích/i.test(payload.answer || '')) {
        setSavedMemories(null)
        setMemoryNotice('')
      }
    } catch (error) {
      const networkFailure = error instanceof TypeError
      if (networkFailure) {
        // The API can finish and persist a turn even when the browser loses
        // the response (proxy restart, timeout, or a transient connection).
        // Read the conversation back before showing an error or asking the
        // customer to send the same request twice.
        try {
          for (let attempt = 0; attempt < 3; attempt += 1) {
            const recoveredMessages = await fetchConversationMessages(activeConversation.id)
            const hasAssistantReply = recoveredMessages?.some((item) => item.role === 'assistant')
            if (hasAssistantReply) {
              setMessages([welcomeMessage, ...recoveredMessages])
              return
            }
            if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 250))
          }
        } catch {
          // Fall through to the user-facing connection message.
        }
      }
      setMessages((current) => [...current, {
        role: 'assistant',
        content: networkFailure
          ? 'Kết nối tới trợ lý bị gián đoạn. Bạn thử gửi lại tin nhắn nhé.'
          : (error.message || 'Không thể kết nối trợ lý. Bạn thử lại sau nhé.'),
      }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="assistant-widget">
      {open && (
        <section className="assistant-panel" aria-label="Trợ lý mua sắm">
          <header className="assistant-header">
            <div>
              <strong>Trợ lý mua sắm</strong>
              <span>Tư vấn dựa trên sản phẩm đang có</span>
            </div>
            <div className="assistant-header-actions">
              <button type="button" className="assistant-action" onClick={startNewConversation} title="Cuộc trò chuyện mới" aria-label="Cuộc trò chuyện mới" disabled={sending}>
                <MessageSquarePlus size={18} />
              </button>
              <button type="button" className="assistant-action" onClick={loadSavedMemories} title="Sở thích đã ghi nhớ" aria-label="Sở thích đã ghi nhớ">
                <Brain size={18} />
              </button>
              <button type="button" className="assistant-action" onClick={deleteCurrentConversation} title="Xóa cuộc trò chuyện" aria-label="Xóa cuộc trò chuyện" disabled={sending}>
                <Trash2 size={17} />
              </button>
            <button type="button" className="assistant-close" onClick={() => setOpen(false)} aria-label="Đóng trợ lý">
              <X size={20} />
            </button>
            </div>
          </header>
          {savedMemories !== null && (
            <section className="assistant-memory-panel" aria-label="Sở thích đã ghi nhớ">
              <div className="assistant-memory-heading">
                <strong>Sở thích đã ghi nhớ</strong>
                {savedMemories.length > 0 && (
                  <button type="button" onClick={deleteSavedMemories} aria-label="Xóa tất cả sở thích đã ghi nhớ" title="Xóa tất cả">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              {memoryNotice && <p>{memoryNotice}</p>}
              {!memoryNotice && savedMemories.length === 0 && <p>Chưa có sở thích nào được lưu.</p>}
              {savedMemories.map((memory) => (
                <div className="assistant-memory-item" key={memory.id}>
                  <p>{memory.content}</p>
                  <button type="button" onClick={() => editSavedMemory(memory)} title="Sửa sở thích này" aria-label="Sửa sở thích này">
                    <Pencil size={14} />
                  </button>
                  <button type="button" onClick={() => deleteSavedMemory(memory.id)} title="Xóa sở thích này" aria-label="Xóa sở thích này">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </section>
          )}
          <div className="assistant-messages" ref={messagesViewportRef} aria-live="polite">
            {messages.map((item, index) => (
              <article className={`assistant-message assistant-message-${item.role}`} key={`${item.role}-${index}`}>
                <div className="assistant-message-content">{renderMessageContent(item.content)}</div>
                {item.products?.length > 0 && !hasProductReferences(item.content) && (
                  <div className="assistant-products">
                    {item.products.map((product, productIndex) => (
                      <a className="assistant-product" href={`/products?keyword=${encodeURIComponent(product.productName || '')}`} key={product.productId}>
                        <strong>[P{productIndex + 1}] {product.productName}</strong>
                        <span>{formatVnd(product.specialPrice)} ₫</span>
                      </a>
                    ))}
                  </div>
                )}
                {item.references?.length > 0 && (
                  <div className="assistant-references" aria-label="Tài liệu tham khảo">
                    <strong>Nguồn tham khảo</strong>
                    {item.references.map((reference, sourceIndex) => (
                      <div className="assistant-reference" key={`${reference.document_id}-${reference.heading}`}>
                        <span>[{reference.citation || `S${sourceIndex + 1}`}] {reference.title}</span>
                        {reference.heading && <small>{reference.heading}</small>}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
            {sending && (
              <div className="assistant-typing" role="status" aria-live="polite">
                <span>AI đang suy nghĩ</span>
                <span className="assistant-typing-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            )}
          </div>
          <form className="assistant-form" onSubmit={sendMessage}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ví dụ: laptop dưới 20 triệu"
              aria-label="Nội dung cần tư vấn"
              maxLength={1200}
              disabled={sending || !historyReady}
            />
            <button type="submit" disabled={sending || !historyReady || !input.trim()} aria-label="Gửi tin nhắn">
              <Send size={18} />
            </button>
          </form>
        </section>
      )}
      <button
        type="button"
        className="assistant-launcher"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? 'Đóng trợ lý mua sắm' : 'Mở trợ lý mua sắm'}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        <span>{open ? 'Đóng' : 'Tư vấn AI'}</span>
      </button>
    </div>
  )
}
