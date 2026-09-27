"use strict";

let gl;
let program;
let bufferId;
let colorLoc;
let vertices = []; // [x0, y0, x1, y1, ...] 형태의 평평한 숫자 배열
let vertexCount = 0;
let depth = 0;
let color = [0, 0, 0, 1]; 

// 페이지의 요소가 준비된 뒤 init을 실행.
window.addEventListener("load", init);

function init() {
  const canvas = document.getElementById("gl-canvas");
  gl = canvas.getContext("webgl"); 

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1, 1, 1, 1); // 구멍에는 흰색 배경

  program = createProgram();
  gl.useProgram(program);

  // GPU에 좌표를 보관할 버퍼를 한 번 만들고 이후에는 내용을 갱신.
  bufferId = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);

  // 버퍼의 숫자를 2개씩 읽어 vPosition의 x, y로 사용하도록 연결.
  const positionLoc = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLoc);

  // 단편 셰이더의 uColor에 값을 전달할 때 사용할 위치.
  colorLoc = gl.getUniformLocation(program, "uColor");

  const depthInput = document.getElementById("depth");
  const colorInput = document.getElementById("color");
  depth = Number(depthInput.value); // HTML 입력값은 문자열이므로 숫자로 바꾸기.
  color = hexToRGBA(colorInput.value);

  // 분할 횟수가 바뀌면 좌표도 달라지므로 좌표 생성과 GPU 전송.
  depthInput.addEventListener("input", function (event) {
    depth = Number(event.target.value);
    rebuildGeometry();
    render();
  });

  // 색상만 바뀔 때는 좌표를 재생성하지 않고 uniform만 바꿔 다시 그라가.
  colorInput.addEventListener("input", function (event) {
    color = hexToRGBA(event.target.value);
    render();
  });

  rebuildGeometry();
  render();
}

// 셰이더를 GPU에서 사용할 수 있는 형태로 컴파일.
function compileShader(id, type) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, document.getElementById(id).textContent);
  gl.compileShader(shader);
  return shader;
}

// 두 셰이더를 하나의 프로그램으로 연결.

function createProgram() {
  const vertexShader = compileShader("vertex-shader", gl.VERTEX_SHADER);
  const fragmentShader = compileShader("fragment-shader", gl.FRAGMENT_SHADER);
  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  return shaderProgram;
}

// 정사각형을 두 삼각형으로 나타낸다. x, y는 왼쪽 아래 좌표.
function addSquare(x, y, size) {
  const right = x + size;
  const top = y + size;
  vertices.push(
    x, y,       right, y,   right, top, // 삼각형 1: 왼쪽 아래, 오른쪽 아래, 오른쪽 위
    x, y,       right, top, x, top      // 삼각형 2: 왼쪽 아래, 오른쪽 위, 왼쪽 위
  );
}

// 이 함수가 프랙탈 알고리즘.
function divideSquare(x, y, size, remaining) {
  // 종료 조건: 더 이상 나누지 않으면 현재 정사각형의 정점을 추가
  if (remaining === 0) {
    addSquare(x, y, size);
    return;
  }

  const nextSize = size / 3;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      // 가운데 칸을 건너뛰어 구멍을 만들기.
      if (row === 1 && col === 1) continue;
      // 자식 정사각형으로 갈 때 남은 분할 횟수를 딱 한 번 줄이기.
      divideSquare(x + col * nextSize, y + row * nextSize, nextSize, remaining - 1);
    }
  }
}

function rebuildGeometry() {
  vertices = []; // 이전 도형이 누적되지 않도록 반드시 비우기.
  // w=1인 셰이더를 사용하므로 화면의 x, y 범위는 -1~1.
  // 약간의 여백을 위해 -0.9에서 0.9까지의 정사각형으로 시작.
  divideSquare(-0.9, -0.9, 1.8, depth);
  vertexCount = vertices.length / 2; 

  gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  document.getElementById("depth-value").textContent = String(depth);
  const squares = 8 ** depth;
  document.getElementById("status").textContent =
    "분할 " + depth + "회 | 정사각형 " + squares.toLocaleString("ko-KR") +
    "개 | 삼각형 " + (2 * squares).toLocaleString("ko-KR") +
    "개 | 정점 " + vertexCount.toLocaleString("ko-KR") + "개";
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  // uniform4f에는 위치 다음에 R, G, B, A 숫자를 각각 전달.
  gl.uniform4f(colorLoc, color[0], color[1], color[2], color[3]);
  gl.drawArrays(gl.TRIANGLES, 0, vertexCount); // 정점 3개씩 하나의 삼각형으로 그리기.
}

// HTML 색상 바꾸기.
function hexToRGBA(hex) {
  const red = parseInt(hex.slice(1, 3), 16) / 255;
  const green = parseInt(hex.slice(3, 5), 16) / 255;
  const blue = parseInt(hex.slice(5, 7), 16) / 255;
  return [red, green, blue, 1];
}
