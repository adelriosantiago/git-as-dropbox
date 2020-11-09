const fs = require("fs")

let text = fs.readFileSync(`${__dirname}/html-dev/logView.html`, "utf8")
text = text.replace(/\$/gm, "\\$").replace(/\`/gm, "\\`")
fs.writeFileSync("logView.js", `const logView = \`${text}\`; module.exports = logView;`)

console.log("Done building logView.js")
