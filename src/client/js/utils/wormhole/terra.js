import { LCDClient } from "@terra-money/terra.js";
import { TERRA_HOST } from "./consts";

export async function waitForTerraExecution(transaction) {
  const lcd = new LCDClient(TERRA_HOST);
  let info;
  while (!info) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      info = await lcd.tx.txInfo(transaction.result.txhash);
    } catch (e) {
      console.error(e);
    }
  }
  return info;
}
