/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Check, Info, ArrowRight, UserCheck, Plus, Minus, Users, Sparkles, Grab } from "lucide-react";
import { ReceiptItem, Participant, ItemCategory } from "../types";

interface ItemAssignmentProps {
  items: ReceiptItem[];
  participants: Participant[];
  onChange: (updatedItems: ReceiptItem[]) => void;
  onProceed: () => void;
}

export default function ItemAssignment({ items, participants, onChange, onProceed }: ItemAssignmentProps) {
  // Currently expanded item ID for assignment
  const [expandedItemId, setExpandedItemId] = useState<string | null>(items[0]?.id || null);
  
  // Track active drag-over state on item cards
  const [draggedOverItemId, setDraggedOverItemId] = useState<string | null>(null);

  // Mobile/touch Tap-to-Assign helper: click a participant, then click an item to assign
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);

  // Filter items that need allocation (everything except discount line items)
  const assignableItems = items.filter(
    item => item.category !== "discount"
  );

  const handleToggleSharedWithEveryone = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid toggling expansion on click
    const updated = items.map(item => {
      if (item.id === itemId) {
        const isShared = item.category === "shared_charge";
        return {
          ...item,
          category: (isShared ? "personal" : "shared_charge") as ItemCategory,
          assigned: {} // Reset manual assignments when toggling
        };
      }
      return item;
    });
    onChange(updated);
  };

  const handleUpdateAssignment = (itemId: string, participantId: string, value: number) => {
    const updated = items.map(item => {
      if (item.id === itemId) {
        const currentAssigned = { ...item.assigned };
        const totalQty = item.quantity || 1;

        // For both personal and shared_food, we assign precise integer quantities now!
        currentAssigned[participantId] = Math.max(0, value);
        
        // Enforce total assigned quantity doesn't exceed receipt quantity, IF totalQty > 1
        const otherSum = Object.keys(currentAssigned)
          .filter(id => id !== participantId)
          .reduce((sum, id) => sum + currentAssigned[id], 0);

        if (totalQty > 1 && otherSum + currentAssigned[participantId] > totalQty) {
          // Cap at remaining quantity
          currentAssigned[participantId] = totalQty - otherSum;
        }

        return { ...item, assigned: currentAssigned };
      }
      return item;
    });
    onChange(updated);
  };

  const handleDropAssign = (itemId: string, participantId: string) => {
    if (!participantId) return;

    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const totalQty = item.quantity || 1;
    const assignedQtySum = Object.values(item.assigned).reduce((sum, val) => sum + val, 0);
    const currentAssignedToUser = item.assigned[participantId] || 0;

    const remaining = totalQty - assignedQtySum;

    if (totalQty > 1) {
      // Both personal and shared_food items with quantity > 1 allow multi-unit assignment
      if (remaining > 0) {
        handleUpdateAssignment(itemId, participantId, currentAssignedToUser + 1);
      }
    } else {
      // For single-unit items (totalQty === 1 or null), it's a binary assignment/toggle
      if (item.category === "personal") {
        // Personal single item: re-assign to this new person
        const updated = items.map(i => {
          if (i.id === itemId) {
            return {
              ...i,
              assigned: { [participantId]: 1 }
            };
          }
          return i;
        });
        onChange(updated);
      } else {
        // Shared single item: toggle sharing state
        const newVal = currentAssignedToUser > 0 ? 0 : 1;
        handleUpdateAssignment(itemId, participantId, newVal);
      }
    }
  };

  const handleItemCardClick = (item: ReceiptItem) => {
    if (selectedParticipantId) {
      // Tap-to-assign flow
      handleDropAssign(item.id, selectedParticipantId);
    } else {
      // Normal click: toggle expand
      setExpandedItemId(expandedItemId === item.id ? null : item.id);
    }
  };

  const toggleSharedParticipant = (itemId: string, participantId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const currentVal = item.assigned[participantId] || 0;
    const newVal = currentVal > 0 ? 0 : 1;
    handleUpdateAssignment(itemId, participantId, newVal);
  };

  const incrementQty = (itemId: string, participantId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const currentVal = item.assigned[participantId] || 0;
    handleUpdateAssignment(itemId, participantId, currentVal + 1);
  };

  const decrementQty = (itemId: string, participantId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const currentVal = item.assigned[participantId] || 0;
    handleUpdateAssignment(itemId, participantId, currentVal - 1);
  };

  // Helper to check if an item is fully and correctly allocated
  const getItemAllocationStatus = (item: ReceiptItem) => {
    const totalQty = item.quantity || 1;
    const assignedQtySum = Object.values(item.assigned).reduce((sum, val) => sum + val, 0);
    const remaining = Math.max(0, totalQty - assignedQtySum);

    if (item.category === "shared_charge") {
      return {
        isFullyAllocated: true,
        assignedSum: 0,
        totalQty,
        remaining: 0,
      };
    } else if (item.category === "personal") {
      return {
        isFullyAllocated: assignedQtySum === totalQty,
        assignedSum: assignedQtySum,
        totalQty,
        remaining,
      };
    } else {
      // Shared food: if quantity > 1, require fully allocated (assignedQtySum === totalQty)
      // otherwise (for simple sharing of single-unit items), fully allocated if at least 1 person shares
      const isFullyAllocated = totalQty > 1 ? (assignedQtySum === totalQty) : (assignedQtySum > 0);
      return {
        isFullyAllocated,
        assignedSum: assignedQtySum,
        totalQty,
        remaining,
      };
    }
  };

  // Count fully allocated assignable items
  const fullyAllocatedCount = assignableItems.filter(item => getItemAllocationStatus(item).isFullyAllocated).length;
  const isReadyToProceed = assignableItems.length > 0 && fullyAllocatedCount === assignableItems.length;

  return (
    <div id="item-assignment-card" className="space-y-6">
      <div className="text-center space-y-2 mb-2">
        <h2 className="text-2xl font-bold tracking-tight text-slate-950 font-sans">
          Assign Items
        </h2>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          Drag guest avatars onto items, or select a guest and tap items to split!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Items List (7 cols on desktop) */}
        <div className="md:col-span-7 space-y-3 order-2 md:order-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            <span>Receipt Items ({assignableItems.length})</span>
            <span className="hidden md:inline">Click item to expand options</span>
          </div>

          <div id="assignable-items-list" className="space-y-3 max-h-[380px] md:max-h-[50vh] overflow-y-auto pr-1">
            {assignableItems.map(item => {
              const isExpanded = expandedItemId === item.id;
              const isDragOver = draggedOverItemId === item.id;
              const { isFullyAllocated, assignedSum, totalQty, remaining } = getItemAllocationStatus(item);

              // Get participants assigned to this item to render quick color-coded pills
              const assignedParticipants = participants.filter(p => (item.assigned[p.id] || 0) > 0);

              return (
                <div
                  key={item.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDraggedOverItemId(item.id);
                  }}
                  onDragLeave={() => setDraggedOverItemId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const pId = e.dataTransfer.getData("text/plain");
                    handleDropAssign(item.id, pId);
                    setDraggedOverItemId(null);
                  }}
                  className={`rounded-2xl border transition-all duration-200 ${
                    isDragOver
                      ? "border-emerald-500 bg-emerald-50/40 ring-4 ring-emerald-100 scale-[1.02] shadow-md"
                      : isExpanded 
                        ? "border-slate-300 bg-white ring-2 ring-slate-100 shadow-sm" 
                        : isFullyAllocated
                          ? "border-emerald-100 bg-emerald-50/10 hover:bg-emerald-50/20"
                          : "border-slate-100 bg-slate-50 hover:bg-slate-100/50"
                  }`}
                >
                  {/* Item Header (Toggable or clickable drop target) */}
                  <div
                    type="button"
                    onClick={() => handleItemCardClick(item)}
                    className="w-full p-4 text-left flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="space-y-1 pr-4 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800">
                          {item.name}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          x{totalQty}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleToggleSharedWithEveryone(item.id, e)}
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider transition-all border ${
                            item.category === "shared_charge"
                              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                              : "bg-slate-100 text-slate-400 border-slate-200/60 hover:text-slate-600 hover:bg-slate-200/50"
                          }`}
                        >
                          <Users className="w-2.5 h-2.5" />
                          <span>Shared</span>
                        </button>
                        {item.category === "shared_food" && (
                          <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                            Custom Split
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {/* Color pills for current assignees */}
                        {item.category === "shared_charge" ? (
                          <span className="bg-slate-950 text-white border border-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                            <Users className="w-2.5 h-2.5 text-slate-300 animate-pulse" />
                            <span>Shared with Everyone</span>
                          </span>
                        ) : assignedParticipants.length > 0 ? (
                          assignedParticipants.map(p => (
                            <span
                              key={p.id}
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${p.color}`}
                            >
                              <span>{p.name}</span>
                              {(totalQty > 1 || item.category === "personal") && (
                                <span className="bg-black/10 px-1 rounded-sm">
                                  {item.assigned[p.id]}
                                </span>
                              )}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic font-medium">Unassigned</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-semibold text-slate-900 font-mono">
                          ${item.totalPrice.toFixed(2)}
                        </span>
                        {totalQty > 1 && item.category !== "shared_charge" && (
                          <span className={`text-[9px] font-mono font-bold mt-0.5 ${
                            remaining > 0 ? "text-amber-600" : "text-emerald-600"
                          }`}>
                            {remaining > 0 ? `${remaining} left` : "All assigned"}
                          </span>
                        )}
                      </div>
                      {isFullyAllocated ? (
                        <div className="w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                      )}
                    </div>
                  </div>

                  {/* Assignment Controls (Expanded View / Fallback manual input) */}
                  {isExpanded && !selectedParticipantId && (
                    <div className="border-t border-slate-100 p-4 bg-slate-50/50 rounded-b-2xl space-y-4">
                      {item.category === "shared_charge" ? (
                        <div className="flex items-start gap-2.5 text-xs text-slate-600 bg-white border border-slate-100 p-3.5 rounded-xl shadow-sm">
                          <Sparkles className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5 animate-pulse" />
                          <div>
                            <strong className="text-slate-800">Shared with Everyone:</strong> This item is active as a shared charge. Cost will be summed up and divided equally among all guests. No assignment required!
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Category description */}
                          <div className="flex items-start gap-2 text-xs text-slate-500 bg-white border border-slate-100 p-2.5 rounded-xl">
                            <Info className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
                            <div>
                              {item.category === "personal" ? (
                                <span>
                                  <strong className="text-slate-700">Personal Item:</strong> Distribute the total quantity (<span className="font-bold">{totalQty}</span>) precisely. <span className="text-amber-600 font-semibold">{remaining} remaining.</span>
                                </span>
                              ) : (
                                <span>
                                  <strong className="text-slate-700">Shared Food:</strong> {totalQty > 1 ? (
                                    <span>Distribute the total quantity (<span className="font-bold">{totalQty}</span>) among members who shared. <span className="text-amber-600 font-semibold">{remaining} remaining.</span></span>
                                  ) : (
                                    <span>Select all members sharing this dish. Cost will split equally among all selected members.</span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Participant Assignment grid/list */}
                          <div className="space-y-2">
                            {participants.map(p => {
                              const qtyAssigned = item.assigned[p.id] || 0;
                              const isSharedSelected = qtyAssigned > 0;

                              return (
                                <div
                                  key={p.id}
                                  className="flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-xl shadow-sm"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-inner ${p.color}`}>
                                      {p.avatar}
                                    </div>
                                    <span className="text-xs font-semibold text-slate-700">{p.name}</span>
                                  </div>

                                  {/* Allocation Controls based on category and totalQty */}
                                  {(item.category === "personal" || totalQty > 1) ? (
                                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                                      <button
                                        type="button"
                                        onClick={() => decrementQty(item.id, p.id)}
                                        disabled={qtyAssigned <= 0}
                                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white text-slate-500 disabled:opacity-30 border-0 shadow-none bg-transparent"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <span className="w-7 text-center font-mono font-bold text-slate-800 text-xs">
                                        {qtyAssigned}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => incrementQty(item.id, p.id)}
                                        disabled={remaining <= 0}
                                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white text-slate-500 disabled:opacity-30 border-0 shadow-none bg-transparent"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => toggleSharedParticipant(item.id, p.id)}
                                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                                        isSharedSelected
                                          ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-sm"
                                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                      }`}
                                    >
                                      {isSharedSelected ? "Sharing" : "Exclude"}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Interactive Deck (5 cols on desktop) */}
        <div className="md:col-span-5 space-y-4 order-1 md:order-2 md:sticky md:top-2">
          {/* Draggable Participant Avatars Rail */}
          <div id="draggable-participants-rail" className="bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {selectedParticipantId ? "⚡️ Tap items to assign" : "👉 Drag & Drop or Tap guest to select"}
              </span>
              {selectedParticipantId && (
                <button
                  type="button"
                  onClick={() => setSelectedParticipantId(null)}
                  className="text-[10px] text-rose-500 hover:text-rose-700 font-bold border-0 bg-transparent p-0"
                >
                  Cancel Select
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2.5">
              {participants.map(p => {
                const isSelected = selectedParticipantId === p.id;
                return (
                  <div
                    key={p.id}
                    draggable="true"
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", p.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() => setSelectedParticipantId(isSelected ? null : p.id)}
                    className={`relative group flex items-center gap-2 px-3 py-2 bg-white border rounded-xl cursor-grab active:cursor-grabbing transition-all select-none ${
                      isSelected
                        ? "ring-2 ring-emerald-500 border-emerald-500 scale-105 shadow-md animate-pulse"
                        : "border-slate-200 hover:border-slate-300 shadow-sm"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${p.color}`}>
                      {p.avatar}
                    </div>
                    <span className="text-xs font-bold text-slate-700">{p.name}</span>
                    <Grab className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live progress indicator bar */}
          <div id="allocation-progress-bar" className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
              <Users className="w-4 h-4 text-slate-400" />
              <span>Allocation Progress:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-emerald-600">
                {fullyAllocatedCount} / {assignableItems.length}
              </span>
              <div className="w-20 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${(fullyAllocatedCount / (assignableItems.length || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Instructions Card for Desktop */}
          <div className="hidden md:block p-4 bg-emerald-50/50 border border-emerald-100/60 rounded-2xl text-xs space-y-2">
            <span className="font-bold text-emerald-800 block">💡 Pro Split Tips:</span>
            <ul className="list-disc list-inside space-y-1 text-emerald-700">
              <li>Drag a participant avatar to assign 1 unit of an item instantly.</li>
              <li>Or click a participant above to enter "Quick Tap Mode" and click any item to assign.</li>
              <li>Click an item directly to adjust split ratios or fine-tune multi-quantity allocations.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Next Step Action Button */}
      <button
        id="btn-item-assignment-proceed"
        type="button"
        onClick={onProceed}
        disabled={!isReadyToProceed}
        className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold text-sm shadow-sm transition-all text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
      >
        <span>Shared Charges & Taxes</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
