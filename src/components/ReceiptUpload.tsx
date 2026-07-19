/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { Upload, Sparkles, AlertCircle, Zap, Users, Calculator, MessageSquare } from "lucide-react";

interface ReceiptUploadProps {
  onParsingSuccess: (data: any) => void;
}

export default function ReceiptUpload({ onParsingSuccess }: ReceiptUploadProps) {
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadingPhrases = [
    "Reading receipt layout...",
    "Scanning items with Gemini AI...",
    "Extracting prices and quantities...",
    "Detecting subtotal, tax, and service charges...",
    "Reconciling grand totals...",
    "Structuring bill metadata...",
    "Finishing up receipt analysis..."
  ];

  const triggerProgress = () => {
    let currentStep = 0;
    setLoadingProgress(5);
    setLoadingText(loadingPhrases[0]);

    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < loadingPhrases.length) {
        setLoadingProgress((prev) => Math.min(prev + 12, 90));
        setLoadingText(loadingPhrases[currentStep]);
      }
    }, 1200);

    return interval;
  };

  const processImage = async (file: File) => {
    setLoading(true);
    setError(null);
    const progressInterval = triggerProgress();

    try {
      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
      if (!validTypes.includes(file.type)) {
        throw new Error("Unsupported file format. Please upload a JPEG, PNG, or WEBP image.");
      }

      // Convert image file to Base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Extract base64 part only
          const base64Data = result.split(",")[1];
          resolve(base64Data);
        };
        reader.onerror = (e) => reject(new Error("Failed to read image file."));
        reader.readAsDataURL(file);
      });

      const base64Data = await base64Promise;

      // Call Express server Gemini endpoint
      const response = await fetch("/api/ocr-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: file.type,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned error status ${response.status}`);
      }

      const parsedData = await response.json();
      setLoadingProgress(100);
      clearInterval(progressInterval);
      
      // Delay slightly for a smooth transition experience
      setTimeout(() => {
        onParsingSuccess(parsedData);
        setLoading(false);
      }, 500);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during receipt processing.");
      setLoading(false);
      clearInterval(progressInterval);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImage(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImage(e.dataTransfer.files[0]);
    }
  };

  const selectFile = () => {
    fileInputRef.current?.click();
  };

  if (loading) {
    return (
      <div id="receipt-upload-loading" className="flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
        <div className="relative mb-8 w-24 h-24 flex items-center justify-center">
          {/* Outer rotating accent ring */}
          <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-emerald-500 border-r-emerald-500 rounded-full animate-spin"></div>
          <Sparkles className="w-10 h-10 text-emerald-500 animate-pulse" />
        </div>

        <h3 className="text-xl font-semibold text-slate-800 mb-2 font-sans">
          Analysing Receipt
        </h3>
        
        {/* Progress Bar Container */}
        <div className="w-full max-w-xs bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
          <div 
            className="bg-emerald-500 h-full transition-all duration-500 ease-out"
            style={{ width: `${loadingProgress}%` }}
          ></div>
        </div>

        <p className="text-sm text-slate-500 font-mono italic animate-pulse max-w-sm">
          {loadingText}
        </p>
      </div>
    );
  }

  return (
    <div id="receipt-upload-card" className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
        {/* Left Column: Scanner (7 cols on desktop) */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-6">
          <div className="text-left space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950 font-sans">
              Scan Receipt
            </h2>
            <p className="text-sm text-slate-500 max-w-md">
              Upload a receipt image from your camera or library to extract items automatically.
            </p>
          </div>

          {error && (
            <div id="upload-error-banner" className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold">Analysis Failed</span>
                <p className="text-xs text-rose-700 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Drag and Drop Zone */}
          <div
            id="drag-drop-zone"
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={selectFile}
            className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 min-h-[260px] flex-1 relative ${
              dragActive 
                ? "border-emerald-500 bg-emerald-50/50" 
                : "border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="w-14 h-14 bg-white shadow-sm border border-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-400">
              <Upload className="w-6 h-6 text-emerald-500" />
            </div>

            <span className="text-sm font-semibold text-slate-800 mb-1">
              Take a photo or upload
            </span>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Tap here to open your camera, browse photo library, or drag & drop. Supports JPG, PNG, WEBP.
            </p>
          </div>
        </div>

        {/* Right Column: Key Features & Tips (5 cols on desktop) */}
        <div className="md:col-span-5 bg-slate-50 border border-slate-150 rounded-2xl p-6 flex flex-col justify-center space-y-5 shadow-inner">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">How BillRun Works</span>
            <h3 className="text-base font-bold text-slate-900 font-sans tracking-tight">Fair split, fast split</h3>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100/60 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/50">
                <Zap className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-800">Smart Gemini AI OCR</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Scans your receipt and instantly extracts items, quantities, and prices without manual entry.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100/60 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/50">
                <Users className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-800">Interactive Seat Mapping</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Drag & drop guest avatars onto receipt items. Supports splitting individual units or sharing plates.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100/60 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/50">
                <Calculator className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-800">Fair Taxes & Discounts</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Prorates taxes, service fees, tips, and active discounts automatically among diners based on their actual food share.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100/60 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/50">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-800">Instant Copy / QR Code</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Get custom itemized text summaries ready to copy straight into WhatsApp, or display a QR code for quick UPI/payment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
