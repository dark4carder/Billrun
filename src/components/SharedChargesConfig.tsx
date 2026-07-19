/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Info, ArrowRight, DollarSign, Percent, PlusCircle, Check, Users, Trash2 } from "lucide-react";
import { BillSession, Participant } from "../types";

interface SharedChargesConfigProps {
  session: BillSession;
  onChangeOverrides: (updatedOverrides: { [key: string]: string[] }) => void;
  onProceed: () => void;
}

export default function SharedChargesConfig({ session, onChangeOverrides, onProceed }: SharedChargesConfigProps) {
  const { tax, serviceCharge, items, participants } = session;

  // Find line items that are marked as shared charges
  const lineItemSharedCharges = items.filter(item => item.category === "shared_charge");

  // Compile a list of all active shared charges
  const activeCharges: Array<{
    id: string;
    name: string;
    amount: number;
    description: string;
  }> = [];

  if (tax > 0) {
    activeCharges.push({
      id: "tax",
      name: "Taxes / GST / VAT",
      amount: tax,
      description: "Standard tax automatically calculated from receipt summary.",
    });
  }

  if (serviceCharge > 0) {
    activeCharges.push({
      id: "serviceCharge",
      name: "Service Charge / Tips",
      amount: serviceCharge,
      description: "Service charge or tip automatically calculated from receipt summary.",
    });
  }

  for (const item of lineItemSharedCharges) {
    activeCharges.push({
      id: item.id,
      name: item.name,
      amount: item.totalPrice,
      description: `Individual line item marked as shared charge.`,
    });
  }

  const handleToggleParticipant = (chargeId: string, participantId: string) => {
    const currentOverrides = { ...session.sharedOverrides };
    const currentList = currentOverrides[chargeId] && currentOverrides[chargeId].length > 0
      ? currentOverrides[chargeId]
      : participants.map(p => p.id); // Default to all participants if empty

    let newList: string[];
    if (currentList.includes(participantId)) {
      newList = currentList.filter(id => id !== participantId);
    } else {
      newList = [...currentList, participantId];
    }

    // If everyone is included, we can clear the override list for simplicity
    if (newList.length === participants.length) {
      delete currentOverrides[chargeId];
    } else {
      currentOverrides[chargeId] = newList;
    }

    onChangeOverrides(currentOverrides);
  };

  const handleSelectAll = (chargeId: string) => {
    const currentOverrides = { ...session.sharedOverrides };
    // Clear override to default to all participants
    delete currentOverrides[chargeId];
    onChangeOverrides(currentOverrides);
  };

  const handleClearAll = (chargeId: string) => {
    const currentOverrides = { ...session.sharedOverrides };
    // Set to empty or first participant so it's not defaulted back to "all" immediately
    currentOverrides[chargeId] = [];
    onChangeOverrides(currentOverrides);
  };

  const getIncludedParticipants = (chargeId: string): string[] => {
    return session.sharedOverrides[chargeId] !== undefined
      ? session.sharedOverrides[chargeId]
      : participants.map(p => p.id);
  };

  return (
    <div id="shared-charges-config-card" className="space-y-6">
      <div className="text-center space-y-2 mb-2">
        <h2 className="text-2xl font-bold tracking-tight text-slate-950 font-sans">
          Shared Charges
        </h2>
        <p className="text-sm text-slate-500 max-w-xs mx-auto">
          Tap the guest tags to select who splits each shared charge, fee, or tax!
        </p>
      </div>

      {activeCharges.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-400">
          <DollarSign className="w-8 h-8 mb-2 text-slate-300" />
          <span className="text-sm font-semibold text-slate-700">No Shared Charges Found</span>
          <p className="text-xs text-slate-400 max-w-xs mt-1">
            This receipt doesn't have taxes, service charges, or custom shared items. Everyone will split item totals directly.
          </p>
        </div>
      ) : (
        <div id="shared-charges-list" className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 max-h-[360px] md:max-h-[50vh] overflow-y-auto pr-1">
          {activeCharges.map(charge => {
            const includedList = getIncludedParticipants(charge.id);
            const shareAmount = charge.amount / (includedList.length || 1);
            const isAllSelected = includedList.length === participants.length;

            return (
              <div
                key={charge.id}
                className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 hover:border-slate-300 transition-all"
              >
                {/* Charge Title/Info */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      {charge.id === "tax" ? (
                        <Percent className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                      )}
                      {charge.name}
                    </span>
                    <p className="text-xs text-slate-400 leading-normal">
                      {charge.description}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-slate-950 font-mono">
                      ${charge.amount.toFixed(2)}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 block pt-0.5">
                      ${shareAmount.toFixed(2)} each
                    </span>
                  </div>
                </div>

                {/* Tag All / Clear All Controls */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Shared By ({includedList.length} of {participants.length})
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(charge.id)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all border-0 bg-transparent flex items-center gap-0.5 ${
                        isAllSelected 
                          ? "text-emerald-600 bg-emerald-50"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      <Users className="w-3 h-3" />
                      Split with Everyone
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClearAll(charge.id)}
                      className="text-[10px] px-2 py-0.5 rounded-md font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all border-0 bg-transparent flex items-center gap-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear
                    </button>
                  </div>
                </div>

                {/* Included Group Members Selector */}
                <div className="pt-1">
                  <div className="flex flex-wrap gap-1.5">
                    {participants.map(p => {
                      const isIncluded = includedList.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleToggleParticipant(charge.id, p.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-none ${
                            isIncluded
                              ? "bg-slate-900 border-slate-900 text-white ring-2 ring-offset-1 ring-slate-900"
                              : "bg-slate-50 border-slate-200 text-slate-400 opacity-60 hover:opacity-100"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${isIncluded ? p.color : "bg-slate-300"}`}>
                            {isIncluded ? <Check className="w-2.5 h-2.5 text-white animate-scaleIn" /> : "•"}
                          </div>
                          <span>{p.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Primary Proceed Action Button */}
      <button
        id="btn-shared-charges-proceed"
        type="button"
        onClick={onProceed}
        className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold text-sm shadow-sm transition-all text-white bg-emerald-600 hover:bg-emerald-700"
      >
        <span>Calculate Split & Summary</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
