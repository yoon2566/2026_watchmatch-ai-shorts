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
    src: "/local-videos/swapped_watchmatch_30s.mp4",
    captionsSrc: "/local-videos/swapped_watchmatch_30s.ko.vtt",
    durationSeconds: 30.037,
    label: "Grok CLI 로컬 제작본",
  },
};

export function getLocalVideo(workId: number | null): LocalVideo | null {
  if (workId === null) return null;
  return LOCAL_VIDEOS[workId] ?? null;
}
