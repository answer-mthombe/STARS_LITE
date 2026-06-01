import fs from "fs";

const shapes = ["circle","square","triangle","star","diamond","hexagon","cross","arrow"];
const colors = ["red","blue","green","yellow","purple","orange","white","teal"];
const sizes = ["small","medium","large"];
const patterns = ["solid","outline","striped","dotted","half"];

const pool = [];
let index = 0;

for (const shape of shapes) {
  for (const color of colors) {
    for (const size of sizes) {
      for (const pattern of patterns) {
        pool.push({ index, shape, color, size, pattern });
        index++;
      }
    }
  }
}

fs.writeFileSync("src/data/challenge-pool-expanded.json", JSON.stringify(pool, null, 2));
console.log(`Generated ${pool.length} challenge objects`);