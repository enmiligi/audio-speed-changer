export default class SpeedChangeNode extends AudioWorkletNode {
  onprocessorerror = function (err: Event) {
    console.error(
      `An error from AudioWorkletProcessor.process() occurred: ${err}`,
    );
  };

  onmessage = function (event: Event) {};
}
