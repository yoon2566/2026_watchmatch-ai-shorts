# Local-only WatchMatch videos

Generated MP4 files in this directory are intentionally ignored by Git.
The application checks that a mapped file exists with a same-origin `HEAD`
request before showing the video as available.

Local mappings currently expected:

- Watchmode work ID `1901214`
- Sites playback copy: `swapped_watchmatch_30s_sites.mp4`
- Sites playback SHA-256 `4018f9d40b1a2479db148ddbdbaecfde9b990ed038b4a399fb7b171d331fa31d`
- Canonical local source: `2_작품\output\swapped_grok_pilot\run-20260817-125521\final\swapped_watchmatch_30s.mp4`
- Canonical source SHA-256 `5b2a18d147ac91be3a0f394ea45c93fa59dae69023a7d8e3a322f77bb23e6d17`

The 2026-08-17 batch adds six Sites playback copies. Their canonical sources
remain under `2_작품\output\movie_grok_batch\run-20260817-144300`.

| Watchmode ID | Work | Sites playback file | SHA-256 |
|---:|---|---|---|
| 1357316 | 스파이더맨: 홈커밍 | `spider-man-homecoming_watchmatch_30s_sites.mp4` | `8096ced1d5f9116037e8f54e18d7d9e2218b56f043d887d33a02f3d766bb9df2` |
| 1357314 | 스파이더맨: 파 프롬 홈 | `spider-man-far-from-home_watchmatch_30s_sites.mp4` | `33733f02c67a83da728d66f83306280eb5d3e32c40ccc7a905dab95fb104358c` |
| 1357317 | 스파이더맨: 뉴 유니버스 | `spider-man-into-the-spider-verse_watchmatch_30s_sites.mp4` | `147c573ab571655429f6fe9a57dfeb19367b4c4038930e43101314af221ccfff` |
| 11014446 | 돈 세이 굿 럭 | `dont-say-good-luck_watchmatch_30s_sites.mp4` | `cb8062fb08d9f0a2ed91caab1a649af40468b167b20ef21c915c88d7b90a0b80` |
| 1972561 | 라카사 | `la-casa_watchmatch_30s_sites.mp4` | `f9c749b3184787fbeaf3faef27762680c40fa3e6c1ec26cf5e7cc509c10ca2f8` |
| 1893263 | 케이팝 데몬 헌터스 | `kpop-demon-hunters_watchmatch_30s_sites.mp4` | `342c8ca1945b7699dd0da2f121c2f02147f9b9ddbe08f052dffc96da4c99438c` |

The canonical generated artifacts remain under the local `2_작품\output`
tree. The smaller Sites playback copies are deployment artifacts and are also
excluded from Git. Caption tracks and the mapping manifest remain versioned.
