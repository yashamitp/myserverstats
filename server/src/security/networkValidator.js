const dns = require('dns').promises;
const net = require('net');
const env = require('../config/env');

// Cloud metadata IP addresses to strictly block
const CLOUD_METADATA_IPS = ['169.254.169.254', 'fd00:ec2::254'];

function isIPv4(ip) {
  return net.isIPv4(ip);
}

function isIPv6(ip) {
  return net.isIPv6(ip);
}

function parseIPv4(ip) {
  return ip.split('.').map(octet => parseInt(octet, 10));
}

/**
 * Checks if an IPv4 address is in a reserved/prohibited range
 */
function isRestrictedIPv4(ip, allowPrivate = false) {
  const [b0, b1, b2, b3] = parseIPv4(ip);

  // Cloud metadata endpoint (AWS, GCP, Azure, OpenStack)
  if (ip === '169.254.169.254') return { restricted: true, reason: 'Cloud metadata IP is strictly blocked' };

  // Loopback (127.0.0.0/8)
  if (b0 === 127) return { restricted: true, reason: 'Loopback addresses (127.0.0.0/8) are prohibited' };

  // Current network (0.0.0.0/8)
  if (b0 === 0) return { restricted: true, reason: 'Network 0.0.0.0/8 is prohibited' };

  // Link-local (169.254.0.0/16)
  if (b0 === 169 && b1 === 254) return { restricted: true, reason: 'Link-local addresses (169.254.0.0/16) are prohibited' };

  // Multicast (224.0.0.0/4)
  if (b0 >= 224 && b0 <= 239) return { restricted: true, reason: 'Multicast addresses (224.0.0.0/4) are prohibited' };

  // Reserved (240.0.0.0/4)
  if (b0 >= 240) return { restricted: true, reason: 'Reserved addresses (240.0.0.0/4) are prohibited' };

  // Broadcast
  if (b0 === 255 && b1 === 255 && b2 === 255 && b3 === 255) return { restricted: true, reason: 'Broadcast address is prohibited' };

  // Private RFC1918 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
  const isPrivate = (
    b0 === 10 ||
    (b0 === 172 && b1 >= 16 && b1 <= 31) ||
    (b0 === 192 && b1 === 168)
  );

  if (isPrivate && !allowPrivate) {
    return { restricted: true, reason: 'Private network addresses (RFC1918) are prohibited unless explicitly enabled in configuration' };
  }

  return { restricted: false };
}

/**
 * Checks if an IPv6 address is in a reserved/prohibited range
 */
function isRestrictedIPv6(ip, allowPrivate = false) {
  const normalized = ip.toLowerCase();

  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') {
    return { restricted: true, reason: 'IPv6 loopback address is prohibited' };
  }

  if (normalized.startsWith('fe80:') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return { restricted: true, reason: 'IPv6 link-local addresses are prohibited' };
  }

  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    if (!allowPrivate) {
      return { restricted: true, reason: 'IPv6 unique local addresses are prohibited' };
    }
  }

  if (normalized.startsWith('ff')) {
    return { restricted: true, reason: 'IPv6 multicast addresses are prohibited' };
  }

  return { restricted: false };
}

/**
 * Validates target host and port to protect against SSRF and port attacks
 * @param {string} host Hostname or IP
 * @param {number} port Destination port
 * @param {object} [options]
 * @returns {Promise<{ valid: boolean, resolvedIp?: string, error?: string }>}
 */
async function validateDestination(host, port, options = {}) {
  const allowPrivate = options.allowPrivate !== undefined ? options.allowPrivate : env.ALLOW_PRIVATE_NETWORKS;

  if (!host || typeof host !== 'string') {
    return { valid: false, error: 'Target host is required' };
  }

  const cleanHost = host.trim();
  const parsedPort = parseInt(port, 10);

  if (isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    return { valid: false, error: 'Port must be an integer between 1 and 65535' };
  }

  // Reject local hostnames
  if (['localhost', 'localhost.localdomain', 'ip6-localhost', 'ip6-loopback'].includes(cleanHost.toLowerCase())) {
    return { valid: false, error: 'Loopback target is prohibited' };
  }

  let resolvedIp = cleanHost;

  if (isIPv4(cleanHost)) {
    const check = isRestrictedIPv4(cleanHost, allowPrivate);
    if (check.restricted) {
      return { valid: false, error: `Invalid destination: ${check.reason}` };
    }
  } else if (isIPv6(cleanHost)) {
    const check = isRestrictedIPv6(cleanHost, allowPrivate);
    if (check.restricted) {
      return { valid: false, error: `Invalid destination: ${check.reason}` };
    }
  } else {
    // Resolve hostname via DNS
    try {
      const records = await dns.lookup(cleanHost, { all: true });
      if (!records || records.length === 0) {
        return { valid: false, error: `Failed to resolve hostname: ${cleanHost}` };
      }

      // Check all resolved records to prevent DNS rebinding or dual-homed SSRF
      for (const record of records) {
        if (record.family === 4) {
          const check = isRestrictedIPv4(record.address, allowPrivate);
          if (check.restricted) {
            return { valid: false, error: `Hostname resolves to restricted address (${record.address}): ${check.reason}` };
          }
        } else if (record.family === 6) {
          const check = isRestrictedIPv6(record.address, allowPrivate);
          if (check.restricted) {
            return { valid: false, error: `Hostname resolves to restricted IPv6 address (${record.address}): ${check.reason}` };
          }
        }
      }

      resolvedIp = records[0].address;
    } catch (err) {
      return { valid: false, error: `DNS resolution failed for "${cleanHost}": ${err.message}` };
    }
  }

  return { valid: true, resolvedIp };
}

module.exports = {
  validateDestination,
  isRestrictedIPv4,
  isRestrictedIPv6,
  CLOUD_METADATA_IPS
};
