/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Copy, Check, Share2, Printer, ArrowLeft, QrCode, Sparkles, MessageSquare } from "lucide-react";
import { BillSession, CalculationBreakdown } from "../types";
import { calculateBill } from "../utils/calculations";

interface SummaryResultsProps {
  session: BillSession;
  onReset: () => void;
  onGoBack: () => void;
}

export default function SummaryResults({ session, onReset, onGoBack }: SummaryResultsProps) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState<string | null>(null); // participantId of who's QR is shown, or 'all'
  const [qrCopied, setQrCopied] = useState(false);

  const breakdowns = calculateBill(session);

  // Generate WhatsApp text
  const generateWhatsAppSummary = (): string => {
    let text = `💸 *BillRun Split Summary* 💸\n`;
    text += `📍 *${session.merchant || "Restaurant"}*\n`;
    text += `---------------------------------\n`;

    breakdowns.forEach(p => {
      text += `\n👤 *${p.name.toUpperCase()}* owes *${session.currency} ${p.totalOwed.toFixed(2)}*\n`;
      
      // Personal items
      p.personalItems.forEach(item => {
        text += `  • ${item.name} (x${item.assignedQty}): $${item.shareCost.toFixed(2)}\n`;
      });

      // Shared food items
      p.sharedFoodItems.forEach(item => {
        text += `  • [Shared] ${item.name}: $${item.shareCost.toFixed(2)}\n`;
      });

      // Shared charges breakdown
      p.sharedChargesBreakdown.forEach(charge => {
        text += `  • [Fee] ${charge.name}: $${charge.cost.toFixed(2)}\n`;
      });

      // Discount
      if (p.discountBenefit > 0) {
        text += `  • [Discount] Proportional: -$${p.discountBenefit.toFixed(2)}\n`;
      }
    });

    text += `\n---------------------------------\n`;
    text += `💰 *Grand Total*: *${session.currency} ${session.grandTotal.toFixed(2)}*\n`;
    text += `⚡️ Split fairly in seconds with BillRun!`;
    return text;
  };

  const handleCopyText = () => {
    const text = generateWhatsAppSummary();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLink = () => {
    try {
      // Compress and encode entire session to base64
      const jsonStr = JSON.stringify(session);
      const base64Session = btoa(encodeURIComponent(jsonStr));
      const shareUrl = `${window.location.origin}${window.location.pathname}#session=${base64Session}`;

      navigator.clipboard.writeText(shareUrl);
      setQrCopied(true);
      setTimeout(() => setQrCopied(false), 2000);
    } catch (e) {
      console.error("Encoding error:", e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Get shareable url for the QR code
  const getShareUrl = (): string => {
    try {
      const jsonStr = JSON.stringify(session);
      const base64Session = btoa(encodeURIComponent(jsonStr));
      return `${window.location.origin}${window.location.pathname}#session=${base64Session}`;
    } catch (e) {
      return window.location.href;
    }
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getShareUrl())}`;

  return (
    <div id="summary-results-card" className="space-y-6">
      <div className="text-center space-y-2 mb-2 print:hidden">
        <h2 className="text-2xl font-bold tracking-tight text-slate-950 font-sans flex items-center justify-center gap-2">
          Split Summary
        </h2>
        <p className="text-sm text-slate-500 max-w-xs mx-auto">
          Review totals, copy a chat summary, or generate QR request links.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols on desktop): Summary & Actions */}
        <div className="md:col-span-5 space-y-4 md:sticky md:top-2 print:w-full">
          {/* Bill summary meta card */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-inner space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Merchant Venue</span>
                <h3 className="text-lg font-bold font-sans tracking-tight leading-tight">{session.merchant || "Restaurant Split"}</h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Bill</span>
                <div className="text-xl font-mono font-black">{session.currency} {session.grandTotal.toFixed(2)}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-850 text-xs">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Subtotal</span>
                <span className="font-mono font-semibold">${session.subtotal.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Fees & Tax</span>
                <span className="font-mono font-semibold">${(session.tax + session.serviceCharge).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Discount</span>
                <span className="font-mono font-semibold text-emerald-400">-${session.discount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Action buttons list */}
          <div id="results-action-buttons-list" className="grid grid-cols-2 gap-2 pt-2 print:hidden">
            <button
              id="btn-whatsapp-copy"
              type="button"
              onClick={handleCopyText}
              className="flex items-center justify-center gap-1.5 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
            >
              {copied ? <Check className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy WhatsApp"}
            </button>

            <button
              id="btn-generate-qr"
              type="button"
              onClick={() => setShowQr("all")}
              className="flex items-center justify-center gap-1.5 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
            >
              <QrCode className="w-4 h-4" />
              Show QR Code
            </button>

            <button
              id="btn-share-link"
              type="button"
              onClick={handleShareLink}
              className="flex items-center justify-center gap-1.5 py-3 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-sm"
            >
              {qrCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
              {qrCopied ? "Link Copied!" : "Share Link"}
            </button>

            <button
              id="btn-print-bill"
              type="button"
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 py-3 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Print / PDF
            </button>
          </div>

          <div id="results-nav-buttons" className="flex items-center justify-between pt-4 border-t border-slate-100 print:hidden">
            <button
              type="button"
              onClick={onGoBack}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-all border-0 shadow-none bg-transparent"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <button
              type="button"
              onClick={onReset}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 transition-all border-0 shadow-none bg-transparent"
            >
              Start New Bill
            </button>
          </div>
        </div>

        {/* Right Column (7 cols on desktop): Guest Breakdowns */}
        <div className="md:col-span-7 space-y-3 print:w-full">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block px-1 print:hidden">
            Guest Breakdowns ({breakdowns.length})
          </span>
          
          <div id="breakdown-details-list" className="space-y-4 max-h-[380px] md:max-h-[55vh] overflow-y-auto pr-1">
            {breakdowns.map(p => {
              return (
                <div
                  key={p.participantId}
                  className="border border-slate-100 rounded-2xl bg-white shadow-sm p-4 space-y-3 hover:border-slate-200 transition-all print:break-inside-avoid"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-inner ${p.color}`}>
                        {p.avatar}
                      </div>
                      <span className="text-sm font-bold text-slate-800">{p.name}</span>
                    </div>
                    <span className="text-base font-mono font-black text-slate-950">
                      {session.currency} {p.totalOwed.toFixed(2)}
                    </span>
                  </div>

                  {/* Itemized consumption */}
                  <div className="space-y-1.5 text-xs">
                    {p.personalItems.map((item, idx) => (
                      <div key={`p-${idx}`} className="flex justify-between text-slate-600">
                        <span className="truncate max-w-[200px]">{item.name} (x{item.assignedQty})</span>
                        <span className="font-mono text-slate-500">${item.shareCost.toFixed(2)}</span>
                      </div>
                    ))}

                    {p.sharedFoodItems.map((item, idx) => (
                      <div key={`s-${idx}`} className="flex justify-between text-slate-600 italic">
                        <span className="truncate max-w-[200px]">[Shared] {item.name}</span>
                        <span className="font-mono text-slate-500">${item.shareCost.toFixed(2)}</span>
                      </div>
                    ))}

                    {p.sharedChargesBreakdown.map((charge, idx) => (
                      <div key={`c-${idx}`} className="flex justify-between text-slate-500 text-[11px]">
                        <span>[Fee] {charge.name}</span>
                        <span className="font-mono">${charge.cost.toFixed(2)}</span>
                      </div>
                    ))}

                    {p.discountBenefit > 0 && (
                      <div className="flex justify-between text-emerald-600 text-[11px] font-medium">
                        <span>[Discount Benefit]</span>
                        <span className="font-mono">-${p.discountBenefit.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Share / QR Dialog Overlay */}
      {showQr && (
        <div id="qr-dialog-overlay" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 font-sans">
              Share Bill via QR
            </h3>
            <p className="text-xs text-slate-500">
              Let other group members scan this QR code to view the live split summary on their phones!
            </p>
            
            <div className="w-48 h-48 mx-auto border border-slate-100 rounded-xl flex items-center justify-center p-2 bg-slate-50">
              <img
                src={qrCodeUrl}
                alt="Split QR Code"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleShareLink}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-all border-0 shadow-none"
              >
                {qrCopied ? "Link Copied!" : "Copy Link"}
              </button>
              <button
                type="button"
                onClick={() => setShowQr(null)}
                className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-all border-0 shadow-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
