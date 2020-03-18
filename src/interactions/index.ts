import Hopr from '..'
import { PaymentInteractions } from './payments'
import { NetworkInteractions } from './network'
import { PacketInteractions } from './packet'

import HoprCoreConnector from '@validitylabs/hopr-core-connector-interface'

export { Duplex, Sink, Source } from './abstractInteraction'

class Interactions<Chain extends HoprCoreConnector> {
  public payments: PaymentInteractions<Chain>
  public network: NetworkInteractions<Chain>
  public packet: PacketInteractions<Chain>

  constructor(node: Hopr<Chain>) {
    this.payments = new PaymentInteractions(node)
    this.network = new NetworkInteractions(node)
    this.packet = new PacketInteractions(node)
  }
}

export { Interactions }
