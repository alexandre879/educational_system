import { formatLeft } from "@/features/home/ExamActivity";

describe("live exam countdown", () => {
  it("shows minutes and seconds, and hours only when needed", () => {
    expect(formatLeft(14 * 60_000 + 21_000)).toBe("14:21");
    expect(formatLeft(65 * 60_000 + 5_000)).toBe("1:05:05");
    expect(formatLeft(-3_000)).toBe("00:00");
  });
});
