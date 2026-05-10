// Corrige nombres mal mapeados de la importación de Jefit:
//   - "Hip Thrust" con kg >= 65  → "Aductor máquina"     (era Machine Hip Adduction)
//   - "Hip Thrust" con kg <  65  → "Hip Thrust máquina"  (Barbell Hip Thrust de Jefit, en realidad máquina)
//   - "Elevaciones laterales polea" con kg >= 13.5 → "Pull-over polea"  (era Cable Shoulder Extension)
//
// Uso:
//   node scripts/fix-imported-data.mjs <input.json> <output.json>

import { readFileSync, writeFileSync } from 'node:fs';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error('Uso: node scripts/fix-imported-data.mjs <input.json> <output.json>');
  process.exit(1);
}

const data = JSON.parse(readFileSync(inPath, 'utf-8'));

const HIP_THRUST_THRESHOLD = 65;
const LATERAL_PULLOVER_THRESHOLD = 13.5;

let renamedAductor = 0;
let renamedHipMaquina = 0;
let renamedLateral = 0;

function maxKgInSets(sets) {
  let max = 0;
  for (const s of sets ?? []) {
    const k = parseFloat(s.kg);
    if (!isNaN(k) && k > max) max = k;
  }
  return max;
}

for (const session of data.sessions ?? []) {
  for (const ex of session.exercises ?? []) {
    const maxKg = maxKgInSets(ex.sets);

    if (ex.name === 'Hip Thrust') {
      if (maxKg >= HIP_THRUST_THRESHOLD) {
        ex.name = 'Aductor máquina';
        ex.type = 'iso';
        renamedAductor++;
      } else {
        ex.name = 'Hip Thrust máquina';
        renamedHipMaquina++;
      }
    } else if (ex.name === 'Elevaciones laterales polea' && maxKg >= LATERAL_PULLOVER_THRESHOLD) {
      ex.name = 'Pull-over polea';
      renamedLateral++;
    }
  }
}

writeFileSync(outPath, JSON.stringify(data, null, 2));

console.log(`Hip Thrust (>=${HIP_THRUST_THRESHOLD}kg) → Aductor máquina:        ${renamedAductor}`);
console.log(`Hip Thrust (<${HIP_THRUST_THRESHOLD}kg)  → Hip Thrust máquina:     ${renamedHipMaquina}`);
console.log(`Elevaciones laterales polea → Pull-over polea: ${renamedLateral}`);
console.log(`Escrito en ${outPath}`);
