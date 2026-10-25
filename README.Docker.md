# Chạy toàn bộ E-Shop bằng Docker

## Chuẩn bị

```bash
cd /home/baolai/EcommerceWithAIAssistance
cp .env.example .env
```

Sửa `.env`: đặt `POSTGRES_PASSWORD` và `JWT_SECRET` thật. Không commit file này.

## Khởi động

```bash
docker compose up --build
```

Lần chạy đầu, service `ollama-init` tải `embeddinggemma` và `qwen3:4b`; thời gian phụ thuộc mạng và dung lượng model. Khi hoàn tất, service `ai` tự khởi động, rồi `rag-ingest` lập chỉ mục các tài liệu đã có.

Mở storefront tại [http://localhost:5173](http://localhost:5173).

## Dịch vụ nội bộ

| Service | Mục đích | Cổng public |
|---|---|---|
| `frontend` | React build + Nginx reverse proxy | `5173` |
| `spring` | Catalog, tài khoản, đơn hàng | chỉ nội bộ |
| `ai` | FastAPI, LangGraph, RAG, memory | chỉ nội bộ |
| `postgres` | PostgreSQL và pgvector | chỉ nội bộ |
| `ollama` | Qwen và EmbeddingGemma | chỉ nội bộ |

Trình duyệt chỉ gọi `http://localhost:5173`. Nginx chuyển `/api/` tới Spring và `/api/v1/assistant/` tới FastAPI, nên không cần browser gọi chéo cổng và không phát sinh CORS.

## Deploy trên AWS

`localhost` trong Docker chỉ là chính container đó. Các service nội bộ đã dùng tên mạng Docker (`spring`, `ai`, `postgres`, `ollama`), nên không cần đổi chúng. URL mà trình duyệt, cookie và cổng thanh toán nhìn thấy phải là domain public.

Ví dụ trên EC2 có domain và HTTPS, `.env` cần có:

```env
PUBLIC_ORIGIN=https://shop.example.com
APP_PORT=80
COOKIE_SECURE=true
```

Đặt Nginx hoặc Application Load Balancer có TLS certificate ở phía trước container nếu dùng HTTPS. Chỉ mở cổng `80` và `443` trong Security Group; không public các cổng PostgreSQL, Spring, FastAPI hay Ollama.

## Dữ liệu RAG

`postgres` chạy `sql/001_rag.sql` và `sql/002_memory.sql` ở lần tạo volume đầu tiên. Service `rag-ingest` tự lập chỉ mục knowledge base sau khi Ollama và AI API sẵn sàng.

Sau khi sửa tài liệu hoặc thay đổi trạng thái/version, chạy lại:

```bash
docker compose run --rm rag-ingest
```

## Lệnh vận hành

```bash
# Xem log
docker compose logs -f ai

# Dừng các container, vẫn giữ database, ảnh và Ollama models
docker compose down

# Xóa toàn bộ dữ liệu Docker của project
docker compose down -v
```
