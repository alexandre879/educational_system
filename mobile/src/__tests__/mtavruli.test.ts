import { mtavruli } from "@/lib/mtavruli";

describe("mtavruli", () => {
  it("turns everyday Georgian (Mkhedruli) into capitals (Mtavruli)", () => {
    expect(mtavruli("ჩემი სკოლა")).toBe("ᲩᲔᲛᲘ ᲡᲙᲝᲚᲐ");
    expect(mtavruli("ოთხშაბათი, 11 ნოემბერი")).toBe("ᲝᲗᲮᲨᲐᲑᲐᲗᲘ, 11 ᲜᲝᲔᲛᲑᲔᲠᲘ");
  });

  it("covers the whole alphabet, including the archaic letters", () => {
    expect(mtavruli("აჰჺჽჿ")).toBe("ᲐᲰᲺᲽᲿ");
    // ჻ (separator) and ჼ (modifier) have no capital.
    expect(mtavruli("჻ჼ")).toBe("჻ჼ");
  });

  it("matches the standard Unicode capitals", () => {
    const alphabet = "აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ";
    expect(mtavruli(alphabet)).toBe(alphabet.toUpperCase());
  });

  it("leaves other scripts alone (the style uppercases those)", () => {
    expect(mtavruli("Live · Сейчас · 12")).toBe("Live · Сейчас · 12");
    expect(mtavruli("")).toBe("");
  });
});
