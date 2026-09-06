const fs = require("fs");
const path = require("path");
const ROOT = __dirname;

// 1. 文件存在性
for (const f of ["index.html", "manifest.webmanifest", "sw.js", "package.json", "capacitor.config.json", "icons/app-icon.jpg"]) {
  if (!fs.existsSync(path.join(ROOT, f))) { console.error("MISSING:", f); process.exit(1); }
}
console.log("[ok] 文件齐全");

// 2. JSON 解析
for (const f of ["manifest.webmanifest", "package.json", "capacitor.config.json"]) {
  JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));
}
console.log("[ok] JSON 均合法");

// 3. sw.js 语法
new Function(fs.readFileSync(path.join(ROOT, "sw.js"), "utf8"));
console.log("[ok] sw.js 语法正确");

// 4. index.html 内联脚本语法 + 引擎功能测试
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const code = html.match(/<script>([\s\S]*)<\/script>/)[1];
new Function(code); // 只做语法检查
console.log("[ok] index.html 脚本语法正确");

const el = () => ({
  textContent: "", innerHTML: "", value: "", src: "", dataset: {}, style: {}, width: 0, height: 0,
  naturalWidth: 0, naturalHeight: 0,
  classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  addEventListener() {}, appendChild() {}, focus() {},
  querySelector() { return null; }, querySelectorAll() { return []; },
  getContext() { return { clearRect(){}, strokeRect(){}, fillText(){}, font:"", lineWidth:0, strokeStyle:"", fillStyle:"" }; },
});
global.window = { addEventListener() {}, SpeechRecognition: undefined, webkitSpeechRecognition: undefined };
global.document = {
  getElementById: () => el(), querySelector: () => el(), querySelectorAll: () => [],
  createElement: () => el(), createTextNode: () => ({}), addEventListener() {}, head: { appendChild() {} },
};
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.navigator = { serviceWorker: { register: () => Promise.resolve() } };
global.confirm = () => true;
global.cocoSsd = { load: async () => ({ detect: async () => [] }) };
global.tf = {};
global.URL = { createObjectURL: () => "", revokeObjectURL() {} };
global.fetch = () => Promise.resolve();

eval(code + "\nglobalThis.diagnose = diagnose;");

const origMatchAll = String.prototype.matchAll;
function captureCount(src) {
  let n = 0;
  for (let i = 0; i < src.length; i++) {
    if (src[i] === "(" && src[i - 1] !== "\\" && /^\((?!\?)/.test(src.slice(i))) n++;
  }
  return n;
}
String.prototype.matchAll = function (re) {
  const it = origMatchAll.call(this, re);
  const origNext = it.next.bind(it);
  const src = String(re);
  const groups = captureCount(src);
  return {
    [Symbol.iterator]() { return this; },
    next() {
      const r = origNext();
      if (!r.done && r.value[2] === undefined && groups >= 2 && !src.includes("\\w+\\s+)?(")) {
        console.error("SUSPECT regex:", src, "match:", JSON.stringify(r.value));
        console.error(new Error("stack").stack);
        process.exit(2);
      }
      return r;
    },
  };
};

const tests = [
  ["i have a apple", "I have an apple."],
  ["he go to school yesterday", "He went to school yesterday."],
  ["she like 苹果", "She likes apple."],
  ["i very like play basketball", "I like to play basketball very much."],
  ["there is two cat on the table", "There are two cats on the table."],
  ["he don't like 咖啡", "He doesn't like coffee."],
  ["can you helps me", "Can you help me?"],
  ["i want to goes to park", "I want to go to park."],
  ["yesterday i has a meeting", "Yesterday I had a meeting."],
  ["I have an apple", "I have an apple."],
  ["this is my pen", "This is my pen."],
  ["she go to school yesterday", "She went to school yesterday."],
  ["i am a student", "I am a student."],
  ["he like apples", "He likes apples."],
  ["recieve the letter", "Receive the letter."],
  ["there is two cat", "There are two cats."],
  ["she watchs tv", "She watches tv."],
  ["he have two cat", "He has two cats."],
  ["can i helps you", "Can I help you?"],
  ["he don't know nothing", "He doesn't know anything."],
  ["yesterday i go to school", "Yesterday I went to school."],
  ["there is three apple", "There are three apples."],
  ["i have a orange", "I have an orange."],
  ["i want play football", "I want to play football."],
  ["she don't like tea", "She doesn't like tea."],
  ["i am very happy today", "I am very happy today."],
  ["he is a good student", "He is a good student."],
];
let pass = 0, fail = 0;
for (const [input, expect] of tests) {
  const r = diagnose(input);
  const got = r.corrected;
  const ok = got === expect;
  if (ok) pass++; else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  "${input}" -> "${got}"${ok ? "" : `  期望: "${expect}"`}`);
}
console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
process.exit(fail ? 1 : 0);
