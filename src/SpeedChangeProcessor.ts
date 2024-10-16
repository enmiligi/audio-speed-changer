class SpeedChangeProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = this.onmessage;
  }

  onmessage(msg: MessageEvent) {}

  process(
    inputList: Float32Array[][],
    outputList: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean {
    const sourceLimit = Math.min(inputList.length, outputList.length);

    for (let inputNum = 0; inputNum < sourceLimit; inputNum++) {
      const input = inputList[inputNum];
      const output = outputList[inputNum];
      const channelCount = Math.min(input.length, output.length);

      for (let channelNum = 0; channelNum < channelCount; channelNum++) {
        input[channelNum].forEach((sample, i) => {
          // Manipulate the sample
          output[channelNum][i] = sample;
        });
      }
    }

    return true;
  }
}

registerProcessor("SpeedChangeProcessor", SpeedChangeProcessor);
