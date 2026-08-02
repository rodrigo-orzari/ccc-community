// Alibaba Cloud RPC-style API request signing (HMAC-SHA1), per Alibaba's
// documented algorithm for "RPC" APIs (used by BSS OpenAPI, ECS, and most
// non-Object-Storage services):
// https://www.alibabacloud.com/help/en/sdk/product-overview/rpc-mechanism
//
// 1. Collect all request params + common params (Format, Version,
//    AccessKeyId, SignatureMethod, Timestamp, SignatureVersion,
//    SignatureNonce), sort by key (ASCII order).
// 2. Percent-encode each key/value per RFC 3986 and join as a canonicalized
//    query string.
// 3. StringToSign = "GET" + "&" + percentEncode("/") + "&" + percentEncode(canonicalizedQueryString)
// 4. Signature = base64(HMAC-SHA1(StringToSign, AccessKeySecret + "&"))
//
// Verified against a real Alibaba account 2026-07-28: ingest run reported
// "12/12 from live BSS OpenAPI" for Alibaba ECS compute pricing, source:
// live_api — the signature is accepted by BSS OpenAPI, not just spec-correct.

import crypto from 'crypto';

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/\+/g, '%20')
    .replace(/\*/g, '%2A')
    .replace(/%7E/g, '~');
}

function randomNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

export interface AlibabaCredentials {
  accessKeyId: string;
  accessKeySecret: string;
}

// Builds a fully signed GET URL for the given RPC-style endpoint/action/params.
export function buildSignedUrl(
  endpoint: string,
  action: string,
  version: string,
  params: Record<string, string>,
  creds: AlibabaCredentials
): string {
  const allParams: Record<string, string> = {
    Format: 'JSON',
    Version: version,
    AccessKeyId: creds.accessKeyId,
    SignatureMethod: 'HMAC-SHA1',
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    SignatureVersion: '1.0',
    SignatureNonce: randomNonce(),
    Action: action,
    ...params,
  };

  const sortedKeys = Object.keys(allParams).sort();
  const canonicalizedQuery = sortedKeys
    .map(k => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join('&');

  const stringToSign = `GET&${percentEncode('/')}&${percentEncode(canonicalizedQuery)}`;
  const signature = crypto
    .createHmac('sha1', `${creds.accessKeySecret}&`)
    .update(stringToSign)
    .digest('base64');

  return `https://${endpoint}/?${canonicalizedQuery}&Signature=${percentEncode(signature)}`;
}
