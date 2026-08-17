# Local-only WatchMatch videos

Generated MP4 files in this directory are intentionally ignored by Git.
The application checks that a mapped file exists with a same-origin `HEAD`
request before showing the video as available.

Local mapping currently expected:

- Watchmode work ID `1901214`
- Sites playback copy: `swapped_watchmatch_30s_sites.mp4`
- Sites playback SHA-256 `4018f9d40b1a2479db148ddbdbaecfde9b990ed038b4a399fb7b171d331fa31d`
- Canonical local source: `swapped_watchmatch_30s.mp4`
- Canonical source SHA-256 `5b2a18d147ac91be3a0f394ea45c93fa59dae69023a7d8e3a322f77bb23e6d17`

The canonical generated artifact remains under the local `2_작품\output`
tree. The smaller Sites playback copy is a deployment artifact and is also
excluded from Git.
