import Hopr from '../../'
import HoprCoreConnector from '@validitylabs/hopr-core-connector-interface'

import pipe from 'it-pipe'
import chalk from 'chalk'

import { AbstractInteraction, Duplex } from '../abstractInteraction'

import { PROTOCOL_CRAWLING } from '../../constants'
import PeerInfo from 'peer-info'

import { CrawlResponse, CrawlStatus } from '../../messages'

class Crawler<Chain extends HoprCoreConnector> implements AbstractInteraction<Chain> {
  protocols: string[] = [PROTOCOL_CRAWLING]

  constructor(public node: Hopr<Chain>) {
    this.node.handle(this.protocols, this.handler.bind(this))
  }

  handler(struct: { stream: any }) {
    pipe(
      /* prettier-ignore */
      this.node.network.crawler.handleCrawlRequest(),
      struct.stream
    )
  }

  async interact(counterparty: PeerInfo): Promise<PeerInfo[]> {
    let struct: {
      stream: Duplex
      protocol: string
    }
    try {
      struct = await this.node.dialProtocol(counterparty, this.protocols[0]).catch(async (err: Error) => {
        return this.node.peerRouting.findPeer(counterparty.id).then((peerInfo: PeerInfo) => this.node.dialProtocol(peerInfo, this.protocols[0]))
      })
    } catch (err) {
      this.node.log(`Could not ask node ${counterparty.id.toB58String()} for other nodes. Error was: ${chalk.red(err.message)}.`)
      return []
    }

    return await pipe(
      /** prettier-ignore */
      struct.stream,
      collect
    )
  }
}

async function collect(source: AsyncIterable<Uint8Array>) {
  const peerInfos = []
  for await (const encodedResponse of source) {
    let decodedResponse: any
    try {
      decodedResponse = new CrawlResponse(encodedResponse.slice())
    } catch {
      continue
    }

    if (decodedResponse.status !== CrawlStatus.OK) {
      continue
    }

    peerInfos.push(...(await decodedResponse.peerInfos))
  }

  return peerInfos
}

export { Crawler }
