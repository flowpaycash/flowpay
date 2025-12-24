// 🔐 FLOWPay - Token Validator
// Implementa validação criptográfica robusta de tokens

const crypto = require('crypto');

// Configurações de token
const TOKEN_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
  tagLength: 16,
  expirationMs: 15 * 60 * 1000 // 15 minutos
};

// Gerar chave secreta para tokens (em produção, usar variável de ambiente)
const TOKEN_SECRET = process.env.TOKEN_SECRET || crypto.randomBytes(32).toString('hex');

// Função para gerar token seguro
function generateSecureToken(payload) {
  try {
    const iv = crypto.randomBytes(TOKEN_CONFIG.ivLength);
    const cipher = crypto.createCipher(TOKEN_CONFIG.algorithm, TOKEN_SECRET);
    
    // Adicionar timestamp de expiração
    const tokenData = {
      ...payload,
      issuedAt: Date.now(),
      expiresAt: Date.now() + TOKEN_CONFIG.expirationMs
    };
    
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(tokenData), 'utf8'),
      cipher.final()
    ]);
    
    const tag = cipher.getAuthTag();
    
    // Combinar IV + tag + dados criptografados
    const token = Buffer.concat([iv, tag, encrypted]).toString('base64');
    
    return token;
  } catch (error) {
    throw new Error('Falha ao gerar token: ' + error.message);
  }
}

// Função para validar token
function validateSecureToken(token) {
  try {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Token inválido' };
    }
    
    // Decodificar base64
    const tokenBuffer = Buffer.from(token, 'base64');
    
    if (tokenBuffer.length < TOKEN_CONFIG.ivLength + TOKEN_CONFIG.tagLength) {
      return { valid: false, error: 'Token malformado' };
    }
    
    // Extrair componentes
    const iv = tokenBuffer.slice(0, TOKEN_CONFIG.ivLength);
    const tag = tokenBuffer.slice(TOKEN_CONFIG.ivLength, TOKEN_CONFIG.ivLength + TOKEN_CONFIG.tagLength);
    const encrypted = tokenBuffer.slice(TOKEN_CONFIG.ivLength + TOKEN_CONFIG.tagLength);
    
    // Descriptografar
    const decipher = crypto.createDecipher(TOKEN_CONFIG.algorithm, TOKEN_SECRET);
    decipher.setAuthTag(tag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]).toString('utf8');
    
    const tokenData = JSON.parse(decrypted);
    
    // Verificar expiração
    if (Date.now() > tokenData.expiresAt) {
      return { valid: false, error: 'Token expirado' };
    }
    
    // Verificar se foi emitido no futuro (proteção contra clock skew)
    if (tokenData.issuedAt > Date.now() + 60000) { // 1 minuto de tolerância
      return { valid: false, error: 'Token inválido - timestamp futuro' };
    }
    
    return { 
      valid: true, 
      data: tokenData,
      remainingTime: tokenData.expiresAt - Date.now()
    };
    
  } catch (error) {
    return { 
      valid: false, 
      error: 'Falha na validação do token: ' + error.message 
    };
  }
}

// Função para gerar token de sessão admin
function generateAdminSessionToken(adminId) {
  return generateSecureToken({
    type: 'admin_session',
    adminId,
    permissions: ['read', 'write', 'admin']
  });
}

// Função para validar token de sessão admin
function validateAdminSessionToken(token) {
  const validation = validateSecureToken(token);
  
  if (!validation.valid) {
    return validation;
  }
  
  if (validation.data.type !== 'admin_session') {
    return { valid: false, error: 'Tipo de token inválido' };
  }
  
  return validation;
}

// Função para gerar token de magic link
function generateMagicLinkToken(email) {
  return generateSecureToken({
    type: 'magic_link',
    email,
    purpose: 'authentication'
  });
}

// Função para validar token de magic link
function validateMagicLinkToken(token) {
  const validation = validateSecureToken(token);
  
  if (!validation.valid) {
    return validation;
  }
  
  if (validation.data.type !== 'magic_link') {
    return { valid: false, error: 'Tipo de token inválido' };
  }
  
  return validation;
}

// Função para limpar tokens expirados (para manutenção)
function cleanupExpiredTokens() {
  // Em uma implementação real, isso seria feito em um banco de dados
  // Por enquanto, apenas retorna sucesso
  return { cleaned: 0, message: 'Cleanup não implementado para tokens em memória' };
}

module.exports = {
  generateSecureToken,
  validateSecureToken,
  generateAdminSessionToken,
  validateAdminSessionToken,
  generateMagicLinkToken,
  validateMagicLinkToken,
  cleanupExpiredTokens,
  TOKEN_CONFIG
};
