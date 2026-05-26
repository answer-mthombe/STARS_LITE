import fs from "fs";

const raw = fs.readFileSync(
  "./src/data/challenge-object-library.json",
  "utf-8"
);

const data = JSON.parse(raw);

const shapes = data.enums.shapes.length;
const colors = data.enums.colors.length;
const sizes = data.enums.sizes.length;
const patterns = data.enums.patterns.length;

const total = shapes * colors * sizes * patterns;

console.log("Shapes:", shapes);
console.log("Colors:", colors);
console.log("Sizes:", sizes);
console.log("Patterns:", patterns);
console.log("Pool:", total);

if (total !== 960) {
  throw new Error("Pool must equal 960");
}

console.log("Challenge library valid.");