CREATE TABLE IF NOT EXISTS customer_return_requests (
  return_request_id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL UNIQUE REFERENCES orders(order_id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customer_users(customer_id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
  report TEXT NOT NULL,
  opening_video_url TEXT NOT NULL,
  related_photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  proof_evidence_photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_return_requests_customer_id
  ON customer_return_requests(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_return_requests_status
  ON customer_return_requests(status);
