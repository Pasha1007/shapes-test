export function polygonArea(points: readonly number[], length = points.length): number {
  if (length < 6) return 0;
  let sum = 0;
  let prevX = points[length - 2];
  let prevY = points[length - 1];
  for (let i = 0; i < length; i += 2) {
    const x = points[i];
    const y = points[i + 1];
    sum += prevX * y - x * prevY;
    prevX = x;
    prevY = y;
  }
  return Math.abs(sum) / 2;
}

export function pointInPolygon(points: readonly number[], x: number, y: number): boolean {
  const length = points.length;
  let inside = false;
  let prevX = points[length - 2];
  let prevY = points[length - 1];
  for (let i = 0; i < length; i += 2) {
    const curX = points[i];
    const curY = points[i + 1];
    if (curY > y !== prevY > y && x < ((prevX - curX) * (y - curY)) / (prevY - curY) + curX) {
      inside = !inside;
    }
    prevX = curX;
    prevY = curY;
  }
  return inside;
}

let bufferA: number[] = [];
let bufferB: number[] = [];

function clipAgainstLine(
  input: number[],
  length: number,
  output: number[],
  axis: 0 | 1,
  bound: number,
  keepGreater: boolean,
): number {
  if (length === 0) return 0;
  let count = 0;
  let prevX = input[length - 2];
  let prevY = input[length - 1];
  let prevValue = axis === 0 ? prevX : prevY;
  let prevInside = keepGreater ? prevValue >= bound : prevValue <= bound;

  for (let i = 0; i < length; i += 2) {
    const x = input[i];
    const y = input[i + 1];
    const value = axis === 0 ? x : y;
    const inside = keepGreater ? value >= bound : value <= bound;

    if (inside !== prevInside) {
      const t = (bound - prevValue) / (value - prevValue);
      output[count++] = axis === 0 ? bound : prevX + t * (x - prevX);
      output[count++] = axis === 0 ? prevY + t * (y - prevY) : bound;
    }
    if (inside) {
      output[count++] = x;
      output[count++] = y;
    }

    prevX = x;
    prevY = y;
    prevValue = value;
    prevInside = inside;
  }
  return count;
}

export function clippedPolygonArea(
  outline: readonly number[],
  scale: number,
  offsetX: number,
  offsetY: number,
  width: number,
  height: number,
): number {
  let length = outline.length;
  for (let i = 0; i < length; i += 2) {
    bufferA[i] = outline[i] * scale + offsetX;
    bufferA[i + 1] = outline[i + 1] * scale + offsetY;
  }

  length = clipAgainstLine(bufferA, length, bufferB, 0, 0, true);
  length = clipAgainstLine(bufferB, length, bufferA, 0, width, false);
  length = clipAgainstLine(bufferA, length, bufferB, 1, 0, true);
  length = clipAgainstLine(bufferB, length, bufferA, 1, height, false);

  return polygonArea(bufferA, length);
}

export function releaseClipBuffers(): void {
  bufferA = [];
  bufferB = [];
}
