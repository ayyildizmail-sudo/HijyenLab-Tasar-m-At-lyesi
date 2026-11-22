const MAX_IMAGE_BYTES = 1024 * 1024;
const endpoint = 'https://vision.googleapis.com/v1/images:annotate';

function result(payload, status = 200) {
  return Response.json(payload, { status, headers: { 'cache-control': 'private, no-store' } });
}

function publicHttps(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

async function readImage(request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > MAX_IMAGE_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks, length);
}

export async function searchLogoSources(request, apiKey, fetcher = fetch) {
  if (request.headers.get('origin') !== new URL(request.url).origin ||
      ![null, 'same-origin'].includes(request.headers.get('sec-fetch-site'))) {
    return result({ status: 'origin_not_allowed' }, 403);
  }
  if (!apiKey) return result({ status: 'search_unconfigured' }, 503);
  if (!['image/jpeg', 'image/png'].includes(request.headers.get('content-type'))) {
    return result({ status: 'unsupported_image' }, 415);
  }
  try {
    const image = await readImage(request);
    if (!image?.length) return result({ status: 'invalid_image_size' }, 400);
    const png = image.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
    const jpeg = image.subarray(0, 3).toString('hex') === 'ffd8ff';
    if (request.headers.get('content-type') === 'image/png' ? !png : !jpeg) {
      return result({ status: 'invalid_image' }, 400);
    }
    const response = await fetcher(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ requests: [{
        image: { content: image.toString('base64') },
        features: [{ type: 'WEB_DETECTION', maxResults: 10 }]
      }] })
    });
    if (!response.ok) return result({ status: 'search_unavailable' }, 502);
    const { responses } = await response.json();
    if (!responses?.[0] || responses[0].error) return result({ status: 'search_unavailable' }, 502);
    const detection = responses[0].webDetection;
    const matches = new Map();
    for (const page of detection?.pagesWithMatchingImages ?? []) {
      const source = publicHttps(page.url);
      if (!source) continue;
      for (const imageMatch of [...(page.fullMatchingImages ?? []), ...(page.partialMatchingImages ?? [])]) {
        const image = publicHttps(imageMatch.url);
        if (image && !matches.has(image)) matches.set(image, { image, source });
      }
    }
    return result({ status: 'candidates', verified: false, matches: [...matches.values()].slice(0, 10) });
  } catch {
    return result({ status: 'search_unavailable' }, 502);
  }
}
