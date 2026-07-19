import { estimateThetaEAP, getItemInformation } from './services/irtEngine.js';

console.log('==================================================');
console.log('IRT ENGINE MATHEMATICAL TEST VALIDATOR');
console.log('==================================================');

// Test 1: Empty responses should return prior values (theta=0, SD=1)
const resultPrior = estimateThetaEAP([]);
console.log('Test 1: Empty Response History (Standard Normal Prior)');
console.log(`Expected: Theta = 0.0, SD = 1.0`);
console.log(`Calculated: Theta = ${resultPrior.theta}, SD = ${resultPrior.standardError}`);
if (Math.abs(resultPrior.theta) < 0.01 && Math.abs(resultPrior.standardError - 1.0) < 0.02) {
  console.log('✅ Test 1 Passed');
} else {
  console.log('❌ Test 1 Failed');
}

console.log('\n--------------------------------------------------');

// Test 2: Answering a difficult item correctly should shift theta positive
const responsesCorrect = [
  { isCorrect: true, a: 1.5, b: 1.0, c: 0.0 } // high discrimination, difficult question
];
const resultCorrect = estimateThetaEAP(responsesCorrect);
console.log('Test 2: Correct response to a difficult question (b = 1.0)');
console.log(`Calculated: Theta = ${resultCorrect.theta}, SD = ${resultCorrect.standardError}`);
if (resultCorrect.theta > 0) {
  console.log('✅ Test 2 Passed (Theta shifted positive)');
} else {
  console.log('❌ Test 2 Failed (Theta did not shift positive)');
}

console.log('\n--------------------------------------------------');

// Test 3: Answering an easy item incorrectly should shift theta negative
const responsesIncorrect = [
  { isCorrect: false, a: 1.2, b: -1.0, c: 0.0 } // easy question
];
const resultIncorrect = estimateThetaEAP(responsesIncorrect);
console.log('Test 3: Incorrect response to an easy question (b = -1.0)');
console.log(`Calculated: Theta = ${resultIncorrect.theta}, SD = ${resultIncorrect.standardError}`);
if (resultIncorrect.theta < 0) {
  console.log('✅ Test 3 Passed (Theta shifted negative)');
} else {
  console.log('❌ Test 3 Failed (Theta did not shift negative)');
}

console.log('\n--------------------------------------------------');

// Test 4: Information function calculation
console.log('Test 4: Item Information Function at theta = 0.0');
const infoEasy = getItemInformation(0.0, 1.0, -1.0, 0.0);
const infoCentered = getItemInformation(0.0, 1.0, 0.0, 0.0);
console.log(`Information for Easy Question (b = -1.0): ${infoEasy.toFixed(4)}`);
console.log(`Information for Centered Question (b = 0.0): ${infoCentered.toFixed(4)}`);
if (infoCentered > infoEasy) {
  console.log('✅ Test 4 Passed (Maximum information when difficulty aligns with ability)');
} else {
  console.log('❌ Test 4 Failed');
}

console.log('==================================================');
console.log('All tests completed.');
console.log('==================================================');
