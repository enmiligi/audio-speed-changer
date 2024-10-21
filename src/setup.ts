import SpeedChangeNode from "./SpeedChangeNode";

import toWav from "audiobuffer-to-wav";

let loading = document.getElementById("loading") as HTMLDivElement;
let ui = document.getElementById("ui") as HTMLDivElement;
let fileName = document.getElementById("file-name") as HTMLInputElement;

let downloadButton = document.getElementById("download") as HTMLButtonElement;
let startButton = document.getElementById(
  "audio-start-button",
) as HTMLButtonElement;

let canvas = document.getElementById("audio-canvas") as HTMLCanvasElement;
let canvasCtx = canvas.getContext("2d");

let ended = false;

function startVisualize(analyser: AnalyserNode) {
  const CANVAS_WIDTH = (canvas.width = window.innerWidth);
  const CANVAS_HEIGHT = (canvas.height = CANVAS_WIDTH / 3);
  const timeDomainArray = new Float32Array(analyser.fftSize);
  const frequencyArray = new Float32Array(analyser.frequencyBinCount);

  canvasCtx.lineWidth = (CANVAS_WIDTH / analyser.fftSize) * 0.6;

  function draw() {
    canvasCtx.fillStyle = "white";
    canvasCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    analyser.getFloatTimeDomainData(timeDomainArray);
    analyser.getFloatFrequencyData(frequencyArray);

    canvasCtx.strokeStyle = "black";
    canvasCtx.beginPath();
    for (let i = 0; i < analyser.fftSize; i++) {
      canvasCtx.moveTo(
        i * (CANVAS_WIDTH / analyser.fftSize),
        CANVAS_HEIGHT / 2,
      );
      canvasCtx.lineTo(
        i * (CANVAS_WIDTH / analyser.fftSize),
        CANVAS_HEIGHT / 2 - (timeDomainArray[i] / 2) * CANVAS_HEIGHT,
      );
    }
    canvasCtx.stroke();

    for (let i = 0; i < analyser.frequencyBinCount; i++) {
      canvasCtx.fillStyle = "#ff300080";
      canvasCtx.fillRect(
        i * (CANVAS_WIDTH / analyser.frequencyBinCount),
        CANVAS_HEIGHT,
        CANVAS_WIDTH / analyser.frequencyBinCount,
        -(
          (frequencyArray[i] - analyser.minDecibels - 10) /
          (analyser.maxDecibels + 10 - analyser.minDecibels)
        ) * CANVAS_HEIGHT,
      );
    }

    if (!ended) requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

export async function setup(audioFile: File) {
  loading.hidden = false;
  ui.hidden = true;
  const ctx = new AudioContext();
  var reader = new FileReader();
  reader.onload = function (ev) {
    console.log(ev.target.result);
    ctx
      .decodeAudioData(ev.target.result as ArrayBuffer)
      .then(async function (buffer) {
        let offlineCtx = new OfflineAudioContext(
          buffer.numberOfChannels,
          buffer.length,
          buffer.sampleRate,
        );

        var soundSource = offlineCtx.createBufferSource();
        soundSource.buffer = buffer;

        try {
          await offlineCtx.audioWorklet.addModule(
            new URL("./SpeedChangeProcessor.ts", import.meta.url),
          );
        } catch (e) {
          throw new Error(
            `Failed to load audio analyzer worklet: ${e.message}`,
          );
        }

        const node = new SpeedChangeNode(offlineCtx, "SpeedChangeProcessor");

        soundSource.connect(node).connect(offlineCtx.destination);

        soundSource.start();
        let resultBuffer = await offlineCtx.startRendering();

        loading.hidden = true;
        ui.hidden = false;

        let wav = toWav(buffer) as ArrayBuffer;
        let blob = new Blob([wav], { type: "audio/wav" });
        let url = URL.createObjectURL(blob);

        let a = document.createElement("a") as HTMLAnchorElement;
        a.href = url;
        a.download = "output.wav";
        downloadButton.addEventListener("click", () => {
          a.click();
        });

        fileName.addEventListener("input", (ev) => {
          if (fileName.value == "") {
            a.download = "output.wav";
          } else {
            a.download = fileName.value;
          }
        });

        startButton.addEventListener("click", async () => {
          ended = false;
          let src = ctx.createBufferSource();
          let analyser = ctx.createAnalyser();
          analyser.fftSize = 32768;

          analyser.smoothingTimeConstant = 0;
          src.buffer = resultBuffer;
          src.connect(analyser).connect(ctx.destination);
          startVisualize(analyser);
          src.start();
          src.onended = () => {
            ended = true;
          };
        });
      });
  };
  reader.readAsArrayBuffer(audioFile);
}
