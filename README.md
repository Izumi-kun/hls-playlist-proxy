HLS playlist proxy
==================

Main goal is realtime counting viewers of HLS (HTTP Live Streaming).

How it works
------------

1. The script download original playlist (`.m3u8` file).
2. All relative links in playlist converts in absolute.
3. Client download modified playlist.
4. The script collect info about all clients and calculate viewers count.

Usage
-----

- `npm i`.
- Copy `config-example.json` to `config.json` and edit.
- `npm start`.

Viewers count getting by client via WebSocket. See `example/index.html` for more info.
