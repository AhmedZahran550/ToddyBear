export function redactSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(redactSensitiveData);
  }

  const redacted = { ...data };
  const sensitiveKeys = [
    'password',
    'token',
    'refreshtoken',
    'accesstoken',
    'client_secret',
    'confirmpassword',
  ];

  for (const key of Object.keys(redacted)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactSensitiveData(redacted[key]);
    }
  }

  return redacted;
}

export function serializeBodyForLog(body: any): string {
  if (!body) return '';
  try {
    const redacted = redactSensitiveData(body);
    return JSON.stringify(redacted);
  } catch (e) {
    return '[Serialization Failed]';
  }
}
