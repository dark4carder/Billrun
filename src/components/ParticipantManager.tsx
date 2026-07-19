/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { UserPlus, Trash2, Users, ArrowRight } from "lucide-react";
import { Participant } from "../types";

interface ParticipantManagerProps {
  participants: Participant[];
  onChange: (updated: Participant[]) => void;
  onProceed: () => void;
}

const COLOR_PRESETS = [
  "bg-rose-500 text-white",
  "bg-amber-500 text-slate-900",
  "bg-emerald-500 text-white",
  "bg-sky-500 text-white",
  "bg-indigo-500 text-white",
  "bg-violet-500 text-white",
  "bg-fuchsia-500 text-white",
  "bg-teal-500 text-white",
  "bg-orange-500 text-white"
];

const EMOJI_PRESETS = ["🙋‍♂️", "🙋‍♀️", "🍕", "🍔", "☕️", "🥗", "🍰", "🍩", "🍣", "🌮"];

export default function ParticipantManager({ participants, onChange, onProceed }: ParticipantManagerProps) {
  const [nameInput, setNameInput] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  const [selectedEmoji, setSelectedEmoji] = useState(EMOJI_PRESETS[0]);

  const handleAddParticipant = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedName = nameInput.trim();
    if (!trimmedName) return;

    // Create participant initials
    const initials = trimmedName
      .split(" ")
      .map(part => part[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    const newParticipant: Participant = {
      id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: trimmedName,
      color: selectedColor,
      avatar: selectedEmoji || initials || "👤"
    };

    onChange([...participants, newParticipant]);
    setNameInput("");
    
    // Auto-rotate color and emoji presets for easy rapid entry
    const nextColorIdx = (COLOR_PRESETS.indexOf(selectedColor) + 1) % COLOR_PRESETS.length;
    const nextEmojiIdx = (EMOJI_PRESETS.indexOf(selectedEmoji) + 1) % EMOJI_PRESETS.length;
    setSelectedColor(COLOR_PRESETS[nextColorIdx]);
    setSelectedEmoji(EMOJI_PRESETS[nextEmojiIdx]);
  };

  const handleRemoveParticipant = (id: string) => {
    onChange(participants.filter(p => p.id !== id));
  };

  return (
    <div id="participant-manager-card" className="space-y-6">
      <div className="text-center space-y-2 mb-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-950 font-sans">
          Who's Splitting?
        </h2>
        <p className="text-sm text-slate-500 max-w-xs mx-auto">
          Add the names of everyone who consumed items on this receipt.
        </p>
      </div>

      {/* Responsive columns for form and list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
        {/* Left column: Add Participant Form */}
        <div className="space-y-4">
          <form onSubmit={handleAddParticipant} id="add-participant-form" className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Enter name (e.g. Sarah)..."
                className="flex-1 min-h-[46px] rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-white placeholder:text-slate-400 focus:outline-emerald-500 font-sans"
              />
              <button
                type="submit"
                disabled={!nameInput.trim()}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 rounded-xl flex items-center justify-center font-semibold text-sm transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            </div>

            {/* Color and Avatar picker for customized guests */}
            {nameInput.trim() && (
              <div id="picker-container" className="space-y-3 p-3 bg-slate-50 border border-slate-100 rounded-xl animate-fade-in">
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-500 block">Choose Avatar Theme</span>
                  <div className="flex flex-wrap gap-1.5">
                    {COLOR_PRESETS.map((colorClass) => (
                      <button
                        key={colorClass}
                        type="button"
                        onClick={() => setSelectedColor(colorClass)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all p-0 ${
                          selectedColor === colorClass ? "border-slate-800 scale-110" : "border-transparent"
                        }`}
                      >
                        <span className={`w-full h-full rounded-full ${colorClass.split(" ")[0]}`}></span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-500 block">Select Icon / Emoji</span>
                  <div className="flex flex-wrap gap-1.5">
                    {EMOJI_PRESETS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setSelectedEmoji(emoji)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center border text-base transition-all p-0 bg-white ${
                          selectedEmoji === emoji ? "border-slate-800 bg-slate-100" : "border-slate-200"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Right column: Participants List */}
        <div id="participants-list-container" className="space-y-2 md:border-l md:border-slate-100 md:pl-6">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            <span>Group Members</span>
            <span>{participants.length} added</span>
          </div>

          {participants.length === 0 ? (
            <div className="text-center py-8 bg-slate-50/50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-400">
              <Users className="w-8 h-8 mb-2 stroke-[1.5]" />
              <span className="text-xs font-medium">No participants added yet</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-[250px] md:max-h-[40vh] overflow-y-auto pr-1">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-slate-200 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-inner ${p.color}`}>
                      {p.avatar}
                    </div>
                    <span className="text-sm font-semibold text-slate-800">{p.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveParticipant(p.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all border-0 shadow-none bg-transparent"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Next Step Action Button */}
      <button
        id="btn-participants-proceed"
        type="button"
        onClick={onProceed}
        disabled={participants.length === 0}
        className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold text-sm shadow-sm transition-all text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
      >
        <span>Assign Items</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
