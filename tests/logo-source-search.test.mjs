import test from 'node:test';
import assert from 'node:assert/strict';
import { searchLogoSources } from '../server/logo-source-search.mjs';

const origin = 'https://preview.example';
function request(body = Buffer.from('ffd8ff', 'hex'), from = origin) {
  return new Request(origin + '/api/logo-source-search', {
    method: 'POST', headers: { origin: from, 'content-type': 'image/jpeg' }, body
  });
}

test('missing configuration, cross-origin and oversized uploads do not reach the provider', async () => {
  const fetcher = () => assert.fail('unexpected provider call');
  assert.equal((await searchLogoSources(request(), undefined, fetcher)).status, 503);
  assert.equal((await searchLogoSources(request(undefined, 'https://other.example'), 'key', fetcher)).status, 403);
  assert.equal((await searchLogoSources(request(Buffer.alloc(1024 * 1024 + 1)), 'key', fetcher)).status, 400);
  assert.equal((await searchLogoSources(request(Buffer.from('not an image')), 'key', fetcher)).status, 400);
});

test('returns candidate source pairs without approving an image or forwarding credentials to a source', async () => {
  const fetcher = async (url, options) => {
    assert.equal(url, 'https://vision.googleapis.com/v1/images:annotate');
    assert.equal(options.headers['x-goog-api-key'], 'key');
    assert.equal(JSON.parse(options.body).requests[0].features[0].type, 'WEB_DETECTION');
    return Response.json({ responses: [{ webDetection: { pagesWithMatchingImages: [{
      url: 'https://brand.example/menu', fullMatchingImages: [{ url: 'https://brand.example/logo.png' }, { url: 'http://bad.example/logo.png' }],
      partialMatchingImages: [{ url: 'https://brand.example/logo.png' }]
    }] } }] });
  };
  const response = await searchLogoSources(request(), 'key', fetcher);
  assert.deepEqual(await response.json(), {
    status: 'candidates', verified: false,
    matches: [{ source: 'https://brand.example/menu', image: 'https://brand.example/logo.png' }]
  });
});
