function parseConnectionString(rawStr) {
  if (!rawStr) return null;
  let cleanStr = rawStr.trim().replace(/^["'`]+|["'`]+$/g, '').trim();
  if (!cleanStr) return null;

  // Remove scheme prefix
  const schemeEnd = cleanStr.indexOf('://');
  let body = schemeEnd !== -1 ? cleanStr.substring(schemeEnd + 3) : cleanStr;

  // Find the slash that starts database / query params
  const slashIndex = body.indexOf('/');
  let authAndHost = slashIndex !== -1 ? body.substring(0, slashIndex) : body;
  let database = slashIndex !== -1 ? body.substring(slashIndex + 1).split('?')[0] : undefined;

  // In authAndHost (e.g. "postgres:P@ss#123@db.izpkxmuinfxetfsmstit.supabase.co:5432"),
  // host is the last part after the LAST @.
  const lastAtIndex = authAndHost.lastIndexOf('@');
  let user, password, hostAndPort;

  if (lastAtIndex !== -1) {
    const authPart = authAndHost.substring(0, lastAtIndex);
    hostAndPort = authAndHost.substring(lastAtIndex + 1);

    const firstColonInAuth = authPart.indexOf(':');
    if (firstColonInAuth !== -1) {
      user = decodeURIComponent(authPart.substring(0, firstColonInAuth));
      password = decodeURIComponent(authPart.substring(firstColonInAuth + 1));
    } else {
      user = decodeURIComponent(authPart);
    }
  } else {
    hostAndPort = authAndHost;
  }

  const colonIndexInHost = hostAndPort.lastIndexOf(':');
  let host = colonIndexInHost !== -1 ? hostAndPort.substring(0, colonIndexInHost) : hostAndPort;
  let port = colonIndexInHost !== -1 ? parseInt(hostAndPort.substring(colonIndexInHost + 1), 10) : 5432;

  if (isNaN(port)) port = 5432;

  return { user, password, host, port, database };
}

console.log('Test 1:', parseConnectionString('postgresql://postgres:pass@db.izpkxmuinfxetfsmstit.supabase.co:5432/postgres'));
console.log('Test 2 with quotes:', parseConnectionString('"postgresql://postgres:pass@db.izpkxmuinfxetfsmstit.supabase.co:5432/postgres"'));
console.log('Test 3 with special password:', parseConnectionString('postgresql://postgres:P@ss#123@db.izpkxmuinfxetfsmstit.supabase.co:5432/postgres'));
console.log('Test 4 without auth:', parseConnectionString('postgresql://db.izpkxmuinfxetfsmstit.supabase.co:5432/postgres'));
