import init, {
  InitOutput,
  initSync,
  Processor,
} from "audio-speed-changer-backend";

import { SpeedChangeEvent } from "./SpeedChangeEvent";

class SpeedChangeProcessor extends AudioWorkletProcessor {
  processor: Processor;

  constructor(options: any) {
    super();
    this.port.onmessage = async (msg) => {
      this.onmessage(msg);
    };
    let [module] = options.processorOptions;
    let res = initSync({ module });
    this.processor = Processor.new(1.0);
  }

  async onmessage(msg: MessageEvent) {}

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
        this.processor.process(input[channelNum], output[channelNum]);
        console.log(output[channelNum]);
      }
    }

    return true;
  }
}

registerProcessor("SpeedChangeProcessor", SpeedChangeProcessor);
