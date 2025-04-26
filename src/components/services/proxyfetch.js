const DEFAULT_PROXY_URL = 'http://127.0.0.1:5436/proxy';
const DEFAULT_PROXY_PASSWORD = "defaultpassword";

async function proxyfetch(url, options = {}) {
    const {
        method = 'GET',
        headers = {},
        body = undefined,
        signal = undefined
    } = options;

    // Retrieve configuration from localStorage
    let aiGalgameConfig;
    try {
        aiGalgameConfig = JSON.parse(localStorage.getItem('aiGalgameConfig')) || {};
    } catch (error) {
        console.error("Error parsing aiGalgameConfig from localStorage:", error);
        aiGalgameConfig = {}; // Reset to an empty object to prevent further errors.
    }

    const advanced = aiGalgameConfig["高级配置"] || {}; // Get the nested config object.  Handle undefined.

    const proxyUrl = advanced.proxyUrl || DEFAULT_PROXY_URL;
    const proxyPassword = advanced.proxyPassword || DEFAULT_PROXY_PASSWORD;

    const shouldIncludeBody = ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase());

    const proxyRequestBody = JSON.stringify({
        method: method.toUpperCase(),
        url,
        headers,
        body: shouldIncludeBody ? body : undefined,
        proxyPassword: proxyPassword// Include proxyPassword in the request body
    });

    const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: proxyRequestBody,
        signal
    });

    return response;
}

export default proxyfetch;