// Genera las plantillas de email de Supabase Auth con el diseño de Workstation: node supabase/templates/build.mjs
// Supabase sustituye {{ .ConfirmationURL }}, {{ .Email }}… al enviar. Logo: PNG publicado en GitHub Pages (Gmail no muestra SVG).
import { writeFileSync } from 'node:fs';

const LOGO = 'https://adriarroyo08.github.io/WorkStation/email-logo.png';
const layout = ({ preheader, title, body, cta, url, foot }) => `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f2f2f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#141414">
<div style="display:none;max-height:0;overflow:hidden">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f2;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#141414;padding:24px 32px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td><img src="${LOGO}" width="40" height="40" alt="" style="display:block;border:0;border-radius:10px"></td>
<td style="padding-left:12px;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.2px">Workstation</td>
</tr></table>
</td></tr>
<tr><td style="height:4px;background:#f2600c;line-height:4px;font-size:0">&nbsp;</td></tr>
<tr><td style="padding:32px">
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#141414">${title}</h1>
${body}
${
  cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0"><tr><td style="background:#c2410c;border-radius:10px">
<a href="${url}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none">${cta}</a>
</td></tr></table>`
    : ''
}
${foot ?? ''}
</td></tr>
<tr><td style="padding:20px 32px;background:#fafafa;border-top:1px solid #ececec;font-size:12px;line-height:1.5;color:#8e8e93">
Workstation · tu diario de entrenamiento en el móvil, la web y el reloj.<br>
Si no has sido tú, ignora este correo: tu cuenta sigue igual.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
`;

const p = (t) => `<p style="margin:0 0 12px;font-size:16px;line-height:1.55;color:#3a3a3a">${t}</p>`;
const fallback = (url) =>
  p(`<span style="font-size:13px;color:#8e8e93">¿El botón no funciona? Copia este enlace en el navegador:<br><a href="${url}" style="color:#c2410c;word-break:break-all">${url}</a></span>`);

const T = {
  confirmation: {
    preheader: 'Confirma tu email para activar tu cuenta de Workstation.',
    title: 'Confirma tu email',
    body: p('¡Hola! Gracias por crear tu cuenta en Workstation.') + p('Confirma que <b>{{ .Email }}</b> es tu dirección y empieza a sincronizar tus entrenos entre el móvil, la web y el reloj.'),
    cta: 'Confirmar mi email',
    url: '{{ .ConfirmationURL }}',
    foot: fallback('{{ .ConfirmationURL }}'),
  },
  recovery: {
    preheader: 'Elige una contraseña nueva para tu cuenta de Workstation.',
    title: 'Restablece tu contraseña',
    body: p('Hemos recibido una petición para cambiar la contraseña de <b>{{ .Email }}</b>.') + p('Pulsa el botón para elegir una nueva. El enlace caduca en una hora.'),
    cta: 'Elegir contraseña nueva',
    url: '{{ .ConfirmationURL }}',
    foot: fallback('{{ .ConfirmationURL }}'),
  },
  email_change: {
    preheader: 'Confirma tu nuevo email en Workstation.',
    title: 'Confirma tu nuevo email',
    body: p('Has pedido cambiar el email de tu cuenta de <b>{{ .Email }}</b> a <b>{{ .NewEmail }}</b>.') + p('Confírmalo para empezar a usar la nueva dirección.'),
    cta: 'Confirmar el cambio',
    url: '{{ .ConfirmationURL }}',
    foot: fallback('{{ .ConfirmationURL }}'),
  },
  magic_link: {
    preheader: 'Tu enlace para entrar en Workstation.',
    title: 'Entra en Workstation',
    body: p('Pulsa el botón para iniciar sesión con <b>{{ .Email }}</b>. El enlace solo sirve una vez.'),
    cta: 'Iniciar sesión',
    url: '{{ .ConfirmationURL }}',
    foot: fallback('{{ .ConfirmationURL }}'),
  },
};

for (const [name, t] of Object.entries(T)) writeFileSync(new URL(`./${name}.html`, import.meta.url), layout(t));

// Bienvenida: la envía la función `welcome` (no es de Supabase Auth); {{name}} lo sustituye la función.
const welcome = layout({
  preheader: 'Tu cuenta está lista. Así le sacas partido a Workstation.',
  title: '¡Bienvenido a Workstation, {{name}}!',
  body:
    p('Tu cuenta ya está activa. A partir de ahora tus entrenos se guardan en la nube y te siguen al móvil, la web y el reloj.') +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0">
${[
  ['🏋️', 'Crea tu primera rutina', 'O elige un programa hecho en Explorar.'],
  ['⏱️', 'Registra cada serie', 'El descanso arranca solo al marcarla.'],
  ['⌚', 'Llévalo en la muñeca', 'Sigue el entreno desde tu reloj Wear OS.'],
  ['📈', 'Mira tu progreso', 'Récords, informes y el Coach IA en Perfil.'],
]
  .map(
    ([i, h, d]) =>
      `<tr><td width="44" valign="top" style="padding:8px 0;font-size:24px">${i}</td><td style="padding:8px 0"><b style="font-size:15px;color:#141414">${h}</b><br><span style="font-size:14px;color:#6b6b70">${d}</span></td></tr>`,
  )
  .join('\n')}
</table>`,
  cta: 'Abrir Workstation',
  url: 'https://adriarroyo08.github.io/WorkStation/',
});
writeFileSync(new URL('./welcome.html', import.meta.url), welcome);
writeFileSync(
  new URL('../functions/welcome/template.ts', import.meta.url),
  `// Generado por supabase/templates/build.mjs. No editar a mano.
export const WELCOME_HTML = ${JSON.stringify(welcome)};
`,
);
console.log('plantillas generadas');
