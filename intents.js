module.exports = function detectIntent(input) {
  const text = input.toLowerCase();

  if (text.includes("warranty")) return "warranty";
  if (text.includes("install") || text.includes("setup")) return "installation";
  if (text.includes("return") || text.includes("replace") || text.includes("broken")) return "return";

  return null;
};