export const exportDataTemplate = (url: string, link_download: string) => {
  return `
  <div style='background: #F1F2F7; border-radius: 5px; padding: 14px; max-width: 720px; margin: 0 auto;'>
    <center>
      <img
          src='${url}/_next/image?url=%2Fassets%2Fimages%2FlogoSaevEmail.png&w=384&q=75' style='width: 70%'><br>
      <p style='color: #3E8277; font-size: 16px; font-family: Arial, Helvetica, sans-serif;'>Sistema de Avaliação <br>Educar pra Valer</p>
    </center>
    <div style='background: #FFFFFF; border-radius: 5px; padding: 14px;'>
      <p
          style='font-family: Arial, Helvetica, sans-serif; font-style: normal; font-weight: bold; font-size: 21px; line-height: 26px;letter-spacing: -0.02em; color: #3E8277; padding:8px; margin:8px;'>
          Download Disponível
      </p>
      <p style='color: #7C7C7C; font-size: 12px; font-family: Arial, Helvetica, sans-serif; padding:8px; margin:8px;'>Olá, o download do microdado já está disponível, clique no botão abaixo.
      </p>
      <p>
      </p>
      <p>
      <p>
      <center><a href="${link_download}" target="_blank"
          style='width:250px; height: 50px; background: #3E8277;border-radius: 6px; color: #FFFFFF; text-decoration: none; font-family: Arial; padding: 10px 20px;'>DOWNLOAD</a></center>
      </p>
    </div>
</div>
  `;
};
