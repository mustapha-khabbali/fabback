// Presence enforcement for gate actions.
//
// All API traffic reaches us through Cloudflare, so the TCP peer is always the
// tunnel — useless for telling "at school" from "at home". Cloudflare forwards
// the visitor's real IP in `CF-Connecting-IP`; every device on the school
// Wi-Fi shares the school's public egress IP, home devices do not. So the gate
// is an allowlist match on that header.
import { config } from '../config.js';

// Real client IP as seen by Cloudflare, normalizing IPv4-mapped IPv6 and any
// accidental ::ffff: / port suffixes. Falls back to X-Forwarded-For then req.ip.
export function getClientIp(req) {
  const raw = req.get('cf-connecting-ip')
    || (req.get('x-forwarded-for') || '').split(',')[0].trim()
    || req.ip
    || '';
  return raw.replace(/^::ffff:/, '').replace(/^\[|\]$/g, '').split('%')[0].trim();
}

function ipToInt(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    n = (n << 8) + octet;
  }
  return n >>> 0;
}

// Matches a plain IPv4 or a CIDR like 105.158.0.0/16.
function ipMatches(ip, rule) {
  if (ip === rule) return true;
  if (!rule.includes('/')) return false;
  const [range, bitsStr] = rule.split('/');
  const bits = Number(bitsStr);
  const ipInt = ipToInt(ip);
  const rangeInt = ipToInt(range);
  if (ipInt === null || rangeInt === null || !Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

// True when the gate should accept this request. Empty allowlist = OFF (allow),
// so dev and tests are unaffected until GATE_ALLOWED_IPS is set in production.
export function isOnLabNetwork(req) {
  const allow = config.gateAllowedIps;
  if (allow.length === 0) return true;
  const ip = getClientIp(req);
  return allow.some((rule) => ipMatches(ip, rule));
}
