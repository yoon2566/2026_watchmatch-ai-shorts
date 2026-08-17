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

The 2026-08-17 batch adds sixteen Sites playback copies. Their canonical sources
remain under `2_작품\output\movie_grok_batch\run-20260817-144300`.

| Watchmode ID | Work | Sites playback file | SHA-256 |
|---:|---|---|---|
| 1357316 | 스파이더맨: 홈커밍 | `spider-man-homecoming_watchmatch_30s_sites.mp4` | `8096ced1d5f9116037e8f54e18d7d9e2218b56f043d887d33a02f3d766bb9df2` |
| 1357314 | 스파이더맨: 파 프롬 홈 | `spider-man-far-from-home_watchmatch_30s_sites.mp4` | `33733f02c67a83da728d66f83306280eb5d3e32c40ccc7a905dab95fb104358c` |
| 1357317 | 스파이더맨: 뉴 유니버스 | `spider-man-into-the-spider-verse_watchmatch_30s_sites.mp4` | `147c573ab571655429f6fe9a57dfeb19367b4c4038930e43101314af221ccfff` |
| 11014446 | 돈 세이 굿 럭 | `dont-say-good-luck_watchmatch_30s_sites.mp4` | `cb8062fb08d9f0a2ed91caab1a649af40468b167b20ef21c915c88d7b90a0b80` |
| 1972561 | 라카사 | `la-casa_watchmatch_30s_sites.mp4` | `f9c749b3184787fbeaf3faef27762680c40fa3e6c1ec26cf5e7cc509c10ca2f8` |
| 1893263 | 케이팝 데몬 헌터스 | `kpop-demon-hunters_watchmatch_30s_sites.mp4` | `342c8ca1945b7699dd0da2f121c2f02147f9b9ddbe08f052dffc96da4c99438c` |
| 1418767 | 쇼생크 탈출 | `the-shawshank-redemption_watchmatch_30s_sites.mp4` | `16180bcb3e1c243fb6ef0064a9b678e788a3274ac139c63701e7eb3c6d8e8174` |
| 1132806 | 파이트 클럽 | `fight-club_watchmatch_30s_sites.mp4` | `57fe28a9cc1982b8f40da019d6d515858cff9e29a1935f161a498585cd66ee45` |
| 1810796 | 28년 후: 뼈의 사원 | `28-years-later-bone-temple_watchmatch_30s_sites.mp4` | `0ed5e0e77ab290d473c0836d0d3f169f1c72161a6fd5bef003a2c174842ed83f` |
| 1805677 | 워 머신: 전쟁 기계 | `war-machine_watchmatch_30s_sites.mp4` | `2ad0ab6eb5f2f022653b6384103e327eefd6613597c08aacc9e226040a89a0bd` |
| 1583724 | 음성메시지가 도착했습니다 | `voice-message-arrived_watchmatch_30s_sites.mp4` | `0ef40d79390298b34e06fb714f4b7ba4279e7d45d29c29bee8df5c6fb4872802` |
| 1468618 | 위키드 | `wicked_watchmatch_30s_sites.mp4` | `fb196fa8abdfef89bcb9e89370599cf706db524e2304a5f0ddb5320dd08d65f4` |
| 1824277 | 아노라 | `anora_watchmatch_30s_sites.mp4` | `7eda04664a63e0ff94494b9c75e4bb1ed36bbf5b137e2ede6aedd9fe8892e29d` |
| 1404363 | 반지의 제왕: 왕의 귀환 | `the-lord-of-the-rings-return-of-the-king_watchmatch_30s_sites.mp4` | `aa34d4fdfaa04a496657ad186aa0463d3b3a8b1a05709256b7b628e07d2b3bbf` |
| 1780773 | 28년 후 | `28-years-later_watchmatch_30s_sites.mp4` | `a564b4551f3c49d6c3821b012c74090e043b6c79ead18c8dbcf4d4d79836a1e0` |
| 1700166 | 프랑켄슈타인 | `frankenstein_watchmatch_30s_sites.mp4` | `5b3e3625459a90a439ea6886b527de8d557ccaf09f4889e721726f6816d8ae3b` |

The canonical generated artifacts remain under the local `2_작품\output`
tree. The smaller Sites playback copies are deployment artifacts and are also
excluded from Git. Caption tracks and the mapping manifest remain versioned.
