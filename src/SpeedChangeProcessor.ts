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
  }

  async onmessage(msg: MessageEvent) {
    if (msg.data.type == SpeedChangeEvent.InitWASM) {
      this.processor = Processor.new(msg.data.shift);
    } else if (msg.data.type == SpeedChangeEvent.SetShift) {
      this.processor.change_shift(msg.data.shift);
    } else if (msg.data.type == SpeedChangeEvent.Reset) {
      this.processor.reset();
    }
  }

  process(
    inputList: Float32Array[][],
    outputList: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean {
    if (inputList.length < 1 || inputList[0].length < 1) return true;
    console.log(this.processor.process(inputList[0][0], outputList[0][0]));
    console.log(inputList[0][0]);
    console.log(outputList[0][0]);

    return true;
  }
}

registerProcessor("SpeedChangeProcessor", SpeedChangeProcessor);
