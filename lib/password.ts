import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

// Hash a password using Node.js built-in crypto module
export async function hashPassword(password: string): Promise<string> {
  // Generate a random salt
  const salt = randomBytes(16).toString('hex');

  // Hash the password with the salt
  const hash = scryptSync(password, salt, 64).toString('hex');

  // Return the salt and hash together
  return `${salt}:${hash}`;
}

// Compare a password with a hash
export async function comparePassword(password: string, storedHash: string): Promise<boolean> {
  try {
    // Extract the salt and hash from the stored hash
    const [salt, hash] = storedHash.split(':');

    // Hash the password with the same salt
    const hashedBuffer = scryptSync(password, salt, 64);

    // Convert the stored hash to a buffer
    const storedHashBuffer = Buffer.from(hash, 'hex');

    // Compare the hashes using a timing-safe function to prevent timing attacks
    return timingSafeEqual(hashedBuffer, storedHashBuffer);
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
}
