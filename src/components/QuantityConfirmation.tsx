/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { CheckCircle2, AlertCircle, Plus, Minus, Check } from "lucide-react";
import { ReceiptItem } from "../types";

interface QuantityConfirmationProps {
  items: ReceiptItem[];
  onConfirm: (updatedItems: ReceiptItem[]) => void;
}

export default function QuantityConfirmation({ items, onConfirm }: QuantityConfirmationProps) {
  // Store local copy of quantities for items that need confirmation
  const [localItems, setLocalItems] = useState<ReceiptItem[]>(
    items.map(item => ({
      ...item,
      // Default null quantity to 1
      quantity: item.quantity === null ? 1 : item.quantity,
    }))
  );

  // Track which items have been actively confirmed by the user
  const [confirmedItemIds, setConfirmedItemIds] = useState<string[]>(
    items.filter(item => item.quantity !== null).map(item => item.id)
  );

  const needsConfirmationItems = items.filter(item => item.quantity === null);

  const handleIncrement = (id: string) => {
    setLocalItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = (item.quantity || 1) + 1;
        return {
          ...item,
          quantity: newQty,
          unitPrice: item.totalPrice / newQty, // Recalculate unit price based on total price
        };
      }
      return item;
    }));
  };

  const handleDecrement = (id: string) => {
    setLocalItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, (item.quantity || 1) - 1);
        return {
          ...item,
          quantity: newQty,
          unitPrice: item.totalPrice / newQty,
        };
      }
      return item;
    }));
  };

  const handleConfirmItem = (id: string) => {
    if (!confirmedItemIds.includes(id)) {
      setConfirmedItemIds(prev => [...prev, id]);
    }
  };

  const handleSave = () => {
    // Only allow continue if all items are confirmed
    const allConfirmed = localItems.every(item => confirmedItemIds.includes(item.id));
    if (allConfirmed) {
      onConfirm(localItems);
    }
  };

  const allConfirmed = localItems.every(item => confirmedItemIds.includes(item.id));

  return (
    <div id="qty-confirmation-card" className="space-y-6">
      <div className="text-center space-y-2 mb-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-950 font-sans flex items-center justify-center gap-2">
          Confirm Quantities
        </h2>
        <p className="text-sm text-slate-500 max-w-xs mx-auto">
          Some items did not state a clear quantity. Please confirm how many were ordered.
        </p>
      </div>

      <div id="qty-status-banner" className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-start gap-3 text-sm">
        <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold">Confirmation Required</span>
          <p className="text-xs text-amber-700 leading-relaxed">
            Please review the items highlighted below. We default unstated quantities to <span className="font-bold">1</span>. Adjust and confirm each one.
          </p>
        </div>
      </div>

      {/* Items Requiring Confirmation */}
      <div id="unconfirmed-items-list" className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 max-h-[350px] md:max-h-[50vh] overflow-y-auto pr-1">
        {localItems.map((item) => {
          const isConfirmed = confirmedItemIds.includes(item.id);
          const wasNull = items.find(i => i.id === item.id)?.quantity === null;

          if (!wasNull) return null; // Only show those that needed confirmation

          return (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                isConfirmed 
                  ? "bg-emerald-50/30 border-emerald-100" 
                  : "bg-white border-slate-200 shadow-sm"
              }`}
            >
              <div className="space-y-1">
                <span className="text-sm font-semibold text-slate-800 block">
                  {item.name}
                </span>
                <span className="text-xs font-mono text-slate-500 block">
                  Total: ${(item.totalPrice).toFixed(2)} (${((item.quantity || 1) > 0 ? item.totalPrice / (item.quantity || 1) : item.totalPrice).toFixed(2)} each)
                </span>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 mt-2 sm:mt-0">
                {/* Touch controls */}
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => handleDecrement(item.id)}
                    disabled={isConfirmed}
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white text-slate-600 disabled:opacity-40 transition-all shadow-none border-0"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center font-mono font-bold text-slate-800 text-sm">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleIncrement(item.id)}
                    disabled={isConfirmed}
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white text-slate-600 disabled:opacity-40 transition-all shadow-none border-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Individual Confirm Button */}
                {isConfirmed ? (
                  <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
                    <Check className="w-4 h-4" />
                    Confirmed
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleConfirmItem(item.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-all"
                  >
                    Confirm
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Primary Proceed Action Button */}
      <button
        id="btn-qty-confirmation-proceed"
        type="button"
        onClick={handleSave}
        disabled={!allConfirmed}
        className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold text-sm shadow-sm transition-all text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
      >
        <CheckCircle2 className="w-5 h-5" />
        Continue to Split Bill
      </button>
    </div>
  );
}
