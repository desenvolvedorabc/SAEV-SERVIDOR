export const forgetPasswordTemplate = (url: string, forgotLink: string) => {
  return `
  <div style='background: #F1F2F7; border-radius: 5px; padding: 14px; max-width: 720px; margin: 0 auto;'>
    <center>
      <img
          src='${url}/_next/image?url=%2Fassets%2Fimages%2FlogoSaevEmail.png&w=384&q=75' style='width: 70%'><br>
      <p style='color: #3E8277; font-size: 16px; font-family: Arial, Helvetica, sans-serif;'>Sistema de Avaliação <br>Educar pra Valer</p>
    </center>
    <div style='background: #FFFFFF; border-radius: 5px; padding: 14px;'>
      <p style='color: #7C7C7C; font-size: 12px; font-family: Arial, Helvetica, sans-serif; padding:8px; margin:8px;'>Olá,</p>
      <p
          style='font-family: Arial, Helvetica, sans-serif; font-style: normal; font-weight: bold; font-size: 21px; line-height: 26px;letter-spacing: -0.02em; color: #3E8277; padding:8px; margin:8px;'>
          Redefinição de Senha
      </p>
      <p style='color: #7C7C7C; font-size: 12px; font-family: Arial, Helvetica, sans-serif; padding:8px; margin:8px;'>Clique no link abaixo para redefinir sua senha, caso você não tenha solicitado esse link, fique tranquilo sua conta
          está segura, apenas desconsidere esse email.
      </p>
      <p>
      <p>
      <a href="${forgotLink}">${forgotLink}</a>
      </p>
      <center><a href="${forgotLink}"
          style='width:250px; height: 50px; background: #3E8277;border-radius: 6px; color: #FFFFFF; text-decoration: none; font-family: Arial; padding: 10px 20px;'>REDEFINIR SENHA</a></center>
      </p>
    </div>
</div>
  `;
};
