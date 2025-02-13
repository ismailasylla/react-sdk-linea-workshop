import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

import { ETHTickets__factory } from 'blockchain'
import { config, isSupportedNetwork } from '../../lib/config'
import { useMetaMask } from '../../hooks/useMetaMask'
import styles from './TicketsOwned.module.css'

import * as contractAbi from '~/lib/contract-abis/ETHTickets.json'

type NftData = {
  name: string,
  description: string,
  attributes: { trait_type: string, value: string }[],
  owner: string,
  image: string
}

type TicketFormatted = {
  tokenId: string,
  svgImage: string,
  ticketType: { trait_type: string, value: string }
}

const networkId = import.meta.env.VITE_PUBLIC_NETWORK_ID

const TicketsOwned = () => {
  const [ticketCollection, setTicketCollection] = useState<TicketFormatted[]>([])
  const { wallet, sdkConnected, mints } = useMetaMask()

  console.log(window.ethereum)

  const addNft = async (tokenId: string) => {

    console.log(`tokenId: `, tokenId)
    console.log(`networkId: `, Number(networkId))
    console.log(`address: `, contractAbi.networks[Number(networkId)].address)

    try {
      await window.ethereum?.request({
        method: 'wallet_watchAsset',
        params: {
          type: "ERC721",
          options: {
            address: contractAbi.networks[Number(networkId)].address,
            tokenId: tokenId
          }
        }
      })
    } catch (err: any) {
      console.error(err.message)
    }
  }

  const listOfTickets = ticketCollection.map((ticket) => (
    <div className={styles.svgItem} key={`ticket${ticket.tokenId}`}>
      <img
        width={200}
        height={200}
        src={ticket.svgImage}
        alt={`Ticket# ${ticket.tokenId}`}
      />
      <div>
        <button id={ticket.tokenId} onClick={() => addNft(ticket.tokenId)}>AddNFT</button>
      </div>
    </div>
  ))

  useEffect(() => {
    console.log('ticketsOwned: UseEffect')
    if (typeof window !== 'undefined' && wallet.address !== null && window.ethereum) {

      const provider = new ethers.providers.Web3Provider(
        window.ethereum as unknown as ethers.providers.ExternalProvider,
      )
      const signer = provider.getSigner()
      const factory = new ETHTickets__factory(signer)

      if (!isSupportedNetwork(wallet.chainId)) {
        return
      }

      const nftTickets = factory.attach(config[wallet.chainId].contractAddress)
      const ticketsRetrieved: TicketFormatted[] = []

      nftTickets.walletOfOwner(wallet.address)
        .then((ownedTickets) => {
          const promises = ownedTickets.map(async (token) => {
            const currentTokenId = token.toString()
            const currentTicket = await nftTickets.tokenURI(currentTokenId)

            const base64ToString = window.atob(
              currentTicket.replace('data:application/json;base64,', ''),
            )
            const nftData: NftData = JSON.parse(base64ToString)

            ticketsRetrieved.push({
              tokenId: currentTokenId,
              svgImage: nftData.image,
              ticketType: nftData.attributes.find(
                (ticket) => ticket.trait_type === 'Ticket Type',
              ),
            } as TicketFormatted)
          })
          Promise.all(promises).then(() => setTicketCollection(ticketsRetrieved))
        })
    }
  }, [wallet.address, mints, wallet.chainId, sdkConnected])

  return (
    <div className={styles.ticketsOwnedView}>
      <div className={styles.ticketGrid}>{listOfTickets}</div>
    </div>
  )
}

export default TicketsOwned