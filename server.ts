import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

// Set up JSON body parsing with a generous size limit for receipt image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

let aiClient: GoogleGenAI | null = null;

// Lazy initialization of the Gemini client with validation and fallback
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// API endpoint for processing a receipt image
app.post("/api/ocr-receipt", async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: "Missing imageBase64 or mimeType in request body." });
    }

    const ai = getAiClient();

    const imagePart = {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    };

    const textPart = {
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
    };

    // Use gemini-3.5-flash for processing text & image OCR task
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchant: { type: Type.STRING, description: "Name of the restaurant or venue." },
            currency: { type: Type.STRING, description: "3-letter currency code (e.g., USD, SGD, EUR)." },
            subtotal: { type: Type.NUMBER, description: "Subtotal of the receipt." },
            tax: { type: Type.NUMBER, description: "Tax / VAT / GST amount." },
            serviceCharge: { type: Type.NUMBER, description: "Service charge or tip amount." },
            discount: { type: Type.NUMBER, description: "Discount applied." },
            grandTotal: { type: Type.NUMBER, description: "Grand total of the receipt." },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Item name." },
                  quantity: { type: Type.INTEGER, description: "Integer quantity ONLY if explicitly written (e.g. 2x, Qty: 3), otherwise must be null." },
                  unitPrice: { type: Type.NUMBER, description: "Price of one unit." },
                  totalPrice: { type: Type.NUMBER, description: "Total line item price." },
                  category: { type: Type.STRING, description: "Must be 'personal', 'shared_food', 'shared_charge', or 'discount'." }
                },
                required: ["name", "unitPrice", "totalPrice", "category"]
              }
            }
          },
          required: ["merchant", "currency", "subtotal", "tax", "serviceCharge", "discount", "grandTotal", "items"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    return res.json(parsedData);
  } catch (error: any) {
    console.error("Receipt parsing error:", error);
    return res.status(500).json({ error: error.message || "Failed to process receipt. Please ensure GEMINI_API_KEY is configured." });
  }
});

// Configure Vite middleware in development or serve static build in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
