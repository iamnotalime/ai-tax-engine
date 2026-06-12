import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NextRequest } from 'next/server';
import { assertSameOrigin } from './security';

function request(headers: Record<string, string>, url = 'http://localhost:3000/api/cases') {
  return new NextRequest(url, {
    method: 'POST',
    headers
  });
}

describe('assertSameOrigin', () => {
  it('allows same-origin mutation requests', () => {
    assert.doesNotThrow(() =>
      assertSameOrigin(
        request({
          origin: 'http://localhost:3000',
          'sec-fetch-site': 'same-origin'
        })
      )
    );
  });

  it('allows loopback aliases in local development', () => {
    assert.doesNotThrow(() =>
      assertSameOrigin(
        request({
          origin: 'http://127.0.0.1:3000',
          'sec-fetch-site': 'same-origin'
        })
      )
    );
  });

  it('allows the actual request origin in local development', () => {
    assert.doesNotThrow(() =>
      assertSameOrigin(
        request(
          {
            origin: 'http://10.2.0.2:3000',
            'sec-fetch-site': 'same-origin'
          },
          'http://10.2.0.2:3000/api/cases'
        )
      )
    );
  });

  it('allows local development network host aliases on the configured port', () => {
    assert.doesNotThrow(() =>
      assertSameOrigin(
        request({
          origin: 'http://10.2.0.2:3000',
          'sec-fetch-site': 'same-origin'
        })
      )
    );
  });

  it('rejects mutation requests without an origin', () => {
    assert.throws(() => assertSameOrigin(request({})), /Origin request tidak dipercaya/);
  });

  it('rejects cross-site fetch metadata', () => {
    assert.throws(
      () =>
        assertSameOrigin(
          request({
            origin: 'http://localhost:3000',
            'sec-fetch-site': 'cross-site'
          })
        ),
      /Konteks request tidak dipercaya/
    );
  });
});
