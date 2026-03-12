export function formatMarkdownToHtml(markdown: string): string {
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')

    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')

    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')

    // Code
    .replace(/`(.*?)`/g, '<code>$1</code>')

    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')

  // Wrap in paragraphs
  if (
    !html.includes('<p>') &&
    !html.includes('<h1>') &&
    !html.includes('<h2>') &&
    !html.includes('<h3>')
  ) {
    html = `<p>${html}</p>`
  }

  return html
}

export function createEmailTemplate(
  title: string,
  content: string,
  studentName?: string,
): string {
  const htmlContent = formatMarkdownToHtml(content)

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        h1, h2, h3 {
            color: #2c5aa0;
        }
        .header {
            background-color: #f4f4f4;
            padding: 20px;
            text-align: center;
            border-radius: 5px;
        }
        .content {
            padding: 20px 0;
        }
        .footer {
            background-color: #f4f4f4;
            padding: 10px;
            text-align: center;
            border-radius: 5px;
            font-size: 12px;
            color: #666;
        }
        a {
            color: #2c5aa0;
        }
        code {
            background-color: #f4f4f4;
            padding: 2px 4px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        ${studentName ? `<p>Prezado(a) responsável pelo(a) aluno(a) <strong>${studentName}</strong>,</p>` : '<p>Prezado(a) responsável,</p>'}
    </div>
    
    <div class="content">
        ${htmlContent}
    </div>
    
    <div class="footer">
        <p>Esta é uma mensagem automática do Sistema SAEV.</p>
        <p>Não responda a este e-mail.</p>
    </div>
</body>
</html>
`
}
