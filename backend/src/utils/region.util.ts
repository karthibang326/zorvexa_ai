/**
 * Utility to identify user region based on request metadata or IP.
 * Defaults to 'IN' for local development or unidentified global traffic.
 */
export function getUserRegion(req: any): string {
  // Check for common proxy headers provided by platforms like Vercel or Cloudflare
  const country = req.headers["x-vercel-ip-country"] || 
                  req.headers["cf-ipcountry"] || 
                  req.headers["x-country"] || 
                  "IN"; // Default to IN for Zorvexa localized testing
  
  return country.toUpperCase();
}
