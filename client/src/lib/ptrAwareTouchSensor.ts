import { TouchSensor } from "@dnd-kit/core";
import { isPTRTracking } from "./ptrState";

// PTR(Pull-to-Refresh)이 활성화된 상태에서는 dnd-kit TouchSensor가 드래그를 시작하지 않도록 차단
class PTRAwareTouchSensor extends TouchSensor {
  static activators = TouchSensor.activators.map((activator) => ({
    ...activator,
    handler: (
      event: Parameters<typeof activator.handler>[0],
      options: Parameters<typeof activator.handler>[1]
    ) => {
      // PTR 추적 중이면 dnd-kit 드래그 활성화 차단
      if (isPTRTracking()) return false;
      return activator.handler(event, options);
    },
  }));
}

export { PTRAwareTouchSensor };
