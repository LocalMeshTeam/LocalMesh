import { createHash } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, statSync, unlinkSync, writeSync } from "node:fs";
import path from "node:path";

const MAX_FILE_SIZE = 1024 * 1024 * 1024;

export type FileTransferMetadata = {
  file_id: string;
  file_name: string;
  size: number;
  checksum: string;
};

export class FileStorage {
  private readonly directory: string;

  public constructor(baseDirectory: string) {
    this.directory = path.join(baseDirectory, "files");
    mkdirSync(this.directory, { recursive: true });
  }

  public createTransfer(fileId: string, fileName: string, size: number, checksum: string): FileTransferMetadata {
    if (!/^[a-zA-Z0-9-]{1,128}$/.test(fileId)) throw new Error("Invalid file ID");
    if (!fileName || fileName !== path.basename(fileName) || fileName.length > 255) throw new Error("Invalid file name");
    if (!Number.isSafeInteger(size) || size < 0 || size > MAX_FILE_SIZE) throw new Error("Invalid file size");
    if (!/^[a-f0-9]{64}$/i.test(checksum)) throw new Error("Invalid file checksum");
    const metadata = { file_id: fileId, file_name: fileName, size, checksum: checksum.toLowerCase() };
    writeFile(this.metadataPath(fileId), JSON.stringify(metadata, null, 2));
    return metadata;
  }

  public writeChunk(fileId: string, offset: number, chunk: Uint8Array): void {
    const metadata = this.readMetadata(fileId);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset + chunk.byteLength > metadata.size) throw new Error("File chunk is outside the expected range");
    const descriptor = openSync(this.dataPath(fileId), "a+");
    try { writeSync(descriptor, chunk, 0, chunk.byteLength, offset); } finally { closeSync(descriptor); }
  }

  public finalize(fileId: string): FileTransferMetadata {
    const metadata = this.readMetadata(fileId);
    if (!existsSync(this.dataPath(fileId)) || statSync(this.dataPath(fileId)).size !== metadata.size) throw new Error("File is incomplete");
    const checksum = createHash("sha256").update(readFileSync(this.dataPath(fileId))).digest("hex");
    if (checksum !== metadata.checksum) throw new Error("File checksum does not match");
    return metadata;
  }

  public read(fileId: string): Buffer {
    this.finalize(fileId);
    return readFileSync(this.dataPath(fileId));
  }

  public getPath(fileId: string): string {
    if (!/^[a-zA-Z0-9-]{1,128}$/.test(fileId)) throw new Error("Invalid file ID");
    return this.dataPath(fileId);
  }

  public remove(fileId: string): void {
    if (!/^[a-zA-Z0-9-]{1,128}$/.test(fileId)) return;
    for (const filePath of [this.dataPath(fileId), this.metadataPath(fileId)]) if (existsSync(filePath)) unlinkSync(filePath);
  }

  private readMetadata(fileId: string): FileTransferMetadata {
    if (!/^[a-zA-Z0-9-]{1,128}$/.test(fileId)) throw new Error("Invalid file ID");
    const metadataPath = this.metadataPath(fileId);
    if (!existsSync(metadataPath)) throw new Error("File transfer not found");
    return JSON.parse(readFileSync(metadataPath, "utf8")) as FileTransferMetadata;
  }

  private dataPath(fileId: string): string { return path.join(this.directory, `${fileId}.bin`); }
  private metadataPath(fileId: string): string { return path.join(this.directory, `${fileId}.json`); }
}

function writeFile(filePath: string, content: string): void {
  const descriptor = openSync(filePath, "w");
  try { writeSync(descriptor, content, 0, "utf8"); } finally { closeSync(descriptor); }
}
