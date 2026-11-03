import { Injectable } from '@nestjs/common';

@Injectable()
export class LevelEngineService {
  /**
   * Công thức tính Level Bậc thang (+50 EXP mỗi 10 cấp, Mục 6.7):
   * Lv 1 -> 10: 50 EXP/cấp (Lv 10 đạt tại 450 EXP, Lv 11 đạt tại 500 EXP)
   * Lv 11 -> 20: 100 EXP/cấp (Lv 20 đạt tại 1400 EXP)
   * Lv 21 -> 30: 150 EXP/cấp (Lv 30 đạt tại 2850 EXP)
   * Lv 31 -> 40: 200 EXP/cấp (Lv 40 đạt tại 4800 EXP)
   */
  calculateLevel(totalExpEarned: number): number {
    if (!totalExpEarned || totalExpEarned <= 0) return 1;

    let level = 1;
    let expRemaining = totalExpEarned;

    while (true) {
      const tier = Math.floor((level - 1) / 10) + 1;
      const expNeededForNextLevel = 50 * tier;

      if (expRemaining >= expNeededForNextLevel) {
        expRemaining -= expNeededForNextLevel;
        level += 1;
      } else {
        break;
      }
    }

    return level;
  }
}
