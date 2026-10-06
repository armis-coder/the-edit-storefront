import { randomBytes, scryptSync } from "node:crypto";

if (!process.stdin.isTTY) {
  console.error("Run this interactively on your own computer: npm run store:credentials");
  process.exit(1);
}
process.stdout.write("Choose an owner password (at least 16 characters; input is hidden): ");
process.stdin.setRawMode(true); process.stdin.resume();
let password = "";
process.stdin.on("data", (chunk) => {
  for (const char of chunk.toString()) {
    if (char === "\u0003") process.exit(1);
    if (char === "\r" || char === "\n") {
      process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write("\n");
      if (password.length < 16) { console.error("Use at least 16 characters."); process.exit(1); }
      const salt = randomBytes(16).toString("hex");
      console.log(`ADMIN_PASSWORD_HASH=${salt}:${scryptSync(password,salt,64).toString("hex")}`);
      console.log(`ADMIN_SESSION_SECRET=${randomBytes(48).toString("base64url")}`);
      console.log("Save these privately in your host's environment variables. Do not commit them."); process.exit(0);
    } else if (char === "\u007f" || char === "\b") password = password.slice(0,-1);
    else if (char >= " " && char !== "\u001b") password += char;
  }
});
