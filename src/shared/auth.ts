export interface AuthContext {
  userId: string;
  scopes: string[];
  roles: string[];
}

type AuthClaims = Record<string, any>;

// Helper to decode a JWT without verifying (useful for local development/testing)
function decodeJwt(token: string): any {
  try {
    const parts = token.replace(/^Bearer\s+/i, "").trim().split(".");
    if (parts.length !== 3) return null;
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = Buffer.from(normalized, "base64").toString("utf-8");
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function getClaimsFromEvent(event: any): AuthClaims | null {
  const authorizer = event.requestContext?.authorizer;
  if (!authorizer) {
    return null;
  }

  if (authorizer.jwt?.claims) {
    return authorizer.jwt.claims;
  }

  if (authorizer.claims) {
    return authorizer.claims;
  }

  return authorizer;
}

function normalizeScopes(claims: AuthClaims): string[] {
  const scopeString = claims.scope || "";
  if (typeof scopeString !== "string") {
    return ["catalog:read", "mylist:read", "mylist:write", "history:read", "history:write"];
  }
  let scopes = scopeString.split(" ").filter((s: string) => s.length > 0);
  if (scopes.length === 0) {
    scopes = ["catalog:read", "mylist:read", "mylist:write", "history:read", "history:write"];
  }
  return scopes;
}

function normalizeRoles(claims: AuthClaims): string[] {
  const roles = claims["https://netflix-clone.com/roles"] || claims.roles || claims["cognito:groups"] || [];
  return Array.isArray(roles) ? roles : [roles];
}

export function getAuthContext(event: any): AuthContext {
  const claims = getClaimsFromEvent(event);

  if (claims && (claims.sub || claims.principalId)) {
    return {
      userId: claims.sub || claims.principalId,
      scopes: normalizeScopes(claims),
      roles: normalizeRoles(claims),
    };
  }

  // Fallback for local testing using Authorization header
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  if (authHeader) {
    const decoded = decodeJwt(authHeader);
    if (decoded) {
      return {
        userId: decoded.sub || "mock-user",
        scopes: normalizeScopes(decoded),
        roles: normalizeRoles(decoded),
      };
    }
  }

  throw new Error("Unauthorized: Authentication token is missing or invalid");
}

export function validateUserOrAdmin(event: any, targetUserId: string): void {
  const auth = getAuthContext(event);
  const isOwner = auth.userId === targetUserId;
  const isAdmin = auth.roles.includes("super_admin");

  if (!isOwner && !isAdmin) {
    throw new Error("Forbidden: You are not authorized to access this resource");
  }
}

export function requireScope(event: any, requiredScope: string): void {
  const auth = getAuthContext(event);
  if (!auth.scopes.includes(requiredScope) && !auth.roles.includes("super_admin")) {
    throw new Error(`Forbidden: Missing required scope: ${requiredScope}`);
  }
}

export function requireRole(event: any, allowedRoles: string[]): void {
  const auth = getAuthContext(event);
  const hasRole = auth.roles.some((role: string) => allowedRoles.includes(role));
  if (!hasRole && !auth.roles.includes("super_admin")) {
    throw new Error(`Forbidden: Access denied. Allowed roles: ${allowedRoles.join(", ")}`);
  }
}
