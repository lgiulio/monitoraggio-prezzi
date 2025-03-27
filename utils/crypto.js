

const crypto = require("crypto");

const ENCRYPTION_KEY = "1234567890abcdef1234567890abcdef"; // 32 caratteri esatti
const IV_LENGTH = 16;
console.log("🔐 ENCRYPTION_KEY in uso:", ENCRYPTION_KEY, " → lunghezza:", ENCRYPTION_KEY.length);

function cripta(testo) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
  let criptato = cipher.update(testo, "utf8", "hex");
  criptato += cipher.final("hex");
  return iv.toString("hex") + ":" + criptato;
}

function decripta(testoCriptato) {
  const [ivHex, criptato] = testoCriptato.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
  let decriptato = decipher.update(criptato, "hex", "utf8");
  decriptato += decipher.final("utf8");
  return decriptato;
}

module.exports = { cripta, decripta };
