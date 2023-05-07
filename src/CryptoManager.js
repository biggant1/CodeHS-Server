const crypto = require("crypto");
const fs = require("fs");

let public_key = Buffer.from(
  fs.readFileSync("keys/public.pem", "utf-8")
).toString("base64");

let private_key = fs.readFileSync("keys/private.pem", "utf-8");

function generatePasswordHash(password) {
  let salt = crypto.randomBytes(16).toString("hex");

  return [
    salt,
    crypto.pbkdf2Sync(password, salt, 1000, 64, `sha512`).toString(`hex`),
  ];
}

function checkIfValid(password, salt, hash) {
  let new_hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, `sha512`)
    .toString(`hex`);

  return new_hash == hash;
}

/**
 * Used to generate keys when setting up
 */
function createKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "pkcs1",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs1",
      format: "pem",
    },
  });
  fs.writeFileSync("keys/public.pem", publicKey);
  fs.writeFileSync("keys/private.pem", privateKey);
}

function decryptPassword(encryptedPassword) {
  try {
    let decryptedPassword = crypto.privateDecrypt(
      {
        key: private_key,
        padding: crypto.constants.RSA_PKCS1_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(encryptedPassword, "base64")
    );
    return Buffer.from(decryptedPassword, "base64").toString("utf-8");
  } catch (e) {
    return "Invalid encryption";
  }
}

decryptPassword(
  "BMaW1Fz4j1v5z6LJJrVY5RDlqRjIWUBISNmTIwTxPFfCmgsFoGey6FbBMlexc4JwOMiK8N48r6kVuVYrqZKezlpELU5xwQq/MPXk+phwaHxKvW1G9KzlTiwbf5q+hK7NEC8giLaqP9opoA7o6NDEORHZK7xvZ7UK449uf6oRTBo2v1LLHy5JezYJHkaqTpA7QLxfEcfqLp4Ph1o13ancGCMnTq9hYyNL2mWOBCGlrBNdXxaQWB2qguTmASXDOpeX3sYLXtk0HjZrwi+uYNYH7JD6vkqN2DIEgksaqFkgdJVMsINpalmS3uN6jJ10E27Tn1nMwLaORoftBvPY3ng8RQ=="
);

module.exports = {
  generatePasswordHash,
  checkIfValid,
  decryptPassword,
  public_key,
};
