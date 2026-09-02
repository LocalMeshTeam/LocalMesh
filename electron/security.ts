import { createCipheriv, createDecipheriv, createHash, createPrivateKey, createPublicKey, diffieHellman, generateKeyPairSync, randomBytes, sign, verify, type KeyObject } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type StoredKeyPair = { publicKey: string; privateKey: string };
type StoredKeys = { signing: StoredKeyPair; exchange: StoredKeyPair };

export class SecureIdentity {
  private readonly signingPrivateKeyObject: KeyObject;
  private readonly signingPublicKeyObject: KeyObject;
  private readonly exchangePrivateKeyObject: KeyObject;
  private readonly exchangePublicKeyObject: KeyObject;

  public constructor(dataDirectory: string) {
    mkdirSync(dataDirectory, { recursive: true });
    const keyFile = path.join(dataDirectory, "identity-keys.json");
    const keys = this.loadOrCreateKeys(keyFile);
    this.signingPrivateKeyObject = createPrivateKey({ key: Buffer.from(keys.signing.privateKey, "base64"), format: "der", type: "pkcs8" });
    this.signingPublicKeyObject = createPublicKey({ key: Buffer.from(keys.signing.publicKey, "base64"), format: "der", type: "spki" });
    this.exchangePrivateKeyObject = createPrivateKey({ key: Buffer.from(keys.exchange.privateKey, "base64"), format: "der", type: "pkcs8" });
    this.exchangePublicKeyObject = createPublicKey({ key: Buffer.from(keys.exchange.publicKey, "base64"), format: "der", type: "spki" });
  }

  public get signingPublicKey(): string {
    return this.signingPublicKeyObject.export({ format: "der", type: "spki" }).toString("base64");
  }

  public get exchangePublicKey(): string {
    return this.exchangePublicKeyObject.export({ format: "der", type: "spki" }).toString("base64");
  }

  public get fingerprint(): string {
    return createHash("sha256").update(this.signingPublicKey).digest("hex").slice(0, 32);
  }

  public sign(data: string): string {
    return sign(null, Buffer.from(data), this.signingPrivateKeyObject).toString("base64");
  }

  public static verify(data: string, signature: string, publicKey: string): boolean {
    try {
      const key = createPublicKey({ key: Buffer.from(publicKey, "base64"), format: "der", type: "spki" });
      return verify(null, Buffer.from(data), key, Buffer.from(signature, "base64"));
    } catch {
      return false;
    }
  }

  public deriveSharedSecret(peerExchangePublicKey: string): Buffer {
    const peerKey = createPublicKey({ key: Buffer.from(peerExchangePublicKey, "base64"), format: "der", type: "spki" });
    return diffieHellman({ privateKey: this.exchangePrivateKeyObject, publicKey: peerKey });
  }

  public encrypt(data: string, peerExchangePublicKey: string): { ciphertext: string; iv: string; auth_tag: string } {
    const key = this.deriveEncryptionKey(peerExchangePublicKey);
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([cipher.update(data, "utf8"), cipher.final()]);
    return { ciphertext: ciphertext.toString("base64"), iv: iv.toString("base64"), auth_tag: cipher.getAuthTag().toString("base64") };
  }

  public decrypt(payload: { ciphertext: string; iv: string; auth_tag: string }, peerExchangePublicKey: string): string {
    const key = this.deriveEncryptionKey(peerExchangePublicKey);
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
    decipher.setAuthTag(Buffer.from(payload.auth_tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, "base64")), decipher.final()]).toString("utf8");
  }

  private deriveEncryptionKey(peerExchangePublicKey: string): Buffer {
    return createHash("sha256").update(this.deriveSharedSecret(peerExchangePublicKey)).digest();
  }

  private loadOrCreateKeys(keyFile: string): StoredKeys {
    try {
      return JSON.parse(readFileSync(keyFile, "utf8")) as StoredKeys;
    } catch {
      const signing = generateKeyPairSync("ed25519");
      const exchange = generateKeyPairSync("x25519");
      const keys: StoredKeys = {
        signing: {
          publicKey: signing.publicKey.export({ format: "der", type: "spki" }).toString("base64"),
          privateKey: signing.privateKey.export({ format: "der", type: "pkcs8" }).toString("base64"),
        },
        exchange: {
          publicKey: exchange.publicKey.export({ format: "der", type: "spki" }).toString("base64"),
          privateKey: exchange.privateKey.export({ format: "der", type: "pkcs8" }).toString("base64"),
        },
      };
      writeFileSync(keyFile, JSON.stringify(keys), { encoding: "utf8", flag: "wx" });
      return keys;
    }
  }
}
