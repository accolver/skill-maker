// routes/products.ts - Node.js API with custom error classes and Zod validation
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const router = Router();

// --- Custom Error Classes ---

class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

class ValidationError extends AppError {
  constructor(message: string, details: Record<string, unknown>) {
    super(422, 'VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(404, 'NOT_FOUND', `${resource} with id '${id}' not found`);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
    this.name = 'ConflictError';
  }
}

class RateLimitError extends AppError {
  constructor(retryAfterSeconds: number) {
    super(429, 'RATE_LIMITED', 'Too many requests', {
      retry_after_seconds: retryAfterSeconds,
    });
    this.name = 'RateLimitError';
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, 'FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

// --- Zod Schemas ---

const ProductCreateSchema = z.object({
  name: z.string().min(2).max(200).describe('Product name'),
  sku: z.string().regex(/^[A-Z]{2,4}-\d{4,8}$/).describe('SKU format: XX-0000'),
  price: z.number().positive().max(999999.99).describe('Price in USD'),
  currency: z.enum(['USD', 'EUR', 'GBP']).default('USD'),
  category: z.enum(['electronics', 'clothing', 'food', 'books', 'other']),
  description: z.string().max(5000).optional(),
  stock_quantity: z.number().int().min(0).default(0),
  tags: z.array(z.string().max(50)).max(20).optional(),
  weight_kg: z.number().positive().optional(),
  dimensions: z.object({
    length_cm: z.number().positive(),
    width_cm: z.number().positive(),
    height_cm: z.number().positive(),
  }).optional(),
});

const ProductUpdateSchema = ProductCreateSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

const InventoryAdjustSchema = z.object({
  adjustment: z.number().int().describe('Positive to add, negative to remove'),
  reason: z.enum(['restock', 'sale', 'damage', 'return', 'correction']),
  reference_id: z.string().optional().describe('Order or shipment ID'),
});

const ProductQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  category: z.enum(['electronics', 'clothing', 'food', 'books', 'other']).optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().max(999999.99).optional(),
  in_stock: z.coerce.boolean().optional(),
  sort_by: z.enum(['name', 'price', 'created_at', 'stock_quantity']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

// --- Validation Middleware ---

function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(issue.message);
      }
      throw new ValidationError('Request validation failed', {
        fields: fieldErrors,
      });
    }
    req.body = result.data;
    next();
  };
}

function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(issue.message);
      }
      throw new ValidationError('Query parameter validation failed', {
        fields: fieldErrors,
      });
    }
    (req as any).validatedQuery = result.data;
    next();
  };
}

// --- Routes ---

// GET /api/products - List products with filtering and pagination
router.get('/',
  validateQuery(ProductQuerySchema),
  async (req: Request, res: Response) => {
    const query = (req as any).validatedQuery;
    // ... database query with filters
    const products = []; // placeholder
    const total = 0;
    res.json({
      products,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        total_pages: Math.ceil(total / query.limit),
      },
    });
  }
);

// GET /api/products/:id - Get single product
router.get('/:id', async (req: Request, res: Response) => {
  const product = null; // placeholder: await Product.findById(req.params.id)
  if (!product) {
    throw new NotFoundError('Product', req.params.id);
  }
  res.json({ product });
});

// POST /api/products - Create product
router.post('/',
  validateBody(ProductCreateSchema),
  async (req: Request, res: Response) => {
    // Check for duplicate SKU
    const existingBySku = null; // placeholder: await Product.findOne({ sku: req.body.sku })
    if (existingBySku) {
      throw new ConflictError(`Product with SKU '${req.body.sku}' already exists`);
    }

    // Check for duplicate name in same category
    const existingByName = null; // placeholder
    if (existingByName) {
      throw new ConflictError(
        `Product named '${req.body.name}' already exists in category '${req.body.category}'`
      );
    }

    const product = req.body; // placeholder: await Product.create(req.body)
    res.status(201).json({ product });
  }
);

// PUT /api/products/:id - Update product
router.put('/:id',
  validateBody(ProductUpdateSchema),
  async (req: Request, res: Response) => {
    const product = null; // placeholder: await Product.findById(req.params.id)
    if (!product) {
      throw new NotFoundError('Product', req.params.id);
    }

    if (req.body.sku) {
      const existingBySku = null; // placeholder
      if (existingBySku) {
        throw new ConflictError(`SKU '${req.body.sku}' is already in use`);
      }
    }

    // placeholder: Object.assign(product, req.body); await product.save();
    res.json({ product });
  }
);

// DELETE /api/products/:id - Delete product
router.delete('/:id', async (req: Request, res: Response) => {
  const product = null; // placeholder: await Product.findById(req.params.id)
  if (!product) {
    throw new NotFoundError('Product', req.params.id);
  }
  // placeholder: await product.delete()
  res.status(204).send();
});

// POST /api/products/:id/inventory - Adjust inventory
router.post('/:id/inventory',
  validateBody(InventoryAdjustSchema),
  async (req: Request, res: Response) => {
    const product = null; // placeholder: await Product.findById(req.params.id)
    if (!product) {
      throw new NotFoundError('Product', req.params.id);
    }

    // Check if adjustment would result in negative stock
    const currentStock = 0; // placeholder: product.stock_quantity
    if (currentStock + req.body.adjustment < 0) {
      throw new ValidationError('Insufficient stock for adjustment', {
        current_stock: currentStock,
        requested_adjustment: req.body.adjustment,
        resulting_stock: currentStock + req.body.adjustment,
      });
    }

    // placeholder: update stock and create audit log
    res.json({
      product_id: req.params.id,
      previous_stock: currentStock,
      adjustment: req.body.adjustment,
      new_stock: currentStock + req.body.adjustment,
      reason: req.body.reason,
      reference_id: req.body.reference_id,
    });
  }
);

// --- Centralized Error Handler ---

function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
    return;
  }

  // Unexpected errors
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}

export { router, errorHandler };
