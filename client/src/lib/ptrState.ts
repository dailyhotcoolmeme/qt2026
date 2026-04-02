// PTR 추적 상태를 모듈 레벨에서 공유 (React 상태와 독립적)
let _isPTRTracking = false;

export function setPTRTracking(v: boolean) {
  _isPTRTracking = v;
}

export function isPTRTracking() {
  return _isPTRTracking;
}
