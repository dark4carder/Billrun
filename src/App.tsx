/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Sparkles, ArrowLeft, RefreshCw, Smartphone, HelpCircle } from "lucide-react";
import { BillSession, ReceiptItem, Participant } from "./types";
import ReceiptUpload from "./components/ReceiptUpload";
import QuantityConfirmation from "./components/QuantityConfirmation";
import ParticipantManager from "./components/ParticipantManager";
import ItemAssignment from "./components/ItemAssignment";
import SharedChargesConfig from "./components/SharedChargesConfig";
import SummaryResults from "./components/SummaryResults";

type AppStage = "UPLOAD" | "CONFIRM_QTY" | "PARTICIPANTS" | "ASSIGN_ITEMS" | "SHARED_CHARGES" | "SUMMARY";

const MOCK_RECEIPT_PAYLOAD = {
  merchant: "Cozy Garden Café",
  currency: "USD",
  subtotal: 48.00,
  tax: 4.50,
  serviceCharge: 6.00,
  discount: 5.00,
  grandTotal: 53.50,
  items: [
    {
      name: "Smashed Avocado Toast",
      quantity: 2,
      unitPrice: 12.00,
      totalPrice: 24.00,
      category: "personal" as const
    },
    {
      name: "Truffle Fries (Platter)",
      quantity: null, // Needs user confirmation
      unitPrice: 10.00,
      totalPrice: 10.00,
      category: "shared_food" as const
    },
    {
      name: "Still Mineral Water",
      quantity: 1,
      unitPrice: 4.00,
      totalPrice: 4.00,
      category: "shared_charge" as const
    },
    {
      name: "Roasted Mixed Nuts",
      quantity: 1,
      unitPrice: 5.00,
      totalPrice: 5.00,
      category: "shared_charge" as const
    },
    {
      name: "Iced Caramel Macchiato",
      quantity: 1,
      unitPrice: 5.00,
      totalPrice: 5.00,
      category: "personal" as const
    }
  ]
};

export default function App() {
  const [stage, setStage] = useState<AppStage>("UPLOAD");
  const [session, setSession] = useState<BillSession | null>(null);

  // Parse URL hash on mount to see if we've received a shared bill link
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#session=")) {
        try {
          const base64Str = hash.replace("#session=", "");
          const decodedJson = decodeURIComponent(atob(base64Str));
          const parsedSession = JSON.parse(decodedJson);
          
          if (parsedSession && parsedSession.items && parsedSession.participants) {
            setSession(parsedSession);
            setStage("SUMMARY");
          }
        } catch (e) {
          console.error("Failed to decode shared bill session from URL hash:", e);
        }
      }
    };

    // Run on mount
    handleHashChange();

    // Listen for changes
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleParsingSuccess = (parsedData: any) => {
    // Generate fresh receipt item structures with ids and empty assignment blocks
    const receiptItems: ReceiptItem[] = parsedData.items.map((item: any, index: number) => ({
      id: `item-${index}-${Date.now()}`,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice || item.totalPrice,
      totalPrice: item.totalPrice,
      category: item.category || "personal",
      assigned: {} // Empty assignments to start
    }));

    const initialSession: BillSession = {
      merchant: parsedData.merchant || "Restaurant",
      currency: parsedData.currency || "USD",
      subtotal: parsedData.subtotal || 0,
      tax: parsedData.tax || 0,
      serviceCharge: parsedData.serviceCharge || 0,
      discount: parsedData.discount || 0,
      grandTotal: parsedData.grandTotal || 0,
      items: receiptItems,
      participants: [],
      sharedOverrides: {}
    };

    setSession(initialSession);

    // Determine next stage: if any item has null quantity, we must confirm it first
    const hasNullQuantities = receiptItems.some(i => i.quantity === null);
    if (hasNullQuantities) {
      setStage("CONFIRM_QTY");
    } else {
      setStage("PARTICIPANTS");
    }
  };

  const handleUseDemo = () => {
    handleParsingSuccess(MOCK_RECEIPT_PAYLOAD);
  };

  const handleConfirmQuantities = (updatedItems: ReceiptItem[]) => {
    if (!session) return;
    setSession({
      ...session,
      items: updatedItems
    });
    setStage("PARTICIPANTS");
  };

  const handleParticipantsChange = (updatedParticipants: Participant[]) => {
    if (!session) return;
    setSession({
      ...session,
      participants: updatedParticipants
    });
  };

  const handleItemsChange = (updatedItems: ReceiptItem[]) => {
    if (!session) return;
    setSession({
      ...session,
      items: updatedItems
    });
  };

  const handleSharedOverridesChange = (updatedOverrides: { [key: string]: string[] }) => {
    if (!session) return;
    setSession({
      ...session,
      sharedOverrides: updatedOverrides
    });
  };

  const handleReset = () => {
    // Clear URL hash to prevent loop
    window.location.hash = "";
    setSession(null);
    setStage("UPLOAD");
  };

  // Stage titles and headers
  const getStageHeader = () => {
    switch (stage) {
      case "UPLOAD":
        return "1. Receipt";
      case "CONFIRM_QTY":
        return "2. Quantities";
      case "PARTICIPANTS":
        return "3. Guests";
      case "ASSIGN_ITEMS":
        return "4. Assignment";
      case "SHARED_CHARGES":
        return "5. Fees & Taxes";
      case "SUMMARY":
        return "6. Split Summary";
    }
  };

  const handleGoBack = () => {
    switch (stage) {
      case "CONFIRM_QTY":
        setStage("UPLOAD");
        break;
      case "PARTICIPANTS":
        // Go to confirm qty if any initial items were null, else upload
        const initialWasNull = session?.items.some(
          i => MOCK_RECEIPT_PAYLOAD.items.some(m => m.name === i.name && m.quantity === null)
        );
        setStage(initialWasNull ? "CONFIRM_QTY" : "UPLOAD");
        break;
      case "ASSIGN_ITEMS":
        setStage("PARTICIPANTS");
        break;
      case "SHARED_CHARGES":
        setStage("ASSIGN_ITEMS");
        break;
      case "SUMMARY":
        setStage("SHARED_CHARGES");
        break;
    }
  };

  const getMaxWidthClass = () => {
    switch (stage) {
      case "UPLOAD":
        return "max-w-md md:max-w-3xl lg:max-w-4xl";
      case "CONFIRM_QTY":
        return "max-w-md md:max-w-3xl lg:max-w-4xl";
      case "PARTICIPANTS":
        return "max-w-md md:max-w-4xl lg:max-w-5xl";
      case "ASSIGN_ITEMS":
        return "max-w-md md:max-w-5xl lg:max-w-6xl xl:max-w-7xl";
      case "SHARED_CHARGES":
        return "max-w-md md:max-w-4xl lg:max-w-5xl";
      case "SUMMARY":
        return "max-w-md md:max-w-5xl lg:max-w-6xl";
      default:
        return "max-w-md md:max-w-5xl";
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center font-sans antialiased text-slate-800 p-0 md:p-6 lg:p-8">
      {/* Sleek Adaptive Layout Frame */}
      <main className={`w-full ${getMaxWidthClass()} bg-white md:rounded-3xl md:shadow-2xl md:border border-slate-200/60 overflow-hidden flex flex-col min-h-screen md:min-h-0 relative transition-all duration-300 md:my-8`}>
        
        {/* App Title Header Bar */}
        <header className="bg-slate-950 text-white px-5 py-4 shrink-0 flex items-center justify-between border-b border-slate-900 shadow-sm select-none">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold tracking-tighter text-white">
              BR
            </div>
            <div>
              <h1 className="text-sm font-black font-sans leading-none tracking-tight">BillRun</h1>
              <span className="text-[10px] text-slate-400 font-medium">Fair split, fast split</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {stage !== "UPLOAD" && (
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                {getStageHeader()}
              </span>
            )}
            
            {session && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-white transition-all flex items-center gap-1 font-semibold p-1 hover:bg-slate-900 rounded-lg"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Back Button indicator */}
        {stage !== "UPLOAD" && stage !== "SUMMARY" && (
          <div className="bg-slate-50 border-b border-slate-150 px-4 py-2 shrink-0 flex items-center justify-between print:hidden">
            <button
              type="button"
              onClick={handleGoBack}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-all border-0 shadow-none bg-transparent"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous Step</span>
            </button>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest font-mono">
              Step {stage === "CONFIRM_QTY" ? 2 : stage === "PARTICIPANTS" ? 3 : stage === "ASSIGN_ITEMS" ? 4 : 5} of 6
            </span>
          </div>
        )}

        {/* Scrollable Main Workflow Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-white">
          {stage === "UPLOAD" && (
            <ReceiptUpload 
              onParsingSuccess={handleParsingSuccess} 
            />
          )}

          {stage === "CONFIRM_QTY" && session && (
            <QuantityConfirmation 
              items={session.items} 
              onConfirm={handleConfirmQuantities} 
            />
          )}

          {stage === "PARTICIPANTS" && session && (
            <ParticipantManager
              participants={session.participants}
              onChange={handleParticipantsChange}
              onProceed={() => setStage("ASSIGN_ITEMS")}
            />
          )}

          {stage === "ASSIGN_ITEMS" && session && (
            <ItemAssignment
              items={session.items}
              participants={session.participants}
              onChange={handleItemsChange}
              onProceed={() => setStage("SHARED_CHARGES")}
            />
          )}

          {stage === "SHARED_CHARGES" && session && (
            <SharedChargesConfig
              session={session}
              onChangeOverrides={handleSharedOverridesChange}
              onProceed={() => setStage("SUMMARY")}
            />
          )}

          {stage === "SUMMARY" && session && (
            <SummaryResults
              session={session}
              onReset={handleReset}
              onGoBack={handleGoBack}
            />
          )}
        </div>

        {/* Footer info/metadata (Anti-AI-slop compliance: Clean, literal labels) */}
        <footer className="py-3 px-5 text-center bg-slate-50 border-t border-slate-100 shrink-0 flex items-center justify-between text-[10px] text-slate-400 print:hidden select-none">
          <span className="font-semibold flex items-center gap-1 text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            Adaptive Desktop & Mobile Layout
          </span>
          <span className="font-mono">v1.0.0</span>
        </footer>
      </main>
    </div>
  );
}
