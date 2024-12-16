import SpeedChangeNode from "./SpeedChangeNode";
import { initSync } from "audio-speed-changer-backend";
import mod from "audio-speed-changer-backend/audio_speed_changer_backend_bg.wasm";
import toWav from "audiobuffer-to-wav";
import { SpeedChangeEvent } from "./SpeedChangeEvent";

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
  let shift = 1.0;
  let lengthMult = 1.0;
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
          await ctx.audioWorklet.addModule(
            new URL("./SpeedChangeProcessor.ts", import.meta.url),
          );
        } catch (e) {
          throw new Error(
            `Failed to load audio analyzer worklet: ${e.message}`,
          );
        }

        let options = AudioWorkletNode;

        let mod = await WebAssembly.compileStreaming(
          fetch(
            new URL(
              "../backend/pkg/audio_speed_changer_backend_bg.wasm",
              import.meta.url,
            ),
          ),
        );

        /* const node = new SpeedChangeNode(offlineCtx, "SpeedChangeProcessor", {
          processorOptions: [mod],
        });
        node.init();

        soundSource.connect(node).connect(offlineCtx.destination);

        soundSource.start();
        let resultBuffer = await offlineCtx.startRendering(); */

        soundSource.connect(offlineCtx.destination);

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
        const node = new SpeedChangeNode(ctx, "SpeedChangeProcessor", {
          processorOptions: [mod],
        });
        node.init();

        node.port.postMessage({
          type: SpeedChangeEvent.InitWASM,
          shift,
        });

        let src: AudioBufferSourceNode = null;

        let semitones = document.getElementById(
          "semitones",
        ) as HTMLInputElement;

        let semitonesDisplay = document.getElementById(
          "semitones-display",
        ) as HTMLSpanElement;

        semitones.addEventListener("change", (_) => {
          shift = 2 ** (semitones.valueAsNumber / 12);
          node.port.postMessage({
            type: SpeedChangeEvent.SetShift,
            shift: shift * lengthMult,
          });
          semitonesDisplay.textContent = semitones.value;
        });

        let length = document.getElementById("length") as HTMLInputElement;

        let lengthDisplay = document.getElementById(
          "length-display",
        ) as HTMLSpanElement;

        length.addEventListener("change", (_) => {
          lengthMult = length.valueAsNumber;
          node.port.postMessage({
            type: SpeedChangeEvent.SetShift,
            shift: shift * lengthMult,
          });
          lengthDisplay.textContent = length.value;
          if (src) src.playbackRate.value = 1 / length.valueAsNumber;
        });

        fileName.addEventListener("input", (ev) => {
          if (fileName.value == "") {
            a.download = "output.wav";
          } else {
            a.download = fileName.value;
          }
        });

        startButton.addEventListener("click", async () => {
          node.port.postMessage({ type: SpeedChangeEvent.Reset });
          ended = false;
          src = ctx.createBufferSource();
          let analyser = ctx.createAnalyser();
          analyser.fftSize = 32768;

          analyser.smoothingTimeConstant = 0;
          src.buffer = resultBuffer;
          src.connect(node).connect(analyser).connect(ctx.destination);
          startVisualize(analyser);
          src.playbackRate.value = 1 / length.valueAsNumber;

          src.start();
          src.onended = () => {
            ended = true;
            src.disconnect();
            node.disconnect();
            analyser.disconnect();
          };
        });
      });
  };
  reader.readAsArrayBuffer(audioFile);
}
