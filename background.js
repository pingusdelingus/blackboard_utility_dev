


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "fetchData") {
      const fetchData = async () => {
        try {
          const cookies = await new Promise((resolve, reject) => {
            chrome.cookies.getAll({ url: message.url }, (cookies) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(cookies);
              }
            });
          });
  
          const cookieString = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  
          const headers = {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Cookie": cookieString,
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          };
  
          const response = await fetch(message.url, { headers: headers });
          const data = await response.json();
  
          sendResponse({ success: true, response: data });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      };
  
      fetchData();
      return true;
    }
  });

