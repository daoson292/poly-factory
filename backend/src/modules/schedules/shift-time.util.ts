export interface ShiftTimeDef {
  shiftNumber: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export const STANDARD_SHIFTS: Record<number, ShiftTimeDef> = {
  1: { shiftNumber: 1, startHour: 7, startMinute: 15, endHour: 9, endMinute: 15 },
  2: { shiftNumber: 2, startHour: 9, startMinute: 25, endHour: 11, endMinute: 25 },
  3: { shiftNumber: 3, startHour: 12, startMinute: 0, endHour: 14, endMinute: 0 },
  4: { shiftNumber: 4, startHour: 14, startMinute: 10, endHour: 16, endMinute: 10 },
  5: { shiftNumber: 5, startHour: 16, startMinute: 20, endHour: 18, endMinute: 20 },
  6: { shiftNumber: 6, startHour: 18, startMinute: 30, endHour: 20, endMinute: 30 },
};

export function getShiftStartAndEndTime(workDateInput: Date | string, shiftNumber: number): {
  shiftStartTime: Date;
  shiftEndTime: Date;
} {
  const shift = STANDARD_SHIFTS[shiftNumber];
  if (!shift) {
    throw new Error(`Ca trực không hợp lệ (shiftNumber: ${shiftNumber}). Chỉ chấp nhận ca 1 đến 6.`);
  }

  const dateStr = typeof workDateInput === 'string'
    ? workDateInput.split('T')[0]
    : workDateInput.toISOString().split('T')[0];
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  // UTC+7 -> UTC is startHour - 7
  const shiftStartTime = new Date(Date.UTC(year, month, day, shift.startHour - 7, shift.startMinute, 0, 0));
  const shiftEndTime = new Date(Date.UTC(year, month, day, shift.endHour - 7, shift.endMinute, 0, 0));

  return { shiftStartTime, shiftEndTime };
}

export function isAtLeastTwoHoursBefore(now: Date, shiftStartTime: Date): boolean {
  const diffMs = shiftStartTime.getTime() - now.getTime();
  return diffMs >= 2 * 60 * 60 * 1000;
}

// Shift interval overlap boundary check adjustment (closes #10)
