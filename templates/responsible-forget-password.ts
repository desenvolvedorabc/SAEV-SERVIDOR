export const responsibleForgetPasswordTemplate = (code: string) => {
  return `
  <div style='background: #F1F2F7; border-radius: 5px; padding: 14px; max-width: 720px; margin: 0 auto;'>
    <center>
      <p style='color: #3E8277; font-size: 16px; font-family: Arial, Helvetica, sans-serif;'>Sistema de Avaliação <br>Educar pra Valer</p>
    </center>
    <div style='background: #FFFFFF; border-radius: 5px; padding: 14px;'>
      <p style='color: #7C7C7C; font-size: 12px; font-family: Arial, Helvetica, sans-serif; padding:8px; margin:8px;'>Olá,</p>
      <p
          style='font-family: Arial, Helvetica, sans-serif; font-style: normal; font-weight: bold; font-size: 21px; line-height: 26px;letter-spacing: -0.02em; color: #3E8277; padding:8px; margin:8px;'>
          Código de Recuperação de Senha
      </p>
      <p style='color: #7C7C7C; font-size: 12px; font-family: Arial, Helvetica, sans-serif; padding:8px; margin:8px;'>Use o código abaixo no aplicativo SAEV para redefinir sua senha. Caso você não tenha solicitado, fique tranquilo, sua conta está segura, apenas desconsidere este email.
      </p>
      <center>
        <p style='font-family: monospace; font-size: 32px; font-weight: bold; color: #3E8277; background: #F1F2F7; padding: 16px 32px; border-radius: 8px; letter-spacing: 8px;'>${code}</p>
      </center>
      <p style='color: #7C7C7C; font-size: 11px; font-family: Arial, Helvetica, sans-serif; padding:8px; margin:8px;'>Este código expira em 8 horas.
      </p>
    </div>
  </div>
  `
}
