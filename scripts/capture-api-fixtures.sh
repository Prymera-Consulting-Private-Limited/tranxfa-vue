#!/usr/bin/env bash
#
# Re-capture tests/fixtures/api/ from a running local console.remitso.
#
#   scripts/capture-api-fixtures.sh
#
# Needs the local stack up and the database seeded — see
# docs/local-development.md. Signs up a fresh customer on a unique address,
# walks onboarding and the whole transfer flow, then sanitises the output.
#
# Review the diff before committing: a changed field name is exactly the
# signal these fixtures exist to give you.

set -uo pipefail

API="${API:-http://api.moneytransfer.app.localhost:8000}"
ORIGIN="${ORIGIN:-http://app.moneytransfer.app.localhost:5174}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/tests/fixtures/api"
JAR="$(mktemp -t apifix)"

# Login applies an MX check that signup does not, so the address must be on a
# domain that actually resolves — @example.com registers but can never log in.
EMAIL="${FIXTURE_EMAIL:-remitso.fixture+$(date +%s)@gmail.com}"
PASSWORD='TestPass123!'
OTP="${FIXTURE_OTP:-111111}"          # local builds accept a fixed OTP

command -v jq >/dev/null || { echo "jq is required"; exit 1; }
mkdir -p "$OUT"

xsrf() { awk '/XSRF-TOKEN/{print $7}' "$JAR" | tail -1 | sed 's/%3D/=/g'; }

# req <fixture-name> <METHOD> <path> [json-body]
req() {
    local name="$1" method="$2" path="$3" body="${4:-}" file="$OUT/$1.json" code
    local args=(-s -b "$JAR" -c "$JAR"
        -H "Accept: application/json" -H "Origin: $ORIGIN" -H "Referer: $ORIGIN/"
        -H "X-XSRF-TOKEN: $(xsrf)")
    [ -n "$body" ] && args+=(-H "Content-Type: application/json" -d "$body")

    code=$(curl "${args[@]}" -X "$method" -o "$file.tmp" -w "%{http_code}" "$API$path")
    if python3 -m json.tool "$file.tmp" > "$file" 2>/dev/null; then rm -f "$file.tmp"
    else mv "$file.tmp" "$file"; fi
    printf '  %-52s %-6s %s\n' "$name" "$method" "$code"
}

curl -s -c "$JAR" -o /dev/null -H "Origin: $ORIGIN" "$API/sanctum/csrf-cookie"

echo "Reference data and error shapes"
req password-policy                       GET  /client/v1/password-policy
req countries                             GET  /client/v1/countries
req countries-source                      GET  /client/v1/countries/source
req resources-relationships               GET  /client/v1/resources/relationships
req resources-occupations                 GET  /client/v1/resources/occupations
req error-401-profile                     GET  /client/v1/profile
req error-422-signup-declaration          POST /client/v1/signup "{\"email\":\"decl.$EMAIL\",\"password\":\"$PASSWORD\",\"confirm_password\":\"$PASSWORD\",\"third_party_declaration_accepted\":false}"
req error-422-signup-validation           POST /client/v1/signup '{"email":"not-an-email","password":"short","confirm_password":"different","third_party_declaration_accepted":true}'
req error-422-login-bad-credentials       POST /client/v1/login  '{"email":"nobody@gmail.com","password":"WrongPass123!"}'
req error-422-login-unroutable-email-domain POST /client/v1/login '{"email":"nobody@example.com","password":"WrongPass123!"}'

echo "Onboarding"
req signup                                POST /client/v1/signup "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"confirm_password\":\"$PASSWORD\",\"third_party_declaration_accepted\":true}"
req profile-01-fresh                      GET  /client/v1/profile
req verify-email                          POST /client/v1/verify-email-address "{\"otp\":\"$OTP\"}"
req profile-02-email-verified             GET  /client/v1/profile

CC=$(jq -r '.country.id' "$OUT/profile-02-email-verified.json")
req error-422-update-identity             POST "/client/v1/update?category=identity" '{"name":"Ada"}'
req update-identity                       POST "/client/v1/update?category=identity" "{\"name\":\"Ada\",\"second_name\":\"Lovelace\",\"nationality_id\":\"$CC\",\"birth_detail\":{\"birth_date\":\"1990-12-10\"}}"
req profile-03-identity-done              GET  /client/v1/profile
req update-address                        POST "/client/v1/update?category=address" '{"address":{"address_line_1":"1 Collins Street","address_line_2":"","city":"Melbourne","postcode":"3000","region":"VIC"}}'
req profile-04-address-done               GET  /client/v1/profile
req update-mobile                         POST /client/v1/update-mobile-number "{\"mobile_number_country_id\":\"$CC\",\"mobile_number\":\"4$(( RANDOM % 90000000 + 10000000 ))\"}"
req profile-05-onboarded                  GET  /client/v1/profile

echo "Authenticated reads"
req login                                 POST /client/v1/login "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
req tasks                                 GET  /client/v1/tasks
req devices                               GET  /client/v1/devices
req document-categories                   GET  /client/v1/document-categories
req resources-salary-ranges               GET  /client/v1/resources/currency-salary-ranges
req recipients-empty-list                 GET  /client/v1/recipients
req transactions-empty-list               GET  /client/v1/transactions
req payout-targets                        GET  /client/v1/payout/targets
req wallet-subscription-unavailable-404   GET  /client/v1/wallet/subscription

echo "Quote"
req quote-default                         GET  /client/v1/quote
PAY_C=$(jq -r '.payment_country.id'   "$OUT/quote-default.json")
PAY_CUR=$(jq -r '.payment_currency.id' "$OUT/quote-default.json")
OUT_C=$(jq -r '.payout_country.id'    "$OUT/quote-default.json")
OUT_CUR=$(jq -r '.payout_currency.id' "$OUT/quote-default.json")
PM=$(jq -r '.payout_method.id'        "$OUT/quote-default.json")
CO=$(jq -r '.payout_company.id'       "$OUT/quote-default.json")
Q="payment_country_id=$PAY_C&payment_currency_id=$PAY_CUR&payout_country_id=$OUT_C&payout_currency_id=$OUT_CUR&payout_method_id=$PM"

req quote-send-100                        GET "/client/v1/quote?amount_type=send&amount=100&$Q"
req quote-receive-100                     GET "/client/v1/quote?amount_type=receive&amount=100&$Q"
req quote-below-minimum                   GET "/client/v1/quote?amount_type=send&amount=0.01&$Q"
req quote-alert-max-amount                GET "/client/v1/quote?amount_type=send&amount=99999999&$Q"
req payout-methods                        GET "/client/v1/payout/methods?country_id=$OUT_C&currency_id=$OUT_CUR"
req payout-channel                        GET "/client/v1/payout/channel?country_id=$OUT_C&currency_id=$OUT_CUR&payout_method_id=$PM"

echo "Recipient and confirm"
# payout_company_id is required — the backend resolves CompanyPayoutChannel by
# it, and omitting it 503s rather than validating.
req quote-saved                           POST /client/v1/quote "{\"amount_type\":\"send\",\"amount\":\"100\",\"payment_country_id\":\"$PAY_C\",\"payment_currency_id\":\"$PAY_CUR\",\"payout_country_id\":\"$OUT_C\",\"payout_currency_id\":\"$OUT_CUR\",\"payout_method_id\":\"$PM\",\"payout_company_id\":\"$CO\"}"
QUOTE=$(jq -r '.id' "$OUT/quote-saved.json")
CH=$(jq -r '.id' "$OUT/payout-channel.json")
REL=$(jq -r '.data[0].id' "$OUT/resources-relationships.json")

req transaction-quote-no-recipient        GET  "/client/v1/quote/$QUOTE"
req error-422-recipient-empty             POST "/client/v1/recipients/add?payout_channel_id=$CH" '{"recipient_type":"individual"}'
req recipient-added                       POST "/client/v1/recipients/add?payout_channel_id=$CH&quote_id=$QUOTE" "{\"recipient_type\":\"individual\",\"relationship_id\":\"$REL\",\"name_on_account\":\"Grace Hopper\",\"mobile_number\":\"9990001111\"}"
RCP=$(jq -r '.id' "$OUT/recipient-added.json")

req recipients-list                       GET  /client/v1/recipients
req recipient-detail                      GET  "/client/v1/recipient/$RCP"
req quote-set-recipient                   POST "/client/v1/quote/recipient/$QUOTE" "{\"recipient_id\":\"$RCP\"}"
req transaction-quote-with-recipient      GET  "/client/v1/quote/$QUOTE"

PURPOSE=$(jq -r '.purposes[0].id // empty'        "$OUT/transaction-quote-with-recipient.json")
PMETHOD=$(jq -r '.payment_methods[0].id // empty' "$OUT/transaction-quote-with-recipient.json")
req error-422-confirm-missing             POST "/client/v1/quote/confirm/$QUOTE" '{}'
req confirm-quote                         POST "/client/v1/quote/confirm/$QUOTE" "{\"purpose_id\":\"$PURPOSE\",\"payment_method_id\":\"$PMETHOD\",\"payment_data\":{},\"third_party_declaration_accepted\":true}"

echo "KYC token shapes"
POA=$(jq -r '.[] | select(.code=="POA") | .id' "$OUT/document-categories.json")
POA_T=$(jq -r '.[] | select(.code=="POA") | .document_types[] | select(.api=="SYSTEM") | .id' "$OUT/document-categories.json" | head -1)
POI=$(jq -r '.[] | select(.code=="POI") | .id' "$OUT/document-categories.json")
POI_T=$(jq -r '.[] | select(.code=="POI") | .document_types[0].id' "$OUT/document-categories.json")
req account-verification-token-system     GET "/client/v1/account-verification/token/$POA/$POA_T?file_name=statement.pdf&file_type=application/pdf"
req error-500-account-verification-token-no-vendor-credentials GET "/client/v1/account-verification/token/$POI/$POI_T"

echo
python3 "$ROOT/scripts/sanitise-fixtures.py" "$OUT"
echo
echo "Captured as $EMAIL — review 'git diff tests/fixtures' before committing."
