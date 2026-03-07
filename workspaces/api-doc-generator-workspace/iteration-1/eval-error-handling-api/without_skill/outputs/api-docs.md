# Products API

## Endpoints

### GET /api/products

List products with filtering and pagination.

Query params: page, limit, category, min_price, max_price, in_stock, sort_by,
sort_order.

### GET /api/products/:id

Get a product by ID. Returns 404 if not found.

### POST /api/products

Create a product.

Required fields: name, sku, price, category. Optional: description,
stock_quantity, tags, weight_kg, dimensions, currency.

Returns 409 if SKU already exists.

### PUT /api/products/:id

Update a product. Returns 404 if not found.

### DELETE /api/products/:id

Delete a product. Returns 204 on success, 404 if not found.

### POST /api/products/:id/inventory

Adjust inventory for a product.

Body:

- adjustment (integer) - positive to add, negative to remove
- reason (string) - one of: restock, sale, damage, return, correction
- reference_id (string, optional)

Returns error if adjustment would result in negative stock.

## Error Handling

The API uses custom error classes. Errors are returned in this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Description"
  }
}
```

Common error codes: VALIDATION_ERROR (422), NOT_FOUND (404), CONFLICT (409).
