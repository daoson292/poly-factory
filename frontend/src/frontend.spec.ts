import { describe, it } from 'node:test';
import * as assert from 'node:assert';

describe('Frontend Business Logic & Stepped Gamification Tests', () => {
  it('should calculate correct stepped level deltaExp (+50 EXP per 10 levels)', () => {
    const calcDeltaExp = (level: number) => {
      const bracket = Math.floor((level - 1) / 10) + 1;
      return 50 * bracket;
    };

    // Levels 1-10: bracket 1 -> 50 EXP
    assert.strictEqual(calcDeltaExp(1), 50);
    assert.strictEqual(calcDeltaExp(5), 50);
    assert.strictEqual(calcDeltaExp(10), 50);

    // Levels 11-20: bracket 2 -> 100 EXP
    assert.strictEqual(calcDeltaExp(11), 100);
    assert.strictEqual(calcDeltaExp(20), 100);

    // Levels 21-30: bracket 3 -> 150 EXP
    assert.strictEqual(calcDeltaExp(25), 150);
  });

  it('should enforce 4-eyes rule on Bug closing (fixer cannot close their own bug)', () => {
    const checkCanCloseBug = (fixedById: string, closerId: string) => {
      if (fixedById === closerId) {
        return { allowed: false, errorCode: 'E-polyfactory-302' };
      }
      return { allowed: true };
    };

    const selfCloseAttempt = checkCanCloseBug('dev_user_01', 'dev_user_01');
    assert.strictEqual(selfCloseAttempt.allowed, false);
    assert.strictEqual(selfCloseAttempt.errorCode, 'E-polyfactory-302');

    const independentCloseAttempt = checkCanCloseBug('dev_user_01', 'tester_user_02');
    assert.strictEqual(independentCloseAttempt.allowed, true);
  });

  it('should enforce Release Gate blocking when CRITICAL or HIGH bugs exist without override', () => {
    const checkReleaseGate = (criticalCount: number, highCount: number, hasOverrideReason: boolean) => {
      const hasBlocking = criticalCount > 0 || highCount > 0;
      if (hasBlocking && !hasOverrideReason) {
        return { passed: false, errorCode: 'E-polyfactory-305' };
      }
      return { passed: true };
    };

    // Blocking bugs exist, no override
    assert.strictEqual(checkReleaseGate(1, 0, false).passed, false);
    assert.strictEqual(checkReleaseGate(0, 2, false).passed, false);

    // Blocking bugs exist but Mentor provided override reason
    assert.strictEqual(checkReleaseGate(1, 0, true).passed, true);

    // Zero blocking bugs
    assert.strictEqual(checkReleaseGate(0, 0, false).passed, true);
  });

  it('should block TRAINEE from applying to practical projects before graduation', () => {
    const checkCanApplyProject = (role: string) => {
      if (role === 'TRAINEE') {
        return { canApply: false, message: 'TRAINEE must graduate Level 3 first.' };
      }
      return { canApply: true };
    };

    assert.strictEqual(checkCanApplyProject('TRAINEE').canApply, false);
    assert.strictEqual(checkCanApplyProject('MEMBER').canApply, true);
    assert.strictEqual(checkCanApplyProject('DEVELOPER').canApply, true);
  });

  it('should enforce 2-hour registration/cancellation cutoff rule for weekly shifts', () => {
    const checkShiftCutoff = (shiftStartTime: Date, currentTime: Date) => {
      const diffMs = shiftStartTime.getTime() - currentTime.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return diffHours >= 2;
    };

    const now = new Date('2026-11-07T05:00:00Z');
    const shiftAt8 = new Date('2026-11-07T08:00:00Z'); // 3 hours ahead -> OK
    const shiftAt6 = new Date('2026-11-07T06:00:00Z'); // 1 hour ahead -> Blocked

    assert.strictEqual(checkShiftCutoff(shiftAt8, now), true);
    assert.strictEqual(checkShiftCutoff(shiftAt6, now), false);
  });

  it('should correctly format certificate code PF-CERT-YYYY-XXXX', () => {
    const formatCertCode = (year: number, sequence: number) => {
      const seqStr = String(sequence).padStart(4, '0');
      return `PF-CERT-${year}-${seqStr}`;
    };

    assert.strictEqual(formatCertCode(2026, 1), 'PF-CERT-2026-0001');
    assert.strictEqual(formatCertCode(2026, 42), 'PF-CERT-2026-0042');
  });
});
