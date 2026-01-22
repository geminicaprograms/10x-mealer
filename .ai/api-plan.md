# REST API Plan

## 1. Resources

| Resource   | Database Table(s)    | Description                                            |
| ---------- | -------------------- | ------------------------------------------------------ |
| Profile    | `profiles`           | User profile with dietary preferences and equipment    |
| Inventory  | `inventory_items`    | User's food inventory (quantitative items and staples) |
| Products   | `product_catalog`    | Product autocomplete/search database                   |
| Units      | `units`              | Measurement units lookup                               |
| Categories | `product_categories` | Product categories lookup                              |
| Staples    | `staple_definitions` | Predefined staple items                                |
| Config     | `system_config`      | System configuration (supported values, rate limits)   |
| AI Usage   | `ai_usage_log`       | AI feature usage tracking                              |

## 2. Endpoints

### 2.1 Profile

#### GET /api/profile

Retrieve the authenticated user's profile.

**Response Payload:**

```json
{
  "id": "uuid",
  "allergies": ["gluten", "laktoza"],
  "diets": ["wegetariańska"],
  "equipment": ["piekarnik", "blender"],
  "onboarding_status": "completed",
  "created_at": "2026-01-20T12:00:00Z",
  "updated_at": "2026-01-20T12:00:00Z"
}
```

**Success Codes:**

- `200 OK` - Profile retrieved successfully

**Error Codes:**

- `401 Unauthorized` - User not authenticated
- `404 Not Found` - Profile not found (should not happen due to auto-creation trigger)

---

#### PUT /api/profile

Update the authenticated user's profile.

**Request Payload:**

```json
{
  "allergies": ["gluten"],
  "diets": ["wegetariańska", "bezlaktozowa"],
  "equipment": ["piekarnik", "mikser"],
  "onboarding_status": "completed"
}
```

**Validation:**

- `allergies` - Array of strings, must be from `system_config.supported_allergies`
- `diets` - Array of strings, must be from `system_config.supported_diets`
- `equipment` - Array of strings, must be from `system_config.supported_equipment`
- `onboarding_status` - Must be `"pending"` or `"completed"`

**Response Payload:**

```json
{
  "id": "uuid",
  "allergies": ["gluten"],
  "diets": ["wegetariańska", "bezlaktozowa"],
  "equipment": ["piekarnik", "mikser"],
  "onboarding_status": "completed",
  "created_at": "2026-01-20T12:00:00Z",
  "updated_at": "2026-01-22T10:30:00Z"
}
```

**Success Codes:**

- `200 OK` - Profile updated successfully

**Error Codes:**

- `400 Bad Request` - Invalid payload or validation error
- `401 Unauthorized` - User not authenticated
- `422 Unprocessable Entity` - Invalid values for allergies/diets/equipment

---

### 2.2 Inventory

#### GET /api/inventory

List the authenticated user's inventory items.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `is_staple` | boolean | No | Filter by staple status |
| `is_available` | boolean | No | Filter by availability (for staples) |
| `category_id` | integer | No | Filter by product category |
| `search` | string | No | Search by product/custom name |
| `sort_by` | string | No | Sort field: `name`, `created_at`, `updated_at` (default: `created_at`) |
| `sort_order` | string | No | `asc` or `desc` (default: `desc`) |
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Items per page (default: 50, max: 100) |

**Response Payload:**

```json
{
  "data": [
    {
      "id": "uuid",
      "product_id": 123,
      "product": {
        "id": 123,
        "name_pl": "Kurczak",
        "category": {
          "id": 4,
          "name_pl": "Mięso i drób"
        }
      },
      "custom_name": null,
      "quantity": 500,
      "unit": {
        "id": 1,
        "name_pl": "gram",
        "abbreviation": "g"
      },
      "is_staple": false,
      "is_available": true,
      "created_at": "2026-01-20T12:00:00Z",
      "updated_at": "2026-01-20T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total_items": 125
  }
}
```

**Success Codes:**

- `200 OK` - Inventory retrieved successfully

**Error Codes:**

- `401 Unauthorized` - User not authenticated
- `400 Bad Request` - Invalid query parameters

---

#### POST /api/inventory

Add items to the user's inventory (supports batch operations).

**Request Payload:**

```json
{
  "items": [
    {
      "product_id": 123,
      "custom_name": null,
      "quantity": 500,
      "unit_id": 1,
      "is_staple": false
    },
    {
      "product_id": null,
      "custom_name": "Ser żółty Gouda",
      "quantity": 200,
      "unit_id": 1,
      "is_staple": false
    }
  ]
}
```

**Validation:**

- Maximum 50 items per request
- For each item:
  - Either `product_id` OR `custom_name` must be provided (not both null)
  - If `is_staple` is `true`, `quantity` and `unit_id` must be null
  - `quantity` must be positive number if provided
  - `unit_id` must reference valid unit

**Response Payload:**

```json
{
  "created": [
    {
      "id": "uuid",
      "product_id": 123,
      "product": {
        "id": 123,
        "name_pl": "Kurczak",
        "category": {
          "id": 4,
          "name_pl": "Mięso i drób"
        }
      },
      "custom_name": null,
      "quantity": 500,
      "unit": {
        "id": 1,
        "name_pl": "gram",
        "abbreviation": "g"
      },
      "is_staple": false,
      "is_available": true,
      "created_at": "2026-01-22T10:30:00Z",
      "updated_at": "2026-01-22T10:30:00Z"
    }
  ],
  "errors": [
    {
      "index": 1,
      "error": "Invalid unit_id reference"
    }
  ],
  "summary": {
    "total": 2,
    "created": 1,
    "failed": 1
  }
}
```

**Success Codes:**

- `201 Created` - All items created successfully
- `207 Multi-Status` - Partial success (some items failed)

**Error Codes:**

- `400 Bad Request` - Invalid payload structure
- `401 Unauthorized` - User not authenticated
- `422 Unprocessable Entity` - All items failed validation

---

#### PUT /api/inventory/:id

Update a single inventory item.

**Path Parameters:**

- `id` - UUID of the inventory item

**Request Payload:**

```json
{
  "quantity": 350,
  "unit_id": 1,
  "is_available": true
}
```

**Validation:**

- Item must belong to the authenticated user
- Cannot change `is_staple` flag (delete and recreate instead)
- Cannot change `product_id` or `custom_name` (delete and recreate instead)
- Same constraint rules as POST

**Response Payload:**

```json
{
  "id": "uuid",
  "product_id": 123,
  "product": {
    "id": 123,
    "name_pl": "Kurczak",
    "category": {
      "id": 4,
      "name_pl": "Mięso i drób"
    }
  },
  "custom_name": null,
  "quantity": 350,
  "unit": {
    "id": 1,
    "name_pl": "gram",
    "abbreviation": "g"
  },
  "is_staple": false,
  "is_available": true,
  "created_at": "2026-01-20T12:00:00Z",
  "updated_at": "2026-01-22T11:00:00Z"
}
```

**Success Codes:**

- `200 OK` - Item updated successfully

**Error Codes:**

- `400 Bad Request` - Invalid payload or validation error
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - Item does not belong to user
- `404 Not Found` - Item not found

---

#### DELETE /api/inventory

Delete inventory items (supports batch operations).

**Request Payload:**

```json
{
  "ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Validation:**

- Maximum 50 items per request
- All items must belong to the authenticated user

**Response Payload:**

```json
{
  "deleted": ["uuid1", "uuid2"],
  "errors": [
    {
      "id": "uuid3",
      "error": "Item not found"
    }
  ],
  "summary": {
    "total": 3,
    "deleted": 2,
    "failed": 1
  }
}
```

**Success Codes:**

- `200 OK` - All items deleted successfully
- `207 Multi-Status` - Partial success (some items not found or unauthorized)

**Error Codes:**

- `400 Bad Request` - Invalid payload structure
- `401 Unauthorized` - User not authenticated
- `422 Unprocessable Entity` - All deletions failed

---

#### POST /api/inventory/deduct

Deduct quantities from inventory items (used for "Cooked This" action).

**Request Payload:**

```json
{
  "deductions": [
    {
      "inventory_item_id": "uuid",
      "quantity": 500
    },
    {
      "inventory_item_id": "uuid2",
      "quantity": 2
    }
  ]
}
```

**Validation:**

- All items must belong to the authenticated user
- Items must not be staples (staples don't have quantities)
- Deduction cannot exceed current quantity (item will be deleted if quantity reaches 0)

**Response Payload:**

```json
{
  "updated": [
    {
      "id": "uuid",
      "previous_quantity": 500,
      "deducted": 500,
      "new_quantity": 0,
      "deleted": true
    },
    {
      "id": "uuid2",
      "previous_quantity": 5,
      "deducted": 2,
      "new_quantity": 3,
      "deleted": false
    }
  ],
  "errors": [],
  "summary": {
    "total": 2,
    "updated": 2,
    "deleted": 1,
    "failed": 0
  }
}
```

**Success Codes:**

- `200 OK` - Deductions applied successfully
- `207 Multi-Status` - Partial success

**Error Codes:**

- `400 Bad Request` - Invalid payload structure
- `401 Unauthorized` - User not authenticated
- `422 Unprocessable Entity` - All deductions failed

---

#### POST /api/inventory/staples/init

Initialize user's staples from system staple definitions.

**Request Payload:** (empty or optional)

```json
{
  "overwrite": false
}
```

**Validation:**

- If `overwrite` is `false` (default), only creates staples that don't exist
- If `overwrite` is `true`, resets all staples to default availability

**Response Payload:**

```json
{
  "created": 15,
  "skipped": 0,
  "staples": [
    {
      "id": "uuid",
      "product_id": 1,
      "product": {
        "id": 1,
        "name_pl": "Sól"
      },
      "is_staple": true,
      "is_available": true
    }
  ]
}
```

**Success Codes:**

- `200 OK` - Staples initialized successfully
- `201 Created` - Staples created for the first time

**Error Codes:**

- `401 Unauthorized` - User not authenticated

---

### 2.3 Products (Autocomplete)

#### GET /api/products/search

Search product catalog for autocomplete.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search query (minimum 2 characters) |
| `category_id` | integer | No | Filter by category |
| `limit` | integer | No | Maximum results (default: 10, max: 20) |

**Response Payload:**

```json
{
  "data": [
    {
      "id": 123,
      "name_pl": "Kurczak",
      "category": {
        "id": 4,
        "name_pl": "Mięso i drób"
      },
      "default_unit": {
        "id": 1,
        "name_pl": "gram",
        "abbreviation": "g"
      },
      "aliases": ["kurczę", "drób"]
    }
  ]
}
```

**Success Codes:**

- `200 OK` - Search completed successfully

**Error Codes:**

- `400 Bad Request` - Query too short or invalid parameters
- `401 Unauthorized` - User not authenticated

---

#### GET /api/products/:id

Get a single product by ID.

**Path Parameters:**

- `id` - Integer ID of the product

**Response Payload:**

```json
{
  "id": 123,
  "name_pl": "Kurczak",
  "category": {
    "id": 4,
    "name_pl": "Mięso i drób"
  },
  "default_unit": {
    "id": 1,
    "name_pl": "gram",
    "abbreviation": "g"
  },
  "aliases": ["kurczę", "drób"]
}
```

**Success Codes:**

- `200 OK` - Product retrieved successfully

**Error Codes:**

- `401 Unauthorized` - User not authenticated
- `404 Not Found` - Product not found

---

### 2.4 Lookup Tables

#### GET /api/units

List all measurement units.

**Response Payload:**

```json
{
  "data": [
    {
      "id": 1,
      "name_pl": "gram",
      "abbreviation": "g",
      "unit_type": "weight",
      "base_unit_multiplier": 1
    },
    {
      "id": 8,
      "name_pl": "szklanka",
      "abbreviation": "szkl.",
      "unit_type": "volume",
      "base_unit_multiplier": 250
    }
  ]
}
```

**Success Codes:**

- `200 OK` - Units retrieved successfully

**Error Codes:**

- `401 Unauthorized` - User not authenticated

---

#### GET /api/categories

List all product categories.

**Response Payload:**

```json
{
  "data": [
    {
      "id": 1,
      "name_pl": "Warzywa",
      "display_order": 1
    },
    {
      "id": 2,
      "name_pl": "Owoce",
      "display_order": 2
    }
  ]
}
```

**Success Codes:**

- `200 OK` - Categories retrieved successfully

**Error Codes:**

- `401 Unauthorized` - User not authenticated

---

#### GET /api/staples

List all staple definitions.

**Response Payload:**

```json
{
  "data": [
    {
      "id": 1,
      "product": {
        "id": 100,
        "name_pl": "Sól"
      },
      "is_active": true
    },
    {
      "id": 2,
      "product": {
        "id": 101,
        "name_pl": "Pieprz czarny"
      },
      "is_active": true
    }
  ]
}
```

**Success Codes:**

- `200 OK` - Staples retrieved successfully

**Error Codes:**

- `401 Unauthorized` - User not authenticated

---

#### GET /api/config

Get system configuration (supported values).

**Response Payload:**

```json
{
  "supported_allergies": [
    "gluten",
    "laktoza",
    "orzechy",
    "jaja",
    "soja",
    "ryby",
    "skorupiaki",
    "seler",
    "gorczyca",
    "sezam",
    "siarczyny",
    "łubin",
    "mięczaki"
  ],
  "supported_diets": ["wegetariańska", "wegańska", "bezglutenowa", "bezlaktozowa", "keto", "paleo"],
  "supported_equipment": [
    "piekarnik",
    "kuchenka mikrofalowa",
    "blender",
    "mikser",
    "robot kuchenny",
    "grill",
    "frytkownica",
    "wolnowar",
    "szybkowar",
    "parowar",
    "toster",
    "opiekacz"
  ],
  "rate_limits": {
    "receipt_scans_per_day": 5,
    "substitutions_per_day": 10
  }
}
```

**Success Codes:**

- `200 OK` - Configuration retrieved successfully

**Error Codes:**

- `401 Unauthorized` - User not authenticated

---

### 2.5 AI Features

#### POST /api/ai/scan-receipt

Upload and process a receipt image using a vision-capable LLM.

**Request Payload:**

```json
{
  "image": "base64_encoded_image_data",
  "image_type": "image/jpeg"
}
```

**Validation:**

- Supported image types: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`
- Maximum image size: 10MB
- User must not have exceeded daily rate limit

**Response Payload:**

```json
{
  "items": [
    {
      "name": "Kurczak filet",
      "matched_product": {
        "id": 123,
        "name_pl": "Kurczak"
      },
      "quantity": 500,
      "suggested_unit": {
        "id": 1,
        "name_pl": "gram",
        "abbreviation": "g"
      },
      "confidence": 0.95
    },
    {
      "name": "Ser żółty Gouda",
      "matched_product": null,
      "quantity": 200,
      "suggested_unit": {
        "id": 1,
        "name_pl": "gram",
        "abbreviation": "g"
      },
      "confidence": 0.72
    }
  ],
  "usage": {
    "scans_used_today": 3,
    "scans_remaining": 2
  }
}
```

**Success Codes:**

- `200 OK` - Receipt processed successfully

**Error Codes:**

- `400 Bad Request` - Invalid image format or corrupted data
- `401 Unauthorized` - User not authenticated
- `422 Unprocessable Entity` - Image quality too low for processing
- `429 Too Many Requests` - Daily rate limit exceeded

---

#### POST /api/ai/substitutions

Get AI substitution suggestions for recipe ingredients.

**Request Payload:**

```json
{
  "recipe_ingredients": [
    {
      "name": "śmietana 30%",
      "quantity": 200,
      "unit": "ml"
    },
    {
      "name": "masło",
      "quantity": 50,
      "unit": "g"
    }
  ]
}
```

**Validation:**

- Maximum 30 ingredients per request
- User must not have exceeded daily rate limit
- User must have completed onboarding

**Response Payload:**

```json
{
  "analysis": [
    {
      "ingredient": "śmietana 30%",
      "status": "missing",
      "matched_inventory_item": null,
      "substitution": {
        "available": true,
        "suggestion": "Użyj jogurtu greckiego (200ml) - masz go w lodówce. Będzie nieco mniej tłusty, ale smak będzie podobny.",
        "substitute_item": {
          "id": "uuid",
          "name": "Jogurt grecki",
          "quantity": 500,
          "unit": "g"
        }
      },
      "allergy_warning": null
    },
    {
      "ingredient": "masło",
      "status": "available",
      "matched_inventory_item": {
        "id": "uuid",
        "name": "Masło",
        "quantity": 250,
        "unit": "g"
      },
      "substitution": null,
      "allergy_warning": null
    }
  ],
  "warnings": [
    {
      "type": "allergy",
      "message": "Przepis zawiera gluten - masz alergię na gluten!"
    }
  ],
  "usage": {
    "substitutions_used_today": 5,
    "substitutions_remaining": 5
  }
}
```

**Success Codes:**

- `200 OK` - Substitutions analyzed successfully

**Error Codes:**

- `400 Bad Request` - Invalid payload structure
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User has not completed onboarding
- `429 Too Many Requests` - Daily rate limit exceeded

---

#### GET /api/ai/usage

Get current user's AI usage statistics for today.

**Response Payload:**

```json
{
  "date": "2026-01-22",
  "receipt_scans": {
    "used": 3,
    "limit": 5,
    "remaining": 2
  },
  "substitutions": {
    "used": 5,
    "limit": 10,
    "remaining": 5
  }
}
```

**Success Codes:**

- `200 OK` - Usage retrieved successfully

**Error Codes:**

- `401 Unauthorized` - User not authenticated

---

### 2.6 Recipe Proxy

#### POST /api/recipes/parse

Fetch and parse recipe ingredients from URL (server-side proxy to bypass CORS).

**Request Payload:**

```json
{
  "url": "https://www.kwestiasmaku.com/przepis/123"
}
```

**Validation:**

- URL must be valid format
- URL should be from supported domains (configurable allowlist)

**Response Payload:**

```json
{
  "title": "Kurczak w sosie śmietanowym",
  "source_url": "https://www.kwestiasmaku.com/przepis/123",
  "ingredients": [
    {
      "name": "filet z kurczaka",
      "quantity": 500,
      "unit": "g",
      "original_text": "500g filetu z kurczaka"
    },
    {
      "name": "śmietana 30%",
      "quantity": 200,
      "unit": "ml",
      "original_text": "200 ml śmietany 30%"
    }
  ],
  "parsing_confidence": 0.88
}
```

**Success Codes:**

- `200 OK` - Recipe parsed successfully

**Error Codes:**

- `400 Bad Request` - Invalid URL format
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - Domain not in allowlist
- `404 Not Found` - Recipe page not found
- `422 Unprocessable Entity` - Could not extract ingredients from page
- `502 Bad Gateway` - Failed to fetch external URL

---

#### POST /api/recipes/parse-text

Parse ingredients from raw recipe text (fallback option).

**Request Payload:**

```json
{
  "text": "Składniki:\n- 500g filetu z kurczaka\n- 200 ml śmietany 30%\n- 2 cebule\n- sól i pieprz do smaku"
}
```

**Validation:**

- Text must not be empty
- Maximum 10,000 characters

**Response Payload:**

```json
{
  "ingredients": [
    {
      "name": "filet z kurczaka",
      "quantity": 500,
      "unit": "g",
      "original_text": "500g filetu z kurczaka"
    },
    {
      "name": "śmietana 30%",
      "quantity": 200,
      "unit": "ml",
      "original_text": "200 ml śmietany 30%"
    },
    {
      "name": "cebula",
      "quantity": 2,
      "unit": "szt.",
      "original_text": "2 cebule"
    },
    {
      "name": "sól",
      "quantity": null,
      "unit": null,
      "original_text": "sól i pieprz do smaku",
      "is_staple": true
    }
  ],
  "parsing_confidence": 0.82
}
```

**Success Codes:**

- `200 OK` - Text parsed successfully

**Error Codes:**

- `400 Bad Request` - Empty text or exceeds character limit
- `401 Unauthorized` - User not authenticated
- `422 Unprocessable Entity` - Could not extract ingredients from text

---

### 2.7 Account Management

#### POST /api/auth/delete-account

Delete the authenticated user's account and all associated data.

**Request Payload:**

```json
{
  "password": "current_password",
  "confirmation": "USUŃ MOJE KONTO"
}
```

**Validation:**

- Password must match current user's password
- Confirmation text must be exact match (Polish: "USUŃ MOJE KONTO")

**Response Payload:**

```json
{
  "message": "Konto zostało usunięte pomyślnie"
}
```

**Success Codes:**

- `200 OK` - Account deleted successfully

**Error Codes:**

- `400 Bad Request` - Missing required fields
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - Password incorrect or confirmation text mismatch

---

## 3. Authentication and Authorization

### 3.1 Authentication Mechanism

The API uses **Supabase Auth** with JWT (JSON Web Tokens) for authentication.

**Implementation Details:**

1. **Session Management**
   - Supabase handles user registration, login, logout, and password reset
   - JWT tokens are issued upon successful authentication
   - Tokens are stored in HTTP-only cookies for web security
   - Token refresh is handled automatically by Supabase client

2. **Protected Routes**
   - All API endpoints (except `/api/auth/*` for login/register) require authentication
   - Authentication is verified via `Authorization: Bearer <token>` header
   - Next.js middleware validates tokens before routing to API handlers

3. **Authentication Flow**
   ```
   Client                    Next.js API              Supabase Auth
     |                           |                         |
     |-- Login Request --------->|                         |
     |                           |-- Verify Credentials -->|
     |                           |<-- JWT Token -----------|
     |<-- Set Cookie + Token ----|                         |
     |                           |                         |
     |-- API Request + Token --->|                         |
     |                           |-- Verify JWT ---------->|
     |                           |<-- User Data -----------|
     |                           |-- Process Request       |
     |<-- API Response ----------|                         |
   ```

### 3.2 Authorization (Row Level Security)

Authorization is enforced at the database level using **Supabase Row Level Security (RLS)**:

| Resource                                                                                | Policy                                        |
| --------------------------------------------------------------------------------------- | --------------------------------------------- |
| `profiles`                                                                              | Users can only read/update their own profile  |
| `inventory_items`                                                                       | Users can CRUD only their own inventory items |
| `ai_usage_log`                                                                          | Users can only read their own usage logs      |
| `units`, `product_categories`, `product_catalog`, `staple_definitions`, `system_config` | Read-only for all authenticated users         |

### 3.3 Security Measures

1. **Rate Limiting**
   - AI endpoints: Per-user daily limits (stored in `ai_usage_log`)

2. **Input Validation**
   - All inputs sanitized and validated
   - SQL injection prevented by Supabase parameterized queries
   - XSS prevention through proper encoding

---

## 4. Validation and Business Logic

### 4.1 Validation Rules by Resource

#### Profile

| Field               | Validation Rules                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| `allergies`         | Array of strings; values must exist in `system_config.supported_allergies`; empty array allowed |
| `diets`             | Array of strings; values must exist in `system_config.supported_diets`; empty array allowed     |
| `equipment`         | Array of strings; values must exist in `system_config.supported_equipment`; empty array allowed |
| `onboarding_status` | Must be `"pending"` or `"completed"`                                                            |

#### Inventory Item

| Field          | Validation Rules                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------- |
| `product_id`   | Must reference valid `product_catalog.id` or be null                                                |
| `custom_name`  | String, max 200 chars; required if `product_id` is null                                             |
| `quantity`     | Positive decimal; required if `is_staple` is false; must be null if `is_staple` is true             |
| `unit_id`      | Must reference valid `units.id`; required if quantity provided; must be null if `is_staple` is true |
| `is_staple`    | Boolean; cannot be changed after creation                                                           |
| `is_available` | Boolean; only applicable for staple items                                                           |

**Database Check Constraints:**

```sql
CHECK (product_id IS NOT NULL OR custom_name IS NOT NULL)
CHECK (NOT is_staple OR (quantity IS NULL AND unit_id IS NULL))
```

#### AI Receipt Scan

| Field        | Validation Rules                                   |
| ------------ | -------------------------------------------------- |
| `image`      | Base64 encoded; max 10MB decoded                   |
| `image_type` | Must be `image/jpeg`, `image/png`, or `image/webp` |

#### AI Substitutions

| Field                           | Validation Rules               |
| ------------------------------- | ------------------------------ |
| `recipe_ingredients`            | Array of objects; max 30 items |
| `recipe_ingredients[].name`     | Required string                |
| `recipe_ingredients[].quantity` | Positive number or null        |
| `recipe_ingredients[].unit`     | String or null                 |

### 4.2 Business Logic Implementation

#### Onboarding Enforcement

- Profile is auto-created with `onboarding_status: 'pending'` when user registers
- AI substitution endpoint returns `403 Forbidden` if `onboarding_status !== 'completed'`
- Frontend should redirect to onboarding if status is pending

#### AI Rate Limiting

```
1. Before AI operation:
   - Check ai_usage_log for (user_id, current_date)
   - If entry exists, compare counters against system_config.rate_limits
   - If limit reached, return 429 Too Many Requests

2. After successful AI operation:
   - Call increment_ai_usage(user_id, operation_type) function
   - Function performs atomic upsert to ai_usage_log
```

#### Receipt Scanning (Vision LLM)

```
1. Validate image format and size
   - Accept JPEG, PNG, WebP, HEIC, HEIF formats
   - Maximum file size: 10MB
   - Convert HEIC/HEIF to JPEG if needed for LLM processing

2. Check rate limit
   - Query ai_usage_log for today's receipt_scan_count
   - Compare against system_config.rate_limits.receipt_scans_per_day
   - Return 429 if limit exceeded

3. Process image with Vision LLM (via OpenRouter)
   - Send image directly to a vision-capable LLM (e.g., GPT-4o, Claude)
   - LLM performs OCR and structured extraction in a single step
   - LLM identifies product names, quantities, and units from Polish receipt format
   - Returns structured JSON with extracted items

4. Match extracted items to product catalog
   - For each extracted item:
     a. Search product_catalog using full-text search (search_vector)
     b. If match found with high confidence, link to product_id
     c. If no match or low confidence, keep as raw text (custom_name candidate)
     d. Suggest appropriate unit_id based on product's default_unit or context

5. Calculate confidence scores
   - Per-item confidence based on image clarity and catalog match quality
   - Flag items with low confidence for user review

6. Increment usage counter
   - Call increment_ai_usage(user_id, 'receipt_scan')

7. Return extracted items for verification
   - Items are NOT saved to inventory at this stage
   - User must review and confirm via POST /api/inventory
```

#### Inventory Deduction Logic

```
1. For each deduction request:
   - Verify item belongs to user
   - Verify item is not a staple
   - Calculate new_quantity = current_quantity - deduction_amount

2. If new_quantity <= 0:
   - Delete the inventory item
   - Mark as "deleted" in response

3. If new_quantity > 0:
   - Update item with new quantity
   - Mark as "updated" in response
```

#### Staple Initialization

```
1. Fetch all active staple_definitions
2. For each staple:
   - Check if user already has this product in inventory as staple
   - If not exists OR overwrite=true:
     - Create/update inventory_item with is_staple=true, is_available=true
3. Return summary of created/skipped items
```

#### Recipe Parsing (Server-side Proxy)

```
1. Validate URL format and domain allowlist
2. Fetch page content via server-side HTTP request
3. Parse HTML to extract recipe data (structured data, common patterns)
4. Use LLM (through the OpenRouter) to extract and normalize ingredient list
5. Return parsed ingredients with confidence scores
```

#### AI Substitution Analysis

```
1. Load user's inventory and profile (allergies, diets, equipment)
2. For each recipe ingredient:
   a. Match against inventory (fuzzy matching perhaps with LLM)
   b. Determine status: available, partial, missing
   c. If missing/partial:
      - Query available inventory for potential substitutes
      - Use AI to generate substitution suggestion
   d. Check ingredient against user allergies
3. Generate warnings for allergy violations
4. Return analysis with suggestions and warnings
```

### 4.3 Error Response Format

All error responses follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Nieprawidłowe dane wejściowe",
    "details": [
      {
        "field": "quantity",
        "message": "Ilość musi być liczbą dodatnią"
      }
    ]
  }
}
```

**Standard Error Codes:**
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | User lacks permission for this action |
| `NOT_FOUND` | 404 | Requested resource not found |
| `VALIDATION_ERROR` | 400/422 | Input validation failed |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `EXTERNAL_SERVICE_ERROR` | 502 | External service (AI/proxy) failed |
