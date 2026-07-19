import { BillSession, ReceiptItem, CalculationBreakdown } from "../types";

/**
 * Perform all bill-splitting calculations for a session.
 * Reconciles individual subtotals, shared food, shared charges (with overrides),
 * and proportional discount allocations. It also adjusts for rounding errors to ensure
 * the sum of all participant totals exactly matches the grandTotal.
 */
export function calculateBill(session: BillSession): CalculationBreakdown[] {
  const { participants, items, tax, serviceCharge, discount, grandTotal } = session;

  if (participants.length === 0) {
    return [];
  }

  // 1. Initialize breakdowns for each participant
  const breakdowns: { [id: string]: CalculationBreakdown } = {};
  for (const p of participants) {
    breakdowns[p.id] = {
      participantId: p.id,
      name: p.name,
      color: p.color,
      avatar: p.avatar,
      personalItems: [],
      sharedFoodItems: [],
      sharedChargesCost: 0,
      sharedChargesBreakdown: [],
      discountBenefit: 0,
      totalOwed: 0,
    };
  }

  // 2. Separate items by category
  const personalItems = items.filter(i => i.category === 'personal');
  const sharedFoodItems = items.filter(i => i.category === 'shared_food');
  const lineItemSharedCharges = items.filter(i => i.category === 'shared_charge');
  const lineItemDiscounts = items.filter(i => i.category === 'discount');

  // 3. Process Personal Items
  for (const item of personalItems) {
    // Sum up the portions assigned to all participants
    const totalAssignedQty = Object.values(item.assigned).reduce((sum, q) => sum + q, 0);
    if (totalAssignedQty === 0) continue;

    for (const pId of Object.keys(item.assigned)) {
      const assignedQty = item.assigned[pId];
      if (assignedQty <= 0) continue;

      // Share of cost is proportional to their assigned quantity
      const shareCost = (assignedQty / totalAssignedQty) * item.totalPrice;
      if (breakdowns[pId]) {
        breakdowns[pId].personalItems.push({
          name: item.name,
          assignedQty,
          unitPrice: item.unitPrice,
          shareCost,
        });
      }
    }
  }

  // 4. Process Shared Food Items
  for (const item of sharedFoodItems) {
    const totalAssignedQty = Object.values(item.assigned).reduce((sum, q) => sum + q, 0);
    if (totalAssignedQty === 0) continue;

    for (const pId of Object.keys(item.assigned)) {
      const assignedQty = item.assigned[pId];
      if (assignedQty <= 0) continue;

      const shareCost = (assignedQty / totalAssignedQty) * item.totalPrice;
      if (breakdowns[pId]) {
        breakdowns[pId].sharedFoodItems.push({
          name: item.name,
          assignedQty,
          shareCost,
          totalPrice: item.totalPrice,
        });
      }
    }
  }

  // 5. Calculate Participant Consumption Subtotals (Personal + Shared Food)
  // This is used for proportional discount allocation
  const participantSubtotals: { [id: string]: number } = {};
  let totalConsumptionSubtotal = 0;

  for (const p of participants) {
    const personalSum = breakdowns[p.id].personalItems.reduce((sum, i) => sum + i.shareCost, 0);
    const sharedFoodSum = breakdowns[p.id].sharedFoodItems.reduce((sum, i) => sum + i.shareCost, 0);
    const subtotal = personalSum + sharedFoodSum;
    participantSubtotals[p.id] = subtotal;
    totalConsumptionSubtotal += subtotal;
  }

  // 6. Calculate Shared Charges (Tax, Service Charge, and Line Item Shared Charges)
  // Each charge can have an override listing specific participants. If none, it splits across all.
  
  // Helper to add a shared charge to a breakdown
  const distributeSharedCharge = (name: string, amount: number, key: string) => {
    if (amount <= 0) return;
    
    // Check if there's an override for who splits this charge
    const targetParticipants = session.sharedOverrides[key] && session.sharedOverrides[key].length > 0
      ? session.sharedOverrides[key]
      : participants.map(p => p.id);

    const activeParticipants = targetParticipants.filter(id => breakdowns[id] !== undefined);
    if (activeParticipants.length === 0) return;

    const share = amount / activeParticipants.length;
    for (const id of activeParticipants) {
      breakdowns[id].sharedChargesCost += share;
      breakdowns[id].sharedChargesBreakdown.push({
        name,
        cost: share,
      });
    }
  };

  // Tax
  distributeSharedCharge("Tax", tax, "tax");
  
  // Service Charge
  distributeSharedCharge("Service Charge", serviceCharge, "serviceCharge");

  // Line item shared charges (like Bread, Water)
  for (const item of lineItemSharedCharges) {
    distributeSharedCharge(item.name, item.totalPrice, item.id);
  }

  // 7. Calculate Discounts
  // Summary discount
  let totalSummaryDiscount = discount;
  
  // Line item discounts
  const totalLineItemDiscounts = lineItemDiscounts.reduce((sum, i) => sum + Math.abs(i.totalPrice), 0);
  const aggregateDiscount = totalSummaryDiscount + totalLineItemDiscounts;

  if (aggregateDiscount > 0) {
    for (const p of participants) {
      // Proportional split based on consumption subtotal
      const ratio = totalConsumptionSubtotal > 0 ? (participantSubtotals[p.id] / totalConsumptionSubtotal) : (1 / participants.length);
      const discountBenefit = ratio * aggregateDiscount;
      breakdowns[p.id].discountBenefit = discountBenefit;
    }
  }

  // 8. Aggregate final values (Pre-rounding)
  // Let's do raw calculations, then round to 2 decimal places and adjust for minor discrepancy.
  const result: CalculationBreakdown[] = [];
  let roundedSum = 0;

  for (const p of participants) {
    const subtotal = participantSubtotals[p.id];
    const charges = breakdowns[p.id].sharedChargesCost;
    const disc = breakdowns[p.id].discountBenefit;
    
    // Total owed = consumption + shared charges - discount
    const rawTotal = Math.max(0, subtotal + charges - disc);
    const roundedTotal = Math.round(rawTotal * 100) / 100;

    breakdowns[p.id].totalOwed = roundedTotal;
    roundedSum += roundedTotal;
    
    result.push(breakdowns[p.id]);
  }

  // 9. Reconcile with grandTotal to correct penny rounding differences
  const targetGrandTotal = Math.round(grandTotal * 100) / 100;
  const discrepancy = targetGrandTotal - roundedSum;

  if (Math.abs(discrepancy) > 0.001 && result.length > 0) {
    // Adjust the participant with the largest share (or the first participant)
    // to absorb the rounding difference, ensuring the total matches exactly.
    let maxShareIdx = 0;
    let maxShareVal = -1;
    for (let i = 0; i < result.length; i++) {
      if (result[i].totalOwed > maxShareVal) {
        maxShareVal = result[i].totalOwed;
        maxShareIdx = i;
      }
    }

    result[maxShareIdx].totalOwed = Math.round((result[maxShareIdx].totalOwed + discrepancy) * 100) / 100;
  }

  return result;
}
