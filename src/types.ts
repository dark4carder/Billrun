/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ItemCategory = 'personal' | 'shared_food' | 'shared_charge' | 'discount';

export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number | null; // null represents unconfirmed quantity (needs user confirmation)
  unitPrice: number;
  totalPrice: number;
  category: ItemCategory;
  // Maps participantId -> quantity assigned to them (for personal or shared food items)
  assigned: { [participantId: string]: number };
}

export interface Participant {
  id: string;
  name: string;
  color: string; // Tailwind bg color class or hex code
  avatar: string; // Initials or fun emoji
}

export interface BillSession {
  merchant: string;
  currency: string;
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discount: number;
  grandTotal: number;
  items: ReceiptItem[];
  participants: Participant[];
  // Maps item ID or type (like 'tax', 'serviceCharge') to list of participant IDs who share it.
  // If not specified or empty, it defaults to all participants.
  sharedOverrides: { [key: string]: string[] };
}

export interface CalculationBreakdown {
  participantId: string;
  name: string;
  color: string;
  avatar: string;
  personalItems: Array<{
    name: string;
    assignedQty: number;
    unitPrice: number;
    shareCost: number;
  }>;
  sharedFoodItems: Array<{
    name: string;
    assignedQty: number;
    shareCost: number;
    totalPrice: number;
  }>;
  sharedChargesCost: number;
  sharedChargesBreakdown: Array<{
    name: string;
    cost: number;
  }>;
  discountBenefit: number;
  totalOwed: number;
}
