# Product & Inventory API Reference

## Overview

RESTful API for managing products and inventory. Uses Zod schema validation and
custom error classes for consistent error handling.

## Error Response Format

All errors follow a standard format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "details": {}
  }
}
```

The `details` field is optional and provides additional context (e.g.,
field-level validation errors).

### Error Codes

| HTTP Status | Code             | Description                              |
| ----------- | ---------------- | ---------------------------------------- |
| 401         | UNAUTHORIZED     | Authentication required or token invalid |
| 403         | FORBIDDEN        | Insufficient permissions                 |
| 404         | NOT_FOUND        | Requested resource does not exist        |
| 409         | CONFLICT         | Resource conflict (duplicate SKU, etc.)  |
| 422         | VALIDATION_ERROR | Request validation failed                |
| 429         | RATE_LIMITED     | Too many requests                        |
| 500         | INTERNAL_ERROR   | Unexpected server error                  |

### Validation Error Details

Validation errors include field-level details:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "fields": {
        "name": ["String must contain at least 2 character(s)"],
        "price": ["Number must be greater than 0"]
      }
    }
  }
}
```

## Endpoints

### Products

#### GET /api/products

List products with filtering, sorting, and pagination.

**Query Parameters:**

| Name       | Type    | Required | Default    | Constraints                                       |
| ---------- | ------- | -------- | ---------- | ------------------------------------------------- |
| page       | integer | No       | 1          | Minimum: 1                                        |
| limit      | integer | No       | 25         | 1-100                                             |
| category   | string  | No       | -          | One of: electronics, clothing, food, books, other |
| min_price  | number  | No       | -          | Minimum: 0                                        |
| max_price  | number  | No       | -          | Maximum: 999999.99                                |
| in_stock   | boolean | No       | -          | Filter to in-stock items only                     |
| sort_by    | string  | No       | created_at | One of: name, price, created_at, stock_quantity   |
| sort_order | string  | No       | desc       | One of: asc, desc                                 |

**Response (200 OK):**

```json
{
  "products": [
    {
      "id": "prod_abc123",
      "name": "Wireless Bluetooth Headphones",
      "sku": "ELEC-4521",
      "price": 79.99,
      "currency": "USD",
      "category": "electronics",
      "description": "Premium noise-cancelling headphones",
      "stock_quantity": 150,
      "tags": ["audio", "wireless", "bluetooth"],
      "weight_kg": 0.25,
      "dimensions": { "length_cm": 20, "width_cm": 18, "height_cm": 8 }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 340,
    "total_pages": 14
  }
}
```

**Error Responses:**

| Status | Code             | Condition            | Example                             |
| ------ | ---------------- | -------------------- | ----------------------------------- |
| 422    | VALIDATION_ERROR | Invalid query params | `min_price=-5` or `sort_by=invalid` |

**Example:**

```bash
curl "https://api.example.com/api/products?category=electronics&min_price=50&sort_by=price&sort_order=asc"
```

---

#### GET /api/products/:id

Get a single product by ID.

**Path Parameters:**

| Name | Type   | Required | Description |
| ---- | ------ | -------- | ----------- |
| id   | string | Yes      | Product ID  |

**Response (200 OK):** Single product object (same schema as list item).

**Error Responses:**

| Status | Code      | Condition         |
| ------ | --------- | ----------------- |
| 404    | NOT_FOUND | Product not found |

**Error Example:**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Product with id 'prod_xyz999' not found"
  }
}
```

---

#### POST /api/products

Create a new product.

**Request Body:**

| Field          | Type     | Required | Constraints                                       |
| -------------- | -------- | -------- | ------------------------------------------------- |
| name           | string   | Yes      | 2-200 characters                                  |
| sku            | string   | Yes      | Format: XX-0000 (regex: `^[A-Z]{2,4}-\d{4,8}$`)   |
| price          | number   | Yes      | Positive, max 999999.99                           |
| currency       | string   | No       | One of: USD, EUR, GBP. Default: USD               |
| category       | string   | Yes      | One of: electronics, clothing, food, books, other |
| description    | string   | No       | Max 5000 characters                               |
| stock_quantity | integer  | No       | Minimum: 0. Default: 0                            |
| tags           | string[] | No       | Max 20 tags, each max 50 chars                    |
| weight_kg      | number   | No       | Positive                                          |
| dimensions     | object   | No       | { length_cm, width_cm, height_cm } - all positive |

**Error Responses:**

| Status | Code             | Condition                  |
| ------ | ---------------- | -------------------------- |
| 409    | CONFLICT         | Duplicate SKU              |
| 409    | CONFLICT         | Duplicate name in category |
| 422    | VALIDATION_ERROR | Invalid fields             |

**Example:**

```bash
curl -X POST https://api.example.com/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Wireless Mouse","sku":"ELEC-7890","price":29.99,"category":"electronics","stock_quantity":200}'
```

---

#### PUT /api/products/:id

Update a product. At least one field must be provided.

**Error Responses:**

| Status | Code             | Condition                    |
| ------ | ---------------- | ---------------------------- |
| 404    | NOT_FOUND        | Product not found            |
| 409    | CONFLICT         | SKU already in use           |
| 422    | VALIDATION_ERROR | Invalid fields or empty body |

---

#### DELETE /api/products/:id

Delete a product.

**Response:** 204 No Content.

**Error Responses:**

| Status | Code      | Condition         |
| ------ | --------- | ----------------- |
| 404    | NOT_FOUND | Product not found |

---

#### POST /api/products/:id/inventory

Adjust product inventory.

**Request Body:**

| Field        | Type    | Required | Constraints                                       |
| ------------ | ------- | -------- | ------------------------------------------------- |
| adjustment   | integer | Yes      | Positive to add, negative to remove               |
| reason       | string  | Yes      | One of: restock, sale, damage, return, correction |
| reference_id | string  | No       | Order or shipment ID                              |

**Response (200 OK):**

```json
{
  "product_id": "prod_abc123",
  "previous_stock": 150,
  "adjustment": -5,
  "new_stock": 145,
  "reason": "sale",
  "reference_id": "order_def456"
}
```

**Error Responses:**

| Status | Code             | Condition                            |
| ------ | ---------------- | ------------------------------------ |
| 404    | NOT_FOUND        | Product not found                    |
| 422    | VALIDATION_ERROR | Insufficient stock or invalid fields |

**Insufficient Stock Error Example:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Insufficient stock for adjustment",
    "details": {
      "current_stock": 5,
      "requested_adjustment": -10,
      "resulting_stock": -5
    }
  }
}
```
