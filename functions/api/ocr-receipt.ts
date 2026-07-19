export async function onRequestPost(context: {
  request: Request;
  env: { GEMINI_API_KEY?: string };
}) {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  try {
    const body = await context.request.json() as any;
    const { imageBase64, mimeType } = body;
    if (!imageBase64 || !mimeType) {
      return new Response(
        JSON.stringify({ error: "Missing imageBase64 or mimeType in request body." }),
        { status: 400, headers }
      );
    }

    const apiKey = context.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY environment variable is not set. Please configure it in your Cloudflare Pages Settings." }),
        { status: 500, headers }
      );
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: imageBase64,
                  },
                },
                {
                  text: `Analyze this restaurant or café receipt and extract its content with extreme precision. 
Rules:
1. Extract the merchant name, currency (standard 3-letter code like USD, EUR, SGD, GBP, etc., defaulting to USD if unclear), subtotal, tax, service charge, discount, and grand total.
2. Extract all line items as an array. For each item:
   - "name": The exact name of the item.
   - "quantity": Set this to the integer quantity ONLY if it is explicitly and clearly stated on the receipt (e.g. '2 Burger', '3x Tea'). If there is NO explicit quantity shown for this line item, set "quantity" to null.
   - "unitPrice": The price of a single unit. If quantity is null or 1, unitPrice is equal to the total item price.
   - "totalPrice": The total price for this line item.
   - "category": Categorize the line item as one of these:
     * 'personal': Single-person dishes, mains, individual coffees, drinks, desserts.
     * 'shared_food': Large pizzas, shared plates, platters, appetizers intended for multiple people.
     * 'shared_charge': Taxes, service charges, water, bread, nuts, delivery fees, or cover charges listed as line items.
     * 'discount': Direct item or general order discounts.
3. If tax or service charge is listed both as a summary charge and as an individual item, do not double-count them. Prioritize listing summary charges in the primary 'tax' and 'serviceCharge' fields, and keep the individual line items clean.
4. Ensure the mathematical relationship holds: grandTotal = subtotal + tax + serviceCharge - discount. Make adjustments if there are minor rounding discrepancies so the numbers reconcile.`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                merchant: { type: "STRING", description: "Name of the restaurant or venue." },
                currency: { type: "STRING", description: "3-letter currency code (e.g., USD, SGD, EUR)." },
                subtotal: { type: "NUMBER", description: "Subtotal of the receipt." },
                tax: { type: "NUMBER", description: "Tax / VAT / GST amount." },
                serviceCharge: { type: "NUMBER", description: "Service charge or tip amount." },
                discount: { type: "NUMBER", description: "Discount applied." },
                grandTotal: { type: "NUMBER", description: "Grand total of the receipt." },
                items: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      name: { type: "STRING", description: "Item name." },
                      quantity: { type: "INTEGER", description: "Integer quantity ONLY if explicitly written (e.g. 2x, Qty: 3), otherwise must be null." },
                      unitPrice: { type: "NUMBER", description: "Price of one unit." },
                      totalPrice: { type: "NUMBER", description: "Total line item price." },
                      category: { type: "STRING", description: "Must be 'personal', 'shared_food', 'shared_charge', or 'discount'." }
                    },
                    required: ["name", "unitPrice", "totalPrice", "category"]
                  }
                }
              },
              required: ["merchant", "currency", "subtotal", "tax", "serviceCharge", "discount", "grandTotal", "items"]
            }
          }
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: `Gemini API returned error: ${errText}` }),
        { status: response.status, headers }
      );
    }

    const data = await response.json() as any;
    const parsedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    return new Response(parsedText, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process receipt in serverless function." }),
      { status: 500, headers }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
