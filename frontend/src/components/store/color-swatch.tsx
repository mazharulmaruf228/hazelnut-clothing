const colors: Record<string, string> = {
  white: "#f9f9f5",
  cloud: "#e4e6e2",
  black: "#242b27",
  indigo: "#3e5b79",
  oat: "#d8cdb5",
  olive: "#73815e",
  red: "#b44b40",
  blue: "#4b7f9b",
  green: "#578166",
  pink: "#dc9d9f",
  yellow: "#d5bb5c",
  gray: "#929b96",
  grey: "#929b96",
};
export function ColorSwatch({ value }: { value: string }) {
  const color = colors[value.toLowerCase()] || (/^#[0-9a-f]{6}$/i.test(value) ? value : "#b8c0bb");
  return <span aria-hidden="true" className="inline-block h-[17px] w-[17px] shrink-0 rounded-full border border-black/10" style={{ backgroundColor: color }} />;
}
