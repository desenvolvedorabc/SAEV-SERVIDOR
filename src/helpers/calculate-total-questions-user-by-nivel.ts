export function calculateTotalQuestionsUsersByNivel(data: any): {
  TOTAL: number;
  ONE: number;
  TWO: number;
  TREE: number;
  FOUR: number;
} {
  const TOTAL_STUDENTS = data.reduce(
    (sum, cur: any) => {
      const value = +Math.floor(
        (cur.QUESTOES_CERTA / cur.ANSWERS_TEST.length) * 100
      );

      if (value >= 75) {
        return {
          ...sum,
          FOUR: sum.FOUR + 1,
          TOTAL: sum.TOTAL + 1,
        };
      } else if (value >= 50) {
        return {
          ...sum,
          TREE: sum.TREE + 1,
          TOTAL: sum.TOTAL + 1,
        };
      } else if (value >= 25) {
        return {
          ...sum,
          TWO: sum.TWO + 1,
          TOTAL: sum.TOTAL + 1,
        };
      } else {
        return {
          ...sum,
          ONE: sum.ONE + 1,
          TOTAL: sum.TOTAL + 1,
        };
      }
    },
    {
      ONE: 0,
      TWO: 0,
      TREE: 0,
      FOUR: 0,
      TOTAL: 0,
    }
  );

  return TOTAL_STUDENTS;
}
