// Cloudflare Pages Function — corre en el servidor, no en el navegador.
// Objetivo: cuando WhatsApp (u otra app) va a mostrar la vista previa de un
// link de invitación (?e=slug-del-evento), este archivo le entrega un
// <title> y una descripción correctos ANTES de que llegue el HTML,
// porque los bots de vista previa no ejecutan JavaScript.

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const slug = url.searchParams.get('e');

  // Si la visita no trae un evento específico, no hacemos nada especial.
  if (!slug) {
    return next();
  }

  const SUPABASE_URL = "https://ujmvlborpsaikzbpyxjw.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_7U9no2mzjwg-1_tDg4JcLg_sqNh_dLy";

  const TIPO_DESCRIPCION = {
    boda: 'una boda',
    xv: 'unos XV años',
    bautizo: 'un bautizo',
    cumpleanos: 'un cumpleaños',
    baby_shower: 'un baby shower',
    viaje: 'un viaje en grupo',
    otro: 'un evento'
  };

  let nombreEvento = null;
  let tipoEvento = 'otro';

  try {
    const apiUrl = SUPABASE_URL + '/rest/v1/eventos?select=nombre_evento,tipo_evento&slug=eq.' + encodeURIComponent(slug) + '&limit=1';
    const res = await fetch(apiUrl, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        nombreEvento = data[0].nombre_evento;
        tipoEvento = data[0].tipo_evento;
      }
    }
  } catch (e) {
    // Si falla la consulta, seguimos sin datos personalizados (fallback abajo).
  }

  const response = await next();

  // Si no encontramos el evento, entregamos la página normal sin tocar nada.
  if (!nombreEvento) {
    return response;
  }

  const titulo = nombreEvento + ' — Invitación Digital';
  const descripcion = 'Toca para ver los detalles de ' + (TIPO_DESCRIPCION[tipoEvento] || TIPO_DESCRIPCION.otro) + ' y confirmar tu asistencia.';

  class ReescribirMeta {
    element(element) {
      if (element.tagName === 'title') {
        element.setInnerContent(titulo);
      } else {
        const prop = element.getAttribute('property');
        if (prop === 'og:title') {
          element.setAttribute('content', titulo);
        } else if (prop === 'og:description') {
          element.setAttribute('content', descripcion);
        }
      }
    }
  }

  return new HTMLRewriter()
    .on('title', new ReescribirMeta())
    .on('meta[property="og:title"]', new ReescribirMeta())
    .on('meta[property="og:description"]', new ReescribirMeta())
    .transform(response);
}

