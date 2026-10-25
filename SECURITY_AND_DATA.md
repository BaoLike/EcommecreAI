# Security and data setup

## What changed

- All `/api/admin/**` requests require `ROLE_ADMIN`; public signup always creates a `ROLE_USER` account. Admin accounts must be provisioned by an operator.
- Authentication stays in an HttpOnly JWT cookie. Mutating browser requests send a CSRF token, and CORS only allows the configured frontend origin. The VNPay IPN endpoint is public only so the payment provider can call it; its signature and amount are verified.
- Address, order, purchase-history, and cart operations use the signed-in user and check record ownership. Order creation reads current product prices, reserves stock under database locks, and ignores client-supplied totals. Failed, cancelled, and expired reservations restore stock once. Late successful payments enter `REVIEW_REQUIRED` for an admin to verify before fulfillment.
- Successful payments write purchase-history rows idempotently. Admin screens use database-backed orders/dashboard data. Product records support SKU, brand, model, warranty, JSON specifications, and an explicit demo-data marker.
- Products with order or purchase history cannot be deleted, and addresses linked to orders cannot be edited or deleted. This keeps historical order records consistent; create a new address for future purchases.
- Demo records are only seeded by the `demo` profile, which points to `ecom_demo`. The demo customer and catalog/orders are marked `demoData=true`.
- Database, JWT, Cloudinary, and VNPay values are read from environment variables. `.env.example` documents names only; Spring does not read that file automatically.

## Production configuration

Set these in the deployment environment or secret manager:

For local development, the application defaults to PostgreSQL at `jdbc:postgresql://localhost:5432/Ecommerce`. `DB_URL` can override this value.

| Variable | Purpose |
| --- | --- |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | PostgreSQL connection |
| `JWT_SECRET` | Base64 encoded random key with at least 32 decoded bytes |
| `FRONTEND_URL` | Exact browser origin allowed by CORS |
| `COOKIE_SECURE=true` | Sends the authentication cookie only over HTTPS |
| `JWT_COOKIE_SAME_SITE=Lax` | Use `None` with `COOKIE_SECURE=true` only when the frontend and API are on different sites |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Product image storage |
| `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_PAY_URL`, `VNPAY_RETURN_URL` | VNPay configuration |
| `JPA_DDL_AUTO=validate` | Validates the schema without altering production tables |

Apply `src/main/resources/db/migration/V1__security_and_catalog_data.sql` to an existing PostgreSQL database before starting with schema validation. For a new or throwaway local database, set `JPA_DDL_AUTO=update` explicitly. Back up production data before applying schema changes.

The server `.env.example` is for local HTTP development (`COOKIE_SECURE=false`). Set `COOKIE_SECURE=true` in HTTPS deployments; if the browser treats the frontend and API as cross-site, also set `JWT_COOKIE_SAME_SITE=None`. The frontend and API must use HTTPS for `SameSite=None` cookies.

## Running from IntelliJ

`.env.example` is only a template; Spring does not load it. In **Run → Edit Configurations → EcomApplication**, add the values as environment variables: `JWT_SECRET`, `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, and `COOKIE_SECURE=false` for local HTTP. Generate `JWT_SECRET` locally with `openssl rand -base64 48`; it must decode to at least 32 bytes. Keep the database password and generated key out of `.env.example` and source control. For a new throwaway database, set `JPA_DDL_AUTO=update`; for an existing database, apply the migration above and keep validation enabled.

To provision a production admin after creating the account through signup, have a database operator grant the role:

```sql
INSERT INTO user_role (user_id, role_id)
SELECT u.user_id, r.role_id
FROM users u
JOIN roles r ON r.role_name = 'ROLE_ADMIN'
WHERE u.username = 'REPLACE_WITH_OPERATOR_USERNAME'
  AND NOT EXISTS (
      SELECT 1 FROM user_role ur
      WHERE ur.user_id = u.user_id AND ur.role_id = r.role_id
  );
```

Do not set `SPRING_PROFILES_ACTIVE=demo` in production. The demo profile uses the separate `DEMO_DB_*` connection and seeds demo accounts and orders. It requires `DEMO_JWT_SECRET`, `DEMO_CUSTOMER_PASSWORD`, and `DEMO_ADMIN_PASSWORD`; no default login secret is checked into the project. Demo account names are `demo_customer` and `demo_admin`.

For demo runs, set `DEMO_JWT_SECRET` to a Base64 key with at least 32 decoded bytes, set both demo passwords, and point `DEMO_DB_URL` at the isolated `ecom_demo` database. The server `.env.example` lists the optional demo variable names.

## Credential rotation

The original project source contained live-looking database, JWT, Cloudinary, and VNPay credentials. Removing them from the current source does not revoke credentials already exposed in history or elsewhere. Rotate each affected provider credential, update the deployment secret store, and remove leaked values from repository history before production deployment.

## Data notes

- Product image uploads accept JPEG, PNG, or WebP and are limited to 5 MB.
- Product prices are VND. The server recalculates `specialPrice` and the final order total from stored product data.
- A payment callback received after an order reservation expires or a customer cancels is recorded as `REVIEW_REQUIRED`; the admin must verify fulfillment stock and then move it to processing.
- Admin order lists are currently limited to the latest 100 records; use pagination before operating a larger store.

## AI shopping assistant

`EcomServer/EcomAI/` contains a FastAPI service with a LangGraph workflow. It reads the public Spring product catalog, filters by category, brand, budget, and available stock, then returns product IDs as sources. The React client includes a small assistant widget configured with `VITE_AI_API_URL`.

The assistant has no order/payment/customer tools. An optional OpenAI-compatible model can be configured with `LLM_BASE_URL`, `LLM_MODEL`, and `LLM_API_KEY`; without a provider, it returns a deterministic summary from retrieved evidence. Policy-document retrieval is implemented in `EcomServer/EcomAI/`: local Markdown keyword retrieval works without database setup, while persistent hybrid search requires PostgreSQL `pgvector`, an embedding endpoint, and `sql/001_rag.sql`. The shipped policy documents are explicitly marked DEMO and must be replaced with approved store policies before customer use. Catalog and document text are untrusted model context, and answers return source references separately. The assistant still cannot look up customer orders or persist conversation memory.

## Sample products

`EcomServer/EcommerceSpring/src/main/resources/sample-products.json` contains 194 samples across 24 categories from DummyJSON's fake products catalog, with remote sample images and prices scaled from sample USD values using a fixed 25,000 VND multiplier. They are not verified listings or live prices. All inserted rows are marked `demoData=true` and shown with a storefront warning. To add them once to the local `Ecommerce` database, use the one-shot `sample-products` Spring profile described in `EcomServer/EcommerceSpring/SAMPLE_PRODUCTS.md`; normal application startup does not seed them, and existing SKUs are skipped. Use an authorized supplier/ERP export for a real shop catalog.
