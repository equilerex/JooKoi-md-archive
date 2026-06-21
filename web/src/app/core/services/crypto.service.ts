import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CryptoService {
  private key = '';

  setKey(username: string): void {
    this.key = username;
  }

  encrypt(plaintext: string): string {
    if (!this.key) {
      return plaintext;
    }
    return btoa(unescape(encodeURIComponent(this.xor(plaintext, this.key))));
  }

  decrypt(ciphertext: string): string {
    if (!this.key) {
      return ciphertext;
    }
    try {
      return this.xor(decodeURIComponent(escape(atob(ciphertext))), this.key);
    } catch {
      return ciphertext;
    }
  }

  encryptSegment(segment: string): string {
    return 'e:' + this.encrypt(segment);
  }

  decryptSegment(segment: string): string {
    if (segment.startsWith('e:')) {
      return this.decrypt(segment.slice(2));
    }
    return segment;
  }

  isEncryptedSegment(segment: string): boolean {
    return segment.startsWith('e:');
  }

  isLikelyEncrypted(text: string): boolean {
    if (!text || text.length === 0) return false;
    try {
      atob(text);
      return true;
    } catch {
      return false;
    }
  }

  private xor(input: string, key: string): string {
    const keyLen = key.length;
    let output = '';
    for (let i = 0; i < input.length; i++) {
      output += String.fromCharCode(input.charCodeAt(i) ^ key.charCodeAt(i % keyLen));
    }
    return output;
  }
}
