export type LocalVideo = {
  workId: number;
  title: string;
  src: string;
  captionsSrc: string;
  durationSeconds: number;
  label: string;
};

const LOCAL_VIDEOS: Readonly<Record<number, LocalVideo>> = {
  1901214: {
    workId: 1901214,
    title: "뒤바뀐 친구들의 신비한 모험",
    src: "/local-videos/swapped_watchmatch_30s_sites.mp4",
    captionsSrc: "/local-videos/swapped_watchmatch_30s.ko.vtt",
    durationSeconds: 30.037,
    label: "Grok Build CLI 제작본",
  },
  1357316: {
    workId: 1357316,
    title: "스파이더맨: 홈커밍",
    src: "/local-videos/spider-man-homecoming_watchmatch_30s_sites.mp4",
    captionsSrc: "/local-videos/spider-man-homecoming_watchmatch_30s.ko.vtt",
    durationSeconds: 30,
    label: "Grok Build CLI 제작본",
  },
  1357314: {
    workId: 1357314,
    title: "스파이더맨: 파 프롬 홈",
    src: "/local-videos/spider-man-far-from-home_watchmatch_30s_sites.mp4",
    captionsSrc: "/local-videos/spider-man-far-from-home_watchmatch_30s.ko.vtt",
    durationSeconds: 30,
    label: "Grok Build CLI 제작본",
  },
  1357317: {
    workId: 1357317,
    title: "스파이더맨: 뉴 유니버스",
    src: "/local-videos/spider-man-into-the-spider-verse_watchmatch_30s_sites.mp4",
    captionsSrc: "/local-videos/spider-man-into-the-spider-verse_watchmatch_30s.ko.vtt",
    durationSeconds: 30,
    label: "Grok Build CLI 제작본",
  },
  11014446: {
    workId: 11014446,
    title: "돈 세이 굿 럭",
    src: "/local-videos/dont-say-good-luck_watchmatch_30s_sites.mp4",
    captionsSrc: "/local-videos/dont-say-good-luck_watchmatch_30s.ko.vtt",
    durationSeconds: 30,
    label: "Grok Build CLI 제작본",
  },
  1972561: {
    workId: 1972561,
    title: "라카사",
    src: "/local-videos/la-casa_watchmatch_30s_sites.mp4",
    captionsSrc: "/local-videos/la-casa_watchmatch_30s.ko.vtt",
    durationSeconds: 30,
    label: "Grok Build CLI 제작본",
  },
  1893263: {
    workId: 1893263,
    title: "케이팝 데몬 헌터스",
    src: "/local-videos/kpop-demon-hunters_watchmatch_30s_sites.mp4",
    captionsSrc: "/local-videos/kpop-demon-hunters_watchmatch_30s.ko.vtt",
    durationSeconds: 30,
    label: "Grok Build CLI 제작본",
  },
};

export function getLocalVideo(workId: number | null): LocalVideo | null {
  if (workId === null) return null;
  return LOCAL_VIDEOS[workId] ?? null;
}
