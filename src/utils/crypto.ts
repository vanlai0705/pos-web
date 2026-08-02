import CryptoJS from 'crypto-js'

const CRYPTO_KEY = 'YHsasa&1223%astds98##'

/**
 * Hash mật khẩu phía client trước khi gửi lên API (giống Angular CryptoService.computeHash)
 * SHA256(password + KEY)
 */
export const computePasswordSalt = (password: string): string =>
  CryptoJS.SHA256(password + CRYPTO_KEY).toString()
