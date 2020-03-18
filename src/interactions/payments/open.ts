import Hopr from '../../'
import HoprCoreConnector, { Types } from '@validitylabs/hopr-core-connector-interface'

import pipe from 'it-pipe'

import { AbstractInteraction } from '../abstractInteraction'

import { PROTOCOL_PAYMENT_CHANNEL } from '../../constants'
import PeerInfo from 'peer-info'
import PeerId from 'peer-id'

class Opening<Chain extends HoprCoreConnector> implements AbstractInteraction<Chain> {
  protocols: string[] = [PROTOCOL_PAYMENT_CHANNEL]

  constructor(public node: Hopr<Chain>) {
    this.node.handle(this.protocols, this.handler.bind(this))
  }

  async handler(struct: { stream: any }) {
    pipe(
      /** prettier-ignore */
      struct.stream,
      this.node.paymentChannels.channel.handleOpeningRequest(this.node.paymentChannels),
      struct.stream
    )
  }

  async interact(counterparty: PeerInfo | PeerId, channelBalance: Types.ChannelBalance): Promise<Types.SignedChannel<Types.Channel, Types.Signature>> {
    let struct: {
      stream: any
      protocol: string
    }

    try {
      struct = await this.node.dialProtocol(counterparty, this.protocols[0]).catch(async (_: Error) => {
        return this.node.peerRouting
          .findPeer(PeerInfo.isPeerInfo(counterparty) ? counterparty.id : counterparty)
          .then((peerInfo: PeerInfo) => this.node.dialProtocol(peerInfo, this.protocols[0]))
      })
    } catch (err) {
      throw Error(
        `Tried to open a payment channel but could not connect to ${(PeerInfo.isPeerInfo(counterparty)
          ? counterparty.id
          : counterparty
        ).toB58String()}. Error was: ${err.message}`
      )
    }

    return await pipe(
      /* prettier-ignore */
      [(await this.node.paymentChannels.types.SignedChannel.create(this.node.paymentChannels, undefined, { channel: this.node.paymentChannels.types.Channel.createFunded(channelBalance) })).subarray()],
      struct.stream,
      this.collect.bind(this)
    )
  }

  private async collect(source: any) {
    let result: Uint8Array
    for await (const msg of source) {
      if (result != null) {
        continue
      } else {
        result = msg.slice()
      }
    }

    return this.node.paymentChannels.types.SignedChannel.create(this.node.paymentChannels, {
      bytes: result.buffer,
      offset: result.byteOffset
    })
  }
}

export { Opening }
