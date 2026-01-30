import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import {
  receiptScanSchema,
  checkRateLimit,
  incrementUsage,
  matchProductByName,
  suggestUnitForItem,
} from "@/lib/services/ai.service";
import { scanReceiptImage, ExternalServiceError } from "@/lib/services/openrouter.service";
import {
  unauthorizedError,
  validationError,
  rateLimitedError,
  internalError,
  externalServiceError,
} from "@/lib/api/errors";
import type { ReceiptScanResponseDTO, ReceiptScanItemDTO, ErrorResponseDTO, ValidationErrorDetailDTO } from "@/types";

/**
 * POST /api/ai/scan-receipt
 *
 * Accepts a base64-encoded receipt image and processes it using a vision-capable LLM
 * to extract product items. Returns extracted items with optional product catalog matches,
 * quantity suggestions, and confidence scores.
 *
 * @param request - Request containing image data and type
 * @returns ReceiptScanResponseDTO on success (200)
 * @returns ErrorResponseDTO on error (400, 401, 422, 429, 500, 502)
 *
 * @security Requires authentication via Supabase session cookie or Bearer token
 *
 * @example
 * // Request body:
 * {
 *   "image": "base64_encoded_image_data",
 *   "image_type": "image/jpeg"
 * }
 *
 * // Success response:
 * {
 *   "items": [
 *     {
 *       "name": "Kurczak filet",
 *       "matched_product": { "id": 123, "name_pl": "Kurczak" },
 *       "quantity": 500,
 *       "suggested_unit": { "id": 1, "name_pl": "gram", "abbreviation": "g" },
 *       "confidence": 0.95
 *     }
 *   ],
 *   "usage": {
 *     "scans_used_today": 3,
 *     "scans_remaining": 2
 *   }
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse<ReceiptScanResponseDTO | ErrorResponseDTO>> {
  try {
    // 1. Parse JSON body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return validationError("Invalid JSON in request body");
    }

    // 2. Validate with Zod schema
    const validationResult = receiptScanSchema.safeParse(body);
    if (!validationResult.success) {
      const details: ValidationErrorDetailDTO[] = validationResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return validationError("Validation failed", details);
    }

    const { image, image_type } = validationResult.data;

    // 3. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedError();
    }

    // 4. Check rate limit
    const rateLimitResult = await checkRateLimit(supabase, user.id, "receipt_scans");
    if (!rateLimitResult.allowed) {
      return rateLimitedError("Daily scan limit exceeded. Try again tomorrow");
    }

    // 5. Call vision LLM to scan receipt
    let scanResult;
    try {
      scanResult = await scanReceiptImage(image, image_type);
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        return externalServiceError(error.message);
      }
      throw error;
    }

    // 6. Process extracted items: match products and suggest units
    const items: ReceiptScanItemDTO[] = await Promise.all(
      scanResult.items.map(async (llmItem) => {
        // Match product by name
        const matchedProduct = await matchProductByName(supabase, llmItem.name);

        // Suggest unit based on product or LLM hint
        const suggestedUnit = await suggestUnitForItem(supabase, matchedProduct?.id ?? null, llmItem.unit);

        return {
          name: llmItem.name,
          matched_product: matchedProduct,
          quantity: llmItem.quantity,
          suggested_unit: suggestedUnit,
          confidence: llmItem.confidence,
        };
      })
    );

    // 7. Increment usage counter
    await incrementUsage(supabase, user.id, "receipt_scans");

    // 8. Get updated usage for response
    const updatedRateLimit = await checkRateLimit(supabase, user.id, "receipt_scans");

    // 9. Return response
    const response: ReceiptScanResponseDTO = {
      items,
      usage: {
        scans_used_today: updatedRateLimit.used,
        scans_remaining: updatedRateLimit.remaining,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error in scan-receipt:", error);
    return internalError();
  }
}
