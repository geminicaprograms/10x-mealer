#!/bin/bash

# =============================================================================
# AI Endpoints Test Script
# =============================================================================
#
# This script tests the AI feature endpoints:
# - GET /api/ai/usage
# - POST /api/ai/scan-receipt
# - POST /api/ai/substitutions
#
# Prerequisites:
# 1. Set the AUTH_TOKEN environment variable with a valid Supabase access token
# 2. Ensure the dev server is running (npm run dev)
#
# Usage:
#   export AUTH_TOKEN="your-supabase-access-token"
#   ./scripts/test-ai-endpoints.sh
#
# To get an access token, you can:
# 1. Log in via the app and extract the token from browser dev tools
# 2. Use Supabase CLI: supabase auth token
# 3. Use the Supabase dashboard to generate a test token
# =============================================================================

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
AUTH_TOKEN="${AUTH_TOKEN:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function to print section headers
print_header() {
    echo ""
    echo -e "${BLUE}=============================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=============================================================================${NC}"
    echo ""
}

# Helper function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Helper function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Helper function to print warning
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if AUTH_TOKEN is set
if [ -z "$AUTH_TOKEN" ]; then
    print_error "AUTH_TOKEN environment variable is not set"
    echo ""
    echo "Please set it with:"
    echo "  export AUTH_TOKEN=\"your-supabase-access-token\""
    echo ""
    echo "You can get a token by:"
    echo "  1. Logging in via the app and extracting from browser dev tools"
    echo "  2. Using Supabase CLI: supabase auth token"
    echo ""
    exit 1
fi

# =============================================================================
# Test 1: GET /api/ai/usage
# =============================================================================
print_header "Test 1: GET /api/ai/usage"

echo "Request:"
echo "  GET ${BASE_URL}/api/ai/usage"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X GET "${BASE_URL}/api/ai/usage" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response (HTTP $HTTP_CODE):"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "200" ]; then
    print_success "Usage endpoint returned successfully"
else
    print_error "Usage endpoint failed with status $HTTP_CODE"
fi

# =============================================================================
# Test 2: POST /api/ai/scan-receipt (with sample image)
# =============================================================================
print_header "Test 2: POST /api/ai/scan-receipt"

# Small 1x1 pixel white JPEG image encoded in base64
# This is a minimal valid JPEG for testing purposes
SAMPLE_IMAGE_BASE64="/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAB//9k="

echo "Request:"
echo "  POST ${BASE_URL}/api/ai/scan-receipt"
echo "  Body: { image: <base64>, image_type: 'image/jpeg' }"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${BASE_URL}/api/ai/scan-receipt" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
        \"image\": \"${SAMPLE_IMAGE_BASE64}\",
        \"image_type\": \"image/jpeg\"
    }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response (HTTP $HTTP_CODE):"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "200" ]; then
    print_success "Receipt scan endpoint returned successfully"
else
    print_error "Receipt scan endpoint failed with status $HTTP_CODE"
fi

# =============================================================================
# Test 3: POST /api/ai/substitutions
# =============================================================================
print_header "Test 3: POST /api/ai/substitutions"

echo "Request:"
echo "  POST ${BASE_URL}/api/ai/substitutions"
echo "  Body: { recipe_ingredients: [...] }"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${BASE_URL}/api/ai/substitutions" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "recipe_ingredients": [
            {
                "name": "śmietana 30%",
                "quantity": 200,
                "unit": "ml"
            },
            {
                "name": "masło",
                "quantity": 100,
                "unit": "g"
            },
            {
                "name": "jajka",
                "quantity": 3,
                "unit": "szt"
            },
            {
                "name": "mąka pszenna",
                "quantity": 500,
                "unit": "g"
            }
        ]
    }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response (HTTP $HTTP_CODE):"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "200" ]; then
    print_success "Substitutions endpoint returned successfully"
elif [ "$HTTP_CODE" = "403" ]; then
    print_warning "Substitutions endpoint returned 403 - user may need to complete onboarding"
else
    print_error "Substitutions endpoint failed with status $HTTP_CODE"
fi

# =============================================================================
# Test 4: Validation Error Test (invalid image type)
# =============================================================================
print_header "Test 4: Validation Error (invalid image type)"

echo "Request:"
echo "  POST ${BASE_URL}/api/ai/scan-receipt"
echo "  Body: { image: <base64>, image_type: 'image/gif' } <- invalid type"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${BASE_URL}/api/ai/scan-receipt" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "image": "aGVsbG8gd29ybGQ=",
        "image_type": "image/gif"
    }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response (HTTP $HTTP_CODE):"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "400" ]; then
    print_success "Validation error returned correctly (400)"
else
    print_error "Expected 400, got $HTTP_CODE"
fi

# =============================================================================
# Test 5: Empty ingredients array validation
# =============================================================================
print_header "Test 5: Validation Error (empty ingredients)"

echo "Request:"
echo "  POST ${BASE_URL}/api/ai/substitutions"
echo "  Body: { recipe_ingredients: [] } <- empty array"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${BASE_URL}/api/ai/substitutions" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "recipe_ingredients": []
    }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response (HTTP $HTTP_CODE):"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "400" ]; then
    print_success "Validation error returned correctly (400)"
else
    print_error "Expected 400, got $HTTP_CODE"
fi

# =============================================================================
# Test 6: Unauthorized request (no token)
# =============================================================================
print_header "Test 6: Unauthorized Request (no token)"

echo "Request:"
echo "  GET ${BASE_URL}/api/ai/usage (without Authorization header)"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X GET "${BASE_URL}/api/ai/usage" \
    -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response (HTTP $HTTP_CODE):"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "401" ]; then
    print_success "Unauthorized error returned correctly (401)"
else
    print_error "Expected 401, got $HTTP_CODE"
fi

# =============================================================================
# Test 7: POST /api/recipes/parse-text (valid text)
# =============================================================================
print_header "Test 7: POST /api/recipes/parse-text (valid text)"

echo "Request:"
echo "  POST ${BASE_URL}/api/recipes/parse-text"
echo "  Body: { text: <Polish recipe ingredients> }"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${BASE_URL}/api/recipes/parse-text" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "text": "Składniki:\n- 500g filetu z kurczaka\n- 200 ml śmietany 30%\n- 2 cebule\n- 3 ząbki czosnku\n- sól i pieprz do smaku"
    }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response (HTTP $HTTP_CODE):"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "200" ]; then
    print_success "Recipe text parsing endpoint returned successfully"
else
    print_error "Recipe text parsing endpoint failed with status $HTTP_CODE"
fi

# =============================================================================
# Test 8: POST /api/recipes/parse-text (empty text validation)
# =============================================================================
print_header "Test 8: Validation Error (empty text)"

echo "Request:"
echo "  POST ${BASE_URL}/api/recipes/parse-text"
echo "  Body: { text: '' } <- empty string"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${BASE_URL}/api/recipes/parse-text" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "text": ""
    }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response (HTTP $HTTP_CODE):"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "400" ]; then
    print_success "Validation error returned correctly (400)"
else
    print_error "Expected 400, got $HTTP_CODE"
fi

# =============================================================================
# Test 9: POST /api/recipes/parse-text (no auth)
# =============================================================================
print_header "Test 9: Recipe Text Parsing Unauthorized (no token)"

echo "Request:"
echo "  POST ${BASE_URL}/api/recipes/parse-text (without Authorization header)"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${BASE_URL}/api/recipes/parse-text" \
    -H "Content-Type: application/json" \
    -d '{
        "text": "500g kurczaka"
    }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response (HTTP $HTTP_CODE):"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "401" ]; then
    print_success "Unauthorized error returned correctly (401)"
else
    print_error "Expected 401, got $HTTP_CODE"
fi

# =============================================================================
# Test 10: POST /api/recipes/parse (valid URL from allowed domain)
# =============================================================================
print_header "Test 10: POST /api/recipes/parse (valid URL)"

echo "Request:"
echo "  POST ${BASE_URL}/api/recipes/parse"
echo "  Body: { url: 'https://cazzscookingcommunity.github.io/recipes/xml/easy_stir_fry.xml' }"
echo ""
echo "Note: This test will attempt to fetch from the real URL."
echo "      If the URL doesn't exist, expect 404 or 502."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${BASE_URL}/api/recipes/parse" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "url": "https://cazzscookingcommunity.github.io/recipes/xml/easy_stir_fry.xml"
    }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response (HTTP $HTTP_CODE):"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "200" ]; then
    print_success "Recipe URL parsing endpoint returned successfully"
elif [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "502" ]; then
    print_warning "URL parsing returned $HTTP_CODE - external fetch may have failed (expected in test environment)"
else
    print_error "Recipe URL parsing endpoint failed with status $HTTP_CODE"
fi

# =============================================================================
# Test 11: POST /api/recipes/parse (non-allowed domain)
# =============================================================================
print_header "Test 11: Forbidden Error (non-allowed domain)"

echo "Request:"
echo "  POST ${BASE_URL}/api/recipes/parse"
echo "  Body: { url: 'https://example.com/recipe' } <- domain not in allowlist"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${BASE_URL}/api/recipes/parse" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "url": "https://example.com/recipe"
    }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response (HTTP $HTTP_CODE):"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "403" ]; then
    print_success "Forbidden error returned correctly (403)"
else
    print_error "Expected 403, got $HTTP_CODE"
fi

# =============================================================================
# Test 12: POST /api/recipes/parse (invalid URL format)
# =============================================================================
print_header "Test 12: Validation Error (invalid URL format)"

echo "Request:"
echo "  POST ${BASE_URL}/api/recipes/parse"
echo "  Body: { url: 'not-a-valid-url' } <- invalid URL"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${BASE_URL}/api/recipes/parse" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "url": "not-a-valid-url"
    }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response (HTTP $HTTP_CODE):"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "400" ]; then
    print_success "Validation error returned correctly (400)"
else
    print_error "Expected 400, got $HTTP_CODE"
fi

# =============================================================================
# Test 13: POST /api/recipes/parse (HTTP URL - HTTPS required)
# =============================================================================
print_header "Test 13: Validation Error (HTTP URL, HTTPS required)"

echo "Request:"
echo "  POST ${BASE_URL}/api/recipes/parse"
echo "  Body: { url: 'http://www.kwestiasmaku.com/...' } <- HTTP not allowed"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${BASE_URL}/api/recipes/parse" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "url": "http://www.kwestiasmaku.com/przepis"
    }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response (HTTP $HTTP_CODE):"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "400" ]; then
    print_success "Validation error returned correctly (400)"
else
    print_error "Expected 400, got $HTTP_CODE"
fi

# =============================================================================
# Summary
# =============================================================================
print_header "Test Summary"

echo "All tests completed!"
echo ""
echo "Note: The AI endpoints (receipt scan, substitutions, recipe parsing)"
echo "      use mock data for development/testing."
echo "      To get real AI responses, configure OPENROUTER_API_KEY in .env"
echo ""
echo "Recipe Parsing Endpoints:"
echo "  - POST /api/recipes/parse       - Parse recipe from URL"
echo "  - POST /api/recipes/parse-text  - Parse recipe from raw text"
echo ""
echo "Supported domains for URL parsing:"
echo "  - kwestiasmaku.com"
echo "  - przepisy.pl"
echo "  - aniagotuje.pl"
echo "  - kuchnialidla.pl"
echo "  - mojegotowanie.pl"
echo ""
