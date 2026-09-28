Local assets bundled into the Android/iOS apps (Capacitor `webDir`).

`index.html` is a tiny offline-capable shell that immediately loads https://awehchat.co.za.
It lives here, not in `public/`, because anything in `public/` is also served by the
website — an `index.html` there replaced the real home page with a redirect to itself.
