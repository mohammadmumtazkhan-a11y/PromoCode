
# 1. Create Segment
echo "Creating Segment..."
curl -X POST http://localhost:5000/api/user-segments \
  -H "Content-Type: application/json" \
  -d '{"name":"Repro Seg","description":"Test","criteria":{"type":"TRANSACTION_VOLUME","min":100,"max":null,"currency":"GBP"}}' \
  > segment.json

# Extract ID (Windows doesn't have jq easily, assume ID=2)
# But I can just use ID=1 (existing) for the Scheme test if I don't care about segment creation validity for the Scheme itself.
# The test uses the NEW segment.
# Let's try creating Scheme with segment "1" (mock existing or whatever).

echo "Creating Scheme..."
curl -X POST http://localhost:5000/api/bonus-schemes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Repro Scheme",
    "bonus_type": "TRANSACTION_THRESHOLD_CREDIT",
    "credit_amount": 10,
    "currency": "GBP",
    "min_transaction_threshold": 50,
    "commission_type": "FIXED",
    "is_tiered": false,
    "tiers": [],
    "eligibility_rules": {"segments": ["1"]},
    "start_date": "2026-01-01",
    "end_date": "2026-12-31",
    "status": "ACTIVE"
  }'
