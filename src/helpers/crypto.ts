import { createHmac, randomBytes, scryptSync } from 'crypto'
import { EncryptionTransformer } from 'typeorm-encrypted'

// Pass the password string and get hashed password back
// ( and store only the hashed string in your database)
const encryptPassowrd = (password: string, salt: string) => {
  return scryptSync(password, salt, 32).toString('hex')
}

/**
 * Hash password with random salt
 * @return {string} password hash followed by salt
 *  XXXX till 64 XXXX till 32
 *
 */
export const hashPassword = (password: string): string => {
  // Any random string here (ideally should be atleast 16 bytes)
  const salt = randomBytes(16).toString('hex')
  return encryptPassowrd(password, salt) + salt
}

// fetch the user from your db and then use this function

/**
 * Match password against the stored hash
 */
export const matchPassword = (passowrd: string, hash: string): boolean => {
  // extract salt from the hashed string
  // our hex password length is 32*2 = 64
  const salt = hash.slice(64)
  const originalPassHash = hash.slice(0, 64)
  const currentPassHash = encryptPassowrd(passowrd, salt)
  return originalPassHash === currentPassHash
}

export const hashColumn = new EncryptionTransformer({
  key: `89650F19E6E27B4070B1FB3981DC145189650F19E6E27B4070B1FB3981DC1451`,
  algorithm: 'aes-256-cbc',
  ivLength: 16,
  iv: '5CC69B45D582ACCF2A24CC45D437B16A',
})

/**
 * Generate a secure token for student result access
 * Uses HMAC-SHA256 to prevent IDOR attacks
 * @param assessmentId - ID da avaliação
 * @param studentId - ID do aluno
 * @returns secure token
 */
export const generateStudentResultToken = (
  assessmentId: number,
  studentId: number,
): string => {
  const secret = process.env.JWT_SECRET
  const data = `${assessmentId}:${studentId}`
  const hash = createHmac('sha256', secret).update(data).digest('hex')
  return hash
}

/**
 * Validate student result token
 * @param assessmentId - ID da avaliação
 * @param studentId - ID do aluno
 * @param token - Token to validate
 * @returns true if valid, false otherwise
 */
export const validateStudentResultToken = (
  assessmentId: number,
  studentId: number,
  token: string,
): boolean => {
  const expectedToken = generateStudentResultToken(assessmentId, studentId)
  return expectedToken === token
}
