import urllib.request
import re

urls = [
    "https://maps.app.goo.gl/7Z7jXpGD2tTyJsVR9?g_st=ac",
    "https://maps.app.goo.gl/G1UdFSzVHsvvzg7t9",
    "https://maps.app.goo.gl/cx8LajNQ5Hbr9jeo8",
    "https://maps.app.goo.gl/CdwEzuaZTkPwzkzz5",
    "https://maps.app.goo.gl/P9vTyjjS3BTzXhYj6",
    "https://maps.app.goo.gl/zaKK9KXSmhqnPdNs5"
]

for url in urls:
    try:
        req = urllib.request.Request(url, method='HEAD')
        response = urllib.request.urlopen(req)
        final_url = response.geturl()
        print(f"URL: {url} -> {final_url}")
    except Exception as e:
        print(f"Error for {url}: {e}")
