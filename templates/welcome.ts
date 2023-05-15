export const welcomeTemplate = (url: string, forgotLink: string) => {
  return `
  <div style='background: #F1F2F7; border-radius: 5px; padding: 14px; max-width: 720px; margin: 0 auto;'>
    <center>
      <img
          src='${url}/_next/image?url=%2Fassets%2Fimages%2FlogoSaevEmail.png&w=384&q=75' style='width: 70%'><br>
      <p style='color: #3E8277; font-size: 16px; font-family: Arial, Helvetica, sans-serif;'><b>Sistema de Avaliação <br>Educar pra Valer</p></b>
    </center>
    <div style='background: #FFFFFF; border-radius: 5px; padding: 14px;'>
      <p style='color: #7C7C7C; font-size: 12px; font-family: Arial, Helvetica, sans-serif; padding:8px; margin:8px;'>Olá,</p>
      <p
          style='font-family: Arial, Helvetica, sans-serif; font-style: normal; font-weight: bold; font-size: 21px; line-height: 26px;letter-spacing: -0.02em; color: #3E8277; padding:0 8px; margin:8px;'>
          Bem-vindo ao SAEV!
      </p>
      <p style='color: #7C7C7C; font-size: 12px; font-family: Arial, Helvetica, sans-serif; padding:8px; margin:8px;'>Agora falta pouco para você ter acesso a plataforma. Basta clicar no link abaixo e criar uma senha para o primeiro acesso.
      </p>
      <p>
      <p>
      <a style='padding:8px; margin:8px;' href="${forgotLink}">${forgotLink}</a>
      </p>
      <center><a href="${forgotLink}"
          style='width:250px; height: 70px; background: #3E8277;border-radius: 6px; color: #FFFFFF; text-decoration: none; font-family: Arial; padding: 15px 30px;'>CRIAR SENHA</a></center>
      </p>
    </div>
</div>
  `;
};
